# 15 — Billing (Stripe) + Entitlements (M14)

> **Kickoff (2026-07-12)**: contrato técnico já definido em ADR-0026 (checkpoint
> C1 do plano de coordenação do ciclo de lançamento). Mesmo contrato das specs
> M10–M13: escopo + regras aqui; briefs de execução (B-1..B-7) no backlog.

> **Superseded parcialmente (2026-07-14, M16, ADR-0029)**: o modelo freemium
> descrito abaixo (Free + Family R$ 14,90) foi substituído por pago-only com
> 2 tiers (Essencial R$ 9,90 + Completo R$ 19,90) e trial self-serve de 30
> dias — não há mais tier gratuito. As menções a "capabilities do Free"
> abaixo (§Fora de escopo, §B-4) e a régua de preço em "Por que isso importa"
> são históricas do kickoff do M14; ver `.memory/adr/0029-subscription-paid-
> only-2-tiers.md` e `.memory/domain-rules.md` §Essencial/Completo/locked
> para o modelo vigente.

## Papel

Vocês são o time de engenharia do **Larmony**. A missão deste milestone é
destravar receita: o produto está funcionalmente completo (M1–M12) mas
**billing é apenas um shell** — sem ele não há cobrança nenhuma.

## Por que isso importa (contexto de negócio)

- Modelo definido: SaaS freemium B2C por lar, via Stripe. **Premium
  R$ 14,90/mês**; tier "Conectado" (Open Finance) a R$ 29,90–44,90/mês fica
  para depois do gatilho do ADR-0025.
- Sem billing, o produto não gera receita mesmo estando pronto — é o único
  bloqueador comercial identificado em `docs/product/precificacao-e-viabilidade.md`.
- Requisito de operação: o responsável pela plataforma precisa poder conceder
  **desconto** ou **isenção total** por lar (ex.: parceiros, testers, casos de
  suporte) **sem abrir o dashboard do Stripe** — tudo pelo admin do próprio
  Larmony.

## Restrição de produto central (leiam antes de desenhar)

**Nunca gatear no cliente.** Toda decisão de "este lar pode/não pode fazer X"
é resolvida pelo `EntitlementsService` no backend; o frontend só reflete o
resultado. **Nunca apagar dados por causa de billing** — downgrade/cancelamento
reduz o que o lar pode fazer daqui pra frente, nunca destrói o que já existe.

## Convenções do repositório que este trabalho DEVE seguir

- Backend: um use-case por operação; use-cases nunca importam Drizzle direto;
  reusar os módulos existentes em vez de inventar — `PlatformAdminGuard`
  (admin), `HouseholdOwnerGuard` (household), `AuditService.logByAuthId`
  (auditoria, `subscription_changed` já existe no enum), `DRIZZLE_ADMIN` para
  escrita fora de request context (webhook, mesmo padrão do cron).
- Dinheiro em **centavos inteiros** (ADR-0017) — a Stripe API trabalha na
  menor unidade da moeda (centavos para BRL), então não há conversão de
  precisão a fazer, só de nome de campo.
- Toda tabela nova é household-scoped com **RLS** (padrão da migration
  `0001_rls_policies.sql`) — `subscriptions` já tem a policy certa
  (super_admin-only para escrita); a nova `stripe_webhook_events` não tem
  policy alguma (só `DRIZZLE_ADMIN` toca).
- Webhook do Stripe segue o mesmo desenho do cron (`CronSecretGuard`): guard
  próprio (verificação de assinatura, não secret estático), sem `AuthGuard`,
  escrita via `DRIZZLE_ADMIN`. Precisa de `@SkipThrottle()` — é o primeiro
  endpoint do projeto a pedir isso (o `ThrottlerGuard` global de 120 req/min
  bloquearia retries do Stripe).
- **Toda fase entrega seus testes junto** — e2e backend com Supabase local
  (Stripe test mode; webhooks simulados via `stripe trigger` ou fixtures).
- Decisões relevantes viram **ADR**; ADR-0026 já cobre o contrato central —
  decisões de implementação menores podem ficar só no PR/commit.

## Escopo por fases

**Fase B-1 — Migration + schema**
`subscriptions` ganha `stripePriceId`, `stripeCouponId`, `discountPercent`,
`compReason`, `compGrantedBy`, `compExpiresAt`; nova tabela
`stripe_webhook_events` (PK = event id do Stripe). Backfill: households sem
linha em `subscriptions` recebem `free`/`active` na mesma migration.

**Fase B-2 — Módulo `subscriptions`: checkout, portal, estado**
`GET/POST /households/:id/subscription[/checkout|/portal]`. Owner-only para
ações; qualquer membro vê o estado. `EntitlementsService` exportado do módulo.

**Fase B-3 — Webhook + reconciliação**
`POST /webhooks/stripe` idempotente (`stripe_webhook_events`); handlers para
`checkout.session.completed`, `customer.subscription.updated/deleted`,
`invoice.payment_failed/paid`. Job de cron `billing-reconciliation` para
`past_due → canceled` após o grace.

**Fase B-4 — Entitlements aplicado**
Guard opcional consultando `EntitlementsService` nas rotas que o produto
decidir gatear (lista de capabilities do Free é decisão separada, não trava
esta fase — o mecanismo funciona com qualquer lista).

**Fase B-6 — Frontend: telas reais**
`settings/subscription.tsx` deixa de ser placeholder: mostra plano/status,
botão de checkout (redireciona para Stripe) ou portal (se já assinante).
Paywall nos pontos que B-4 gatear.

**Fase B-7 — Admin: gestão de desconto/isenção**
Tela no `admin-billing.tsx` (hoje placeholder "PLAT-1"/"PLAT-2"): buscar lar,
ver estado da assinatura, conceder/revogar isenção (motivo obrigatório,
validade opcional), conceder/revogar desconto (percentual ou valor fixo,
duração). **Toda ação é 100% nesta tela — o operador nunca precisa abrir o
dashboard do Stripe** (requisito central deste milestone).

## Fora de escopo (explícito)

Stripe Elements/checkout embutido; métodos de pagamento além de cartão (Pix/
boleto — avaliar depois); tier "Conectado"/Open Finance (ADR-0025, gatilho
próprio); definição final das capabilities do Free (decisão de produto
separada).

## Critérios de aceite do milestone

1. Lar assina Premium em staging (Stripe test mode) e o acesso muda
   imediatamente após o webhook `checkout.session.completed`.
2. Cancelamento/downgrade não apaga nenhum dado do lar — só reduz
   entitlements.
3. Webhook duplicado (replay do mesmo `event.id`) não duplica efeito
   (teste e2e de idempotência).
4. Super-admin concede isenção total a um lar **só pelo admin do Larmony**
   (sem abrir o Stripe) e o lar vira Premium sem nenhuma cobrança.
5. Super-admin concede 20% de desconto a um lar **só pelo admin do Larmony**
   e a próxima fatura no Stripe reflete o desconto.
6. Toda concessão/revogação de comp e desconto aparece no audit log
   (`subscription_changed`) com ator e motivo.
7. Lar em `past_due` além do grace vira `canceled` automaticamente (job de
   reconciliação), sem intervenção manual.

## Dependências e sequenciamento

- **Pré-requisito**: nenhum — o produto já está pronto para receber billing.
- Bloqueia: tier "Conectado" (M13/Open Finance) usa a mesma camada de
  entitlements para gating.
- Depende do gate de testes no CI (H-1, já entregue) — código de billing só
  deve ser mesclado com a suíte rodando no pipeline.

## Primeiro entregável esperado

Migration `0009` (Fase B-1) — schema primeiro, sem código de aplicação, mesmo
processo dos milestones anteriores.
