# ADR-0026 — Billing (Stripe) + Entitlements + Comp/Desconto administrativo (M14)

**Status:** Aceito
**Data:** 2026-07-12

## Contexto

O produto está funcionalmente completo (M1–M12, v1.1) e staging está verde,
mas **billing é apenas um shell**: existe a tabela `subscriptions`
(`apps/backend/src/database/schema/subscriptions.ts`), mas zero módulo NestJS,
telas placeholder ("Em breve") e a landing anuncia todos os planos como
grátis. Sem billing não há receita — é o bloqueador nº 1 do lançamento
comercial (discovery em `docs/product/precificacao-e-viabilidade.md`, decisão
de espera do Open Finance em ADR-0025).

Este ADR define o contrato técnico do módulo de billing **antes** de qualquer
código (checkpoint C1 do plano de coordenação do ciclo de lançamento) — é o
contrato central que libera backend e frontend em paralelo.

**Requisito adicional definido pelo responsável, não presente em nenhuma
spec anterior**: o super-admin da plataforma precisa poder conceder **desconto
parcial** ou **isenção total (comp)** por lar, **inteiramente pelo dashboard
admin do Larmony — nunca abrindo o dashboard do Stripe**. Isso significa que o
próprio backend deve chamar a API do Stripe em nome do operador quando o caso
envolver desconto (a régua de cobrança continua sendo o Stripe); a isenção,
por não envolver cobrança nenhuma, é resolvida inteiramente em banco local.

## Decisão

1. **Estender a tabela `subscriptions` existente, não substituí-la.** O shell
   já modela 1 assinatura por household (`householdId` unique), os enums
   `subscription_type` (`free|trial|standard|custom`) e `subscription_status`
   (`active|trialing|past_due|canceled`) já cobrem o essencial — **`custom` já
   existe e é o valor usado para isenção/comp**, sem precisar de migração de
   enum. A RLS já está correta para o requisito de "gerenciado só pela
   plataforma": `subscriptions_insert/update/delete` já exigem
   `is_super_admin()` (`0001_rls_policies.sql:171-178`); nenhuma policy nova é
   necessária, só colunas novas (migration `0009`, aditiva):
   - `stripePriceId` (text, nullable).
   - `stripeCouponId` (text, nullable) — coupon Stripe ativo, se houver desconto.
   - `discountPercent` (smallint, nullable) — cache local só para exibição
     admin; fonte de verdade do valor cobrado continua sendo o Stripe,
     atualizado via webhook `customer.subscription.updated`.
   - `compReason` (text, nullable), `compGrantedBy` (uuid, nullable → `users.id`),
     `compExpiresAt` (timestamp, nullable — `NULL` = para sempre).

2. **Isenção (comp) é 100% local e nunca toca o Stripe.** Ao conceder:
   `type='custom'`, `status='active'`, `priceCents=0`; se já existir uma
   Stripe subscription ativa, ela é **cancelada via API** no momento da
   concessão (nunca cobrar em paralelo a um comp) — `stripeCustomerId` é
   preservado (permite reverter sem perder o vínculo). Ao revogar, o household
   volta para `free` e precisa refazer checkout — nenhum dado do lar é
   apagado (downgrade nunca apaga dados, é antipadrão já proibido no projeto).

3. **Desconto parcial sempre passa pela API do Stripe**, porque o valor
   efetivamente cobrado tem que continuar sendo resolvido pelo Stripe (é quem
   emite fatura e cobra o cartão). O backend cria/reusa um **Coupon** via API
   do Stripe (`percent_off` OU `amount_off`, `duration: once|repeating|forever`)
   e o anexa à subscription via API — o operador nunca precisa logar no
   Stripe. `stripeCouponId`/`discountPercent` locais são cache de exibição.

4. **Nova tabela `stripe_webhook_events`** para idempotência: PK = `event.id`
   do Stripe (`evt_...`) — a própria PK garante "insere-uma-vez"; conflito de
   inserção = evento já processado, responde 200 sem reprocessar. Colunas:
   `type`, `receivedAt`, `processedAt` (nullable — `NULL` = falhou/pendente).
   **Decisão deliberada de não persistir o payload completo** (nem em jsonb):
   por minimização de dado sensível de pagamento, um reprocessamento busca o
   evento fresco na API do Stripe pelo `id` (a retenção do Stripe cobre isso).
   RLS habilitado, sem policy alguma — só `DRIZZLE_ADMIN` toca essa tabela
   (mesmo padrão de tabelas invisíveis ao cliente já usado por `notification_dedup`).

5. **API REST** (contrato entre backend e frontend, e o gatilho dos webhooks):

   | Rota | Guard | Descrição |
   |---|---|---|
   | `GET /households/:id/subscription` | `HouseholdMembershipGuard` | Estado resolvido: plano, status, entitlements, origem (`stripe`\|`comp`\|`free`) |
   | `POST /households/:id/subscription/checkout` | `HouseholdOwnerGuard` | Cria Stripe Checkout Session (aplica coupon se o admin já tiver setado desconto); retorna `url` |
   | `POST /households/:id/subscription/portal` | `HouseholdOwnerGuard` | Stripe Billing Portal session; retorna `url` |
   | `POST /webhooks/stripe` | `StripeWebhookGuard` (novo — verifica `Stripe-Signature`, sem `AuthGuard`) + `@SkipThrottle()` | Idempotente via `stripe_webhook_events`; escreve via `DRIZZLE_ADMIN` |
   | `POST /admin/households/:id/subscription/comp` | `PlatformAdminGuard` (existente) | Concede isenção: `{ reason, expiresAt? }`; cancela Stripe sub se houver; audita |
   | `DELETE /admin/households/:id/subscription/comp` | `PlatformAdminGuard` | Revoga isenção → `free`; audita |
   | `POST /admin/households/:id/subscription/discount` | `PlatformAdminGuard` | Cria/anexa coupon: `{ percent? , amountCents?, durationMonths? }` (um de `percent`/`amountCents`); audita |
   | `DELETE /admin/households/:id/subscription/discount` | `PlatformAdminGuard` | Remove coupon da subscription no Stripe + limpa cache local; audita |

   Nenhum guard novo é necessário para os endpoints admin — `PlatformAdminGuard`
   e `HouseholdOwnerGuard` já existem e já tratam o miss-path de super_admin
   (ADR-0013). MVP usa **Stripe Checkout + Billing Portal hospedados** (não
   Stripe Elements) — zero superfície de PCI no frontend, sem necessidade de
   publishable key nesta fase.

6. **Auditoria via `AuditService.logByAuthId` existente** — `auditActionEnum`
   já tem o valor `subscription_changed` (`enums.ts`), pronto para uso; nenhuma
   migração de enum necessária. Todo endpoint admin (comp e desconto) grava
   `metadata` estruturado (`{ operation, reason?, percent?, amountCents? }`),
   seguindo o precedente de `set-household-suspended.use-case.ts`.

7. **`EntitlementsService`** — novo serviço dentro do módulo `subscriptions`,
   exportado como classe concreta (mesmo padrão de bridge cross-módulo já
   usado por `DispatchNotificationUseCase`/ADR-0023: módulo provedor exporta,
   módulo consumidor injeta direto, sem token):
   ```ts
   EntitlementsService.resolve(householdId): {
     plan: "free" | "premium" | "custom",
     status: SubscriptionStatus,
     source: "stripe" | "comp" | "free",
     capabilities: Record<string, boolean>,
   }
   ```
   Este ADR define o **mecanismo**; a lista final de capabilities do plano
   Free (o que fica limitado) é decisão de produto em aberto (D-1 do plano de
   coordenação) e não trava a implementação do mecanismo em si.

8. **Reconciliação periódica** — novo job no registry de cron existente
   (`@CronJobName`, mesmo padrão de `scheduled-transactions-engine`):
   `billing-reconciliation` compara o estado local com o Stripe para as linhas
   com `stripeSubscriptionId` preenchido e aplica `past_due → canceled` após o
   `gracePeriodDays` vigente. Implementação detalhada é tarefa própria (B-3),
   fora do escopo deste ADR.

9. **Quem paga / transferência de ownership** — `stripeCustomerId` é vinculado
   ao **household**, não a um usuário específico; transferência de ownership
   não quebra o billing. Só o membro com `role='owner'` (via
   `household_memberships`) pode acionar checkout/portal (`HouseholdOwnerGuard`).

10. **Env vars novas**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` em
    `apps/backend/.env.example` e `turbo.json` `globalEnv`.

## Máquina de estados

```
free (default, sem Stripe) ──checkout──► trialing ──► active ──► past_due (grace 14d) ──► canceled
                                                          │
                                                          └──(admin)──► custom (comp, bypassa Stripe)
```

## Consequências

- Nenhuma policy RLS nova em `subscriptions` — só colunas aditivas.
- `stripe_webhook_events` é a primeira tabela do projeto sem nenhuma policy de
  acesso a cliente (só `DRIZZLE_ADMIN`) — precedente que outras integrações
  futuras (Open Finance, M13) podem seguir para eventos de webhook externos.
- O endpoint de webhook é o primeiro do projeto a precisar de
  `@SkipThrottle()` explícito (o `ThrottlerGuard` global de 120 req/min
  aplicaria por padrão e bloquearia picos de retry do Stripe).
- `EntitlementsService` se torna o ponto único de gating server-side —
  qualquer feature futura que precise ser Premium-only consulta este serviço,
  nunca decide sozinha com lógica duplicada.
- Migration `0009` precisa de backfill: households existentes sem linha em
  `subscriptions` recebem `free`/`active` na mesma migration (INSERT
  condicional), evitando null-handling em toda leitura futura.

## Alternativas rejeitadas

- **Desconto também 100% local (sem tocar o Stripe)**: rejeitada — divergiria
  do valor real cobrado pelo cartão do usuário; o Stripe teria que continuar
  cobrando o preço cheio enquanto o admin "achasse" que há desconto, ou
  exigiria replicar toda a lógica de faturamento localmente. O requisito do
  responsável é "não abrir o Stripe", não "não usar a API do Stripe" — a
  distinção importa e resolve o problema sem essa duplicação.
- **Tabela `subscriptions` nova/renomeada**: rejeitada — o shell existente já
  está bem modelado (RLS correta, unique por household, enums já com o valor
  `custom` necessário); reescrever seria trabalho sem ganho, e o projeto evita
  renomear sem necessidade.
- **Payload completo do webhook persistido em jsonb**: rejeitada por
  minimização de dado sensível de pagamento; o Stripe já retém o evento e pode
  ser buscado fresco por `id` se um reprocessamento for necessário.

## Fora de escopo (decidido)

- Lista final de capabilities do plano Free (decisão de produto separada, D-1).
- Stripe Elements/checkout embutido — Checkout hospedado é suficiente para o MVP.
- Métodos de pagamento além de cartão (Pix/boleto) — avaliar na Fase 3 do
  roadmap de lançamento.
- Implementação do job `billing-reconciliation` em detalhe — tarefa própria (B-3).
- Tier "Conectado" (Open Finance) — permanece em espera com gatilho (ADR-0025);
  este ADR só prepara o mecanismo de billing que o tier usará no futuro.
