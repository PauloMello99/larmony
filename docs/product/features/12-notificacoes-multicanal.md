# 12 — Notificações multicanal + preferências (M11)

> **Proposta (2026-07-10)**: evolui o módulo `notifications` (hoje in-app +
> e-mail acoplado caso a caso) para um **dispatcher multicanal** com
> preferências por usuário. Decisão de provedor SMS/WhatsApp e da arquitetura
> de fan-out a formalizar em ADR no kickoff (reservar ADR-0022).

## Canais

| Canal | Configurável? | Provedor |
|---|---|---|
| In-app (sino no header) | **Não — sempre gravado** | tabela `notifications` (existente) |
| E-mail | Sim | Resend (módulo `mail`, ADR-0012) |
| SMS | Sim | a decidir no ADR (candidato: Twilio) |
| WhatsApp | Sim | a decidir no ADR (candidato: Twilio WhatsApp Business API) |

- O in-app é o **registro canônico**: toda notificação gerada existe lá,
  independentemente das preferências. Os demais canais são réplicas de entrega.
- SMS e WhatsApp exigem **telefone verificado** no Account (novo campo
  `users.phone` + fluxo de verificação por código). Sem telefone verificado, a
  preferência aparece desabilitada com CTA para verificar.
- SMS/WhatsApp nascem **gateados por feature flag/env** (mesmo padrão do
  e-mail, ADR-0009/0012) — custo por mensagem exige liberação controlada.

## Eventos notificáveis

| Evento | Origem | Gatilho |
|---|---|---|
| Lançamento automático efetuado | `scheduled-transactions-engine` (cron) | ao gerar a transação `auto` |
| Meta atingida | módulo `goals` | aporte que leva `savedCents ≥ targetCents` (dedup: 1× por meta) |
| Orçamento estourado | módulo `budgets`/`transactions` | escrita de transação que leva spending > limite vigente (dedup: 1× por budget×mês) |
| Relatório mensal | novo cron job `monthly-report` | último dia do mês (horário/timezone: ver `13-cron-horario-timezone.md`) |
| Lembrete de lançamento `manual` | `scheduled-transactions-reminders` | já existe (e-mail) — passa pelo dispatcher |

- Meta atingida e orçamento estourado são **event-driven** (avaliados na
  escrita, dentro do use-case que altera o dado), não por cron — latência
  imediata e sem varredura. Dedup persistido no contexto do evento (padrão
  `reminder_last_sent_at` já validado em bills).
- Orçamento estourado depende do modelo versionado do M10
  (`11-orcamentos-recorrentes.md`) para resolver o limite vigente.
- Relatório mensal: e-mail rico (React Email) com resumo do mês (reusa
  agregações do módulo `reports`); SMS/WhatsApp mandam resumo curto + link.

## Preferências

- Escopo **por usuário** (não por household): matriz `evento × canal` em
  `notification_preferences` (`user_id`, `event_type`, `channel`, `enabled`).
  Ausência de linha = default do evento (e-mail on, SMS/WhatsApp off).
- UI no Account: seção "Notificações" com a matriz (linhas = eventos, colunas =
  canais); coluna in-app exibida como fixa/sempre ativa.
- Eventos household-scoped notificam **todos os membros do lar**, cada um
  filtrado pelas próprias preferências (padrão já usado no lembrete de bills).

## Arquitetura (dispatcher)

- Um único ponto de entrada: `DispatchNotificationUseCase(evento, payload,
  destinatários)` no módulo `notifications`:
  1. grava a linha in-app (sempre);
  2. resolve preferências de cada destinatário;
  3. fan-out para os canais habilitados via **ports** —
     `IMailSender` (existe), `ISmsSender`, `IWhatsAppSender` (novos) —
     implementações em `infrastructure/`, injetadas por Symbol token
     (regra de domain-rules; use-cases nunca conhecem Resend/Twilio).
- Falha em um canal não bloqueia os demais (allSettled + telemetria).
- Chamadas vindas de cron escrevem via `DRIZZLE_ADMIN` (regra ADR-0019/0020);
  chamadas em request context usam `DRIZZLE` normal.
- Templates por canal e por locale (`users.locale`, pt-BR/en) — SMS/WhatsApp
  com corpo curto próprio, não reuso do HTML de e-mail.

## Regras

- Nenhum evento dispara duas vezes para o mesmo contexto (dedup persistido por
  evento — meta, budget×mês, entry×dia, report×mês).
- Preferência desativada **não** suprime o in-app.
- Opt-out global de um canal = desligar todas as linhas daquele canal na matriz
  (atalho na UI); compliance de SMS/WhatsApp (STOP/descadastro) tratada no ADR.

## Impactos cruzados

- `scheduled-transactions-reminders` migra do envio direto de e-mail para o
  dispatcher (comportamento default idêntico).
- Horário de entrega e timezone dos disparos por cron (relatório mensal,
  lembretes) são definidos em `13-cron-horario-timezone.md` (M12) — o
  dispatcher deste milestone não decide *quando*, só *o quê* e *por onde*.
