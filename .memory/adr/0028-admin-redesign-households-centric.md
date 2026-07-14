# ADR-0028 — Redesign do super admin: centrado em lares, suspensão segura, role DB-only (M15)

- **Status:** Aceito
- **Data:** 2026-07-14
- **Relacionados:** ADR-0013 (super_admin como owner), ADR-0026 (billing/entitlements)

## Contexto

O painel PLAT-1/B-7 era raso para a fase de lançamento: página de billing era um
"busca-um-lar-e-gerencia-comp" sem lista; drill-down de lar só mostrava membros;
suspender um lar pago **não tocava o Stripe** (cliente cobrado com acesso
bloqueado — inaceitável/CDC); promote/demote de super_admin existia em rota+UI;
listas retornavam tudo sem paginação; KPIs ignoravam billing; **zero e2e** do
`AdminController` (o que deixou um 500 real em produção passar despercebido —
`GET /admin/households/:id` selecionava `stock_check_interval_days`, coluna do
ink-ops que nunca existiu no schema do Larmony). Referência consultada: ZipTalk
(listas server-side, detail em abas, cancel com prorate, deep-link pro Stripe).

## Decisão (PR 1 — core; KPIs e suporte são PRs próprias do M15)

1. **Admin centrado em LARES** (1 lar ↔ 1 subscription): sem lista de
   assinaturas. `GET /admin/households` server-side com `q` (ILIKE em
   nome/slug/**e-mail do dono** via LATERAL), `plan` (COALESCE — lar sem linha
   lazy = free), `status`, `suspended`, sort e paginação
   (`{data,total,page,pages}`, teto 100). `GET /admin/users` idem, com
   `households[]` (chips) via `json_agg`.
2. **Drill-down por aba** (payload por demanda, não fat endpoint): detail ganha
   bloco `subscription` (cache local + stripeCustomer/SubscriptionId p/
   deep-link); endpoints read-only paginados de transactions (from/to/type),
   categories, budgets (versão vigente on-read, padrão M10), goals (acumulado
   derivado), scheduled-entries e notifications (leitor admin novo; filtro de
   type com `::text` — valor fora do enum vira vazio, não 500). Auditoria por
   lar usa o filtro `householdId` que o `ListAuditLogsUseCase` já tinha.
   Investigação é read-only; **agir** continua sendo o "Gerenciar" (ADR-0013).
3. **Política de suspensão**: lar com sub Stripe VIVA
   (`active|trialing|past_due`) não suspende sem cancelar. Sem o flag
   `cancelStripeSubscription` → **409 `HOUSEHOLD_HAS_ACTIVE_SUBSCRIPTION`**;
   com o flag → `cancelSubscription(id, {prorate:true, invoiceNow:true})`
   (crédito proporcional; reembolso em dinheiro é manual no dashboard) →
   espelha cancelamento local (webhook segue idempotente) → suspende. UI faz o
   fluxo em 2 tempos (409 vira diálogo explícito). Reativar nunca bloqueia.
   Gateway ganhou options retrocompatíveis.
4. **Promote/demote de super_admin REMOVIDO do sistema** (rota, use-case, DTO,
   repo, exceção de auto-rebaixamento, botões): operação DB-only documentada em
   `docs/super-admin-promotion.md`. Racional: super_admin comprometido não cria
   outros; bug de guard não vira escalação.
5. **e2e novo `admin.e2e-spec.ts`** (28 casos): guard 403, filtros (incl. q por
   e-mail do dono), abas, suspensão ponta a ponta contra Stripe test (sub id
   fake exercita o caminho idempotente `resource_missing`), 404 da rota
   removida.

## Consequências

- Painel de billing por lar (comp/trial/desconto) virou a aba Assinatura do
  detalhe (`admin-subscription-panel.tsx`); rotas do
  `AdminSubscriptionController` intactas.
- `AdminModule` importa `SubscriptionsInfrastructureModule` (PAYMENT_GATEWAY)
  — segundo bridge cross-módulo do admin.
- Correção de passagem: settings reais (timezone/notification_hour) no detail
  no lugar da coluna fantasma.
- Pendentes no M15: PR 2 (KPIs de billing + espelho mínimo de
  `invoice.paid/payment_failed`), PR 3 (canal de suporte com tickets).
  Follow-ups: painel de feature flags (ADR-0009), PLAT-3 (auditar ações do
  super_admin dentro do lar — as abas read-only encolhem essa superfície).
