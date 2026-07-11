# ADR-0023 — Dispatcher multicanal de notificações + dedup por evento (M11)

**Status:** Aceito
**Data:** 2026-07-11

## Contexto

O módulo `notifications` só modelava o inbox in-app (tabela `notifications`,
sem canal/status); o e-mail estava acoplado inline dentro de um
`NotificationService.notify()` best-effort, e só um produtor real existia (o
lembrete de lançamentos). Os tipos `goal_reached`/`invite_accepted` do enum
nunca eram emitidos. O produto (spec `12-notificacoes-multicanal.md`) pede um
dispatcher multicanal com preferências por usuário e mais 4 eventos
notificáveis (meta atingida, orçamento estourado, lançamento automático,
relatório mensal).

## Decisão

1. **Único ponto de entrada**: `DispatchNotificationUseCase.execute({
   recipientUserIds, householdId?, type, title, body, data?, actionUrl?,
   actionLabel? })` substitui o antigo `NotificationService.notify()`. Por
   destinatário: grava a linha in-app (sempre, via `DRIZZLE_ADMIN`), resolve
   as preferências do usuário para aquele `type`, e faz fan-out por canal via
   `Promise.allSettled` — falha num canal não bloqueia os outros nem os
   demais destinatários.
2. **Ports por canal**: `IEmailSender`/`EMAIL_SENDER` (já existia, ADR-0012)
   passa a ser chamado pelo dispatcher em vez de inline. Novos
   `ISmsSender`/`SMS_SENDER` e `IWhatsAppSender`/`WHATSAPP_SENDER` com
   implementações **no-op stub** (`NoopSmsSender`/`NoopWhatsAppSender`):
   flag off → no-op silencioso; flag `NOTIFICATIONS_{SMS,WHATSAPP}_ENABLED=true`
   **sem** provedor integrado → lança (fail loud, nunca finge enviar). Sem SDK
   Twilio neste milestone — WhatsApp Business API exige aprovação de template
   pela Meta (2-4 semanas de onboarding), e não há campo `users.phone`/fluxo de
   verificação ainda. As colunas SMS/WhatsApp aparecem na UI (Account) sempre
   desabilitadas.
3. **`notification_preferences`**: matriz `(user_id, event_type, channel,
   enabled)`, unique `(user_id, event_type, channel)`. **Ausência de linha =
   default do evento** (e-mail on, sms/whatsapp off,
   `DEFAULT_CHANNEL_ENABLED`/`PREFERENCE_EVENT_TYPES` em
   `notification-events.ts`) — nunca backfillado, resolvido em runtime pelo
   `GetNotificationPreferencesUseCase`. In-app não entra na matriz porque é
   sempre gravado, nunca opcional. RLS member-scoped (`user_id = auth.uid()`).
4. **`notification_dedup` como tabela dedicada, não coluna em goals/budgets**:
   `(household_id, event_type, context_id, period_key)`, unique nas 3 últimas
   colunas. Dedup é **household-scoped, nunca por usuário** — o fan-out por
   destinatário é ortogonal e resolvido pelo dispatcher, não pelo dedup.
   Reivindicado via `INSERT ... ON CONFLICT DO NOTHING RETURNING id`
   (`rows.length > 0` = reivindicado com sucesso) **antes** do dispatch —
   mesmo princípio do `reminder_last_sent_at`. `context_id` não é FK física
   (contextos heterogêneos: goal id, budget series id, household id para o
   relatório). Sem RLS/GRANT nesta tabela — sempre `DRIZZLE_ADMIN` (mesmo
   motivo do `notifications`: só cron/use-cases tocam nela, nunca o cliente
   direto).
5. **Eventos event-driven avaliados no seam de escrita, não por varredura**:
   `goal_reached` (após `AddGoalContributionUseCase`, dedup `"once"`),
   `budget_exceeded` (após qualquer escrita de transação de despesa — cobre
   `CreateTransactionUseCase`, `CreateInstallmentTransactionUseCase` e
   `CreateGeneratedTransactionUseCase`, dedup `"YYYY-MM"` por budget×mês,
   resolve o limite vigente via `budget_versions`/M10). `auto_launch` dispara
   a cada ocorrência do engine de geração automática, **sem** marcador de
   dedup — idempotência é estrutural (o cursor avança antes do insert; 1
   ocorrência = 1 insert = 1 notificação). `monthly_report` é o único por cron
   dedicado (`monthly-report`, descoberto automaticamente pelo
   `CronJobName`/`DiscoveryService` do `internal-cron`, ADR-0019): roda no
   último dia do mês (baseline UTC/relógio do processo — M12 troca por
   timezone do household sem tocar o job, mesmo padrão do `currentPeriodStart`),
   dedup por household×mês.
6. **Gotcha crítico descoberto em e2e (corrigido antes do merge): conexão de
   leitura do check event-driven precisa casar com o contexto do chamador.**
   Toda escrita de transação roda dentro de uma transação Postgres ABERTA na
   conexão `DRIZZLE` do request (a `RlsInterceptor` só dá `COMMIT` ao fim do
   request/`RlsContext.runWithClaims`). Ler o mesmo dado recém-gravado por uma
   conexão **diferente** (`DRIZZLE_ADMIN`) não a vê — ela não está commitada.
   `NotifyIfBudgetExceededUseCase` por isso tem **duas variantes** do mesmo
   método no repositório: `findBudgetForCategoryPeriod` (via `DRIZZLE`, usada
   por `CreateTransactionUseCase`/`CreateInstallmentTransactionUseCase`, os
   dois chamadores request-scoped) e `findBudgetForCategoryPeriodAdmin` (via
   `DRIZZLE_ADMIN`, usada só por `CreateGeneratedTransactionUseCase`/engine,
   que roda fora de request context — sem essa conexão a query não veria
   nada, RLS bloqueia sem claims). Um `viaAdmin?: boolean` no input do
   use-case escolhe a variante. **Regra geral daqui pra frente**: um check
   "leio o que acabei de escrever, dentro do mesmo use-case" deve usar a MESMA
   conexão da escrita que o originou; só uma leitura verdadeiramente
   cross-context (cron lendo dados antigos, não a escrita corrente) usa
   `DRIZZLE_ADMIN`. `goal_reached` não teve esse bug porque
   `AddGoalContributionUseCase` sempre lê via `this.db` (só existe em request
   context).

## Consequências

- `NotificationService`/`notification.service.ts` foi deletado —
  `send-scheduled-entry-reminders.use-case.ts` (lembrete de lançamentos)
  migrou para o dispatcher sem mudar o comportamento default (in-app + e-mail).
- `UserContact` ganhou `phone: string | null` (sempre `null` hoje — sem UI de
  edição/verificação de telefone no M11) para os sends de SMS/WhatsApp
  fazerem no-op explícito quando não há telefone, em vez de placeholder.
- Frontend: `NotificationsSection` no Account (matriz evento×canal via
  `Table`+`Switch`, hook `use-notification-preferences`, `GET`/`PUT
  /me/notification-preferences`); SMS/WhatsApp com `Tooltip` "ainda não
  disponível nesta versão".
- Helper `findHouseholdMemberUserIds(db, householdId)` extraído para
  `common/household/` (existia duplicado só em `scheduled-transactions`) —
  cada módulo (`goals`, `budgets`, `reports`, `scheduled-transactions`) expõe
  seu próprio método de repositório que delega para ele, respeitando a regra
  de use-cases nunca importarem `DRIZZLE` direto.
- Migration 0007: 3 `ALTER TYPE ... ADD VALUE` (uma por statement — Postgres
  exige), `notification_channel` enum, `notification_preferences` (RLS) e
  `notification_dedup` (sem RLS). Enum values são irreversíveis no Postgres —
  o `.down.sql` documenta isso em vez de tentar reverter.

## Fora de escopo (decidido)

- Integração real Twilio (SMS) e WhatsApp Business API — ports ficam no-op
  atrás de flag até um provedor real ser integrado.
- Campo `users.phone` + fluxo de verificação — dependem de um provedor SMS
  ativo (paradoxo ovo-galinha); SMS/WhatsApp na UI ficam sempre desabilitados.
- Timezone dos disparos por cron — M12 (`13-cron-horario-timezone.md`);
  `monthly-report` roda em baseline UTC até lá.
- Coluna de canal/status de entrega em `notifications` — entrega best-effort,
  sem tracking por linha no v1.
