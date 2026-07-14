# ADR-0029 — Assinatura pago-only: 2 tiers (Essencial/Completo) + trial self-serve, fim do Free (M16)

- **Status:** Aceito
- **Data:** 2026-07-14
- **Relacionados:** ADR-0026 (billing/entitlements — **supersede o adendo D-1
  "régua final do Free" e o adendo "billing-hardening" na parte de trial
  administrativo local**; o resto do ADR-0026 — schema base, webhook,
  reconciliação, comp/desconto — permanece vigente), ADR-0028 (admin
  centrado em lares)

## Contexto

O modelo herdado do M14 (ADR-0026 + adendo D-1) era **freemium**: o Free era
um estado-padrão sem produto no Stripe (`getOrCreate` criava `free/active`),
com uma régua de limites por contagem (1 lar, 2 membros, 3 metas, 3
orçamentos) e 3 capabilities pagas. O único produto pago era "Larmony Family"
(`premium_monthly`, R$ 14,90/mês); o checkout ia direto para pago, sem trial;
e "trial" só existia como concessão manual do admin (`GrantTrialUseCase` +
`billing-expiry-sweep`).

**Problema identificado pelo responsável**: o Free gera custo real (e-mail
transacional hoje, WhatsApp depois) sem receita nem sinal de intenção de
compra. Decisão: **eliminar o freemium** e mover para **pago-only com trial
self-serve de 30 dias via checkout** (cartão upfront — todos passam pelo
checkout, inclusive no trial, o que dá tracking real de conversão
trial→pago). Isso elimina a necessidade de um "produto free" no Stripe e
obriga a repensar as ações de assinatura do super admin.

**Preço definido por um agente especializado**, não pelo responsável nem por
mim diretamente — a pedido explícito do responsável, foi criado um subagente
`pricing-strategist` (`.claude/agents/pricing-strategist.md`, read-only/
consultivo) que pesquisou concorrentes brasileiros (Mobills, Organizze etc.)
e recomendou os números abaixo; o responsável fez o sign-off final sobre a
recomendação.

## Decisão

Entregue em 4 PRs sequenciais (branch por fase, mesmo modelo de entrega do
billing-hardening/M15):

### PR 1 — Núcleo: 2 tiers pagos + guard de escrita coarse

1. **Dois planos pagos, sem tier gratuito**: **Essencial** (R$ 9,90/mês,
   R$ 99/ano) e **Completo** (R$ 19,90/mês, R$ 199/ano) — preços
   recomendados pelo `pricing-strategist` e aprovados pelo responsável.
   `PLAN_CATALOG` (`subscriptions/domain/plan-catalog.ts`) passa de 1 entrada
   (`premium_monthly`) para 4 (2 tiers × 2 intervalos); `tierFromLookupKey`
   resolve o tier a partir do `lookup_key` do Price.
2. **Escopo dos tiers** (decisão do responsável): **Essencial = núcleo**
   (transações, categorias padrão, metas, relatório mensal, notificações,
   membros/lares ilimitados); **Completo = +avançado** (orçamentos,
   lançamentos programados, relatórios avançados — anual + export CSV,
   categorias personalizadas). `CAPABILITIES` cresce de 3 para 5:
   `budgets`/`scheduled_entries` (novas, Completo-only) +
   `advanced_reports`/`report_export`/`custom_categories` (existentes,
   agora também Completo-only).
3. **`ResolvedPlan` vira `locked | essencial | completo`** (era
   `free | premium | custom`); `EntitlementSource` vira
   `stripe | comp | trial | locked` (era `stripe | comp | trial | free`).
   `locked` = sem assinatura ativa → **somente-leitura** (nunca apaga dados,
   bloqueia só escrita). `PLAN_LIMITS`/`limitsFor` (régua por contagem do
   D-1) são **removidos por completo** — pago = ilimitado; só capabilities
   diferenciam os tiers agora. As 4 exceções de limite
   (`HouseholdLimitReachedException` etc.) são deletadas.
4. **`ActiveSubscriptionGuard`** (novo): bloqueia métodos de escrita
   (POST/PATCH/DELETE) quando `plan === "locked"` → 402
   `SUBSCRIPTION_REQUIRED`. Aplicado **por-controller, depois de**
   `AuthGuard`+`HouseholdMembershipGuard` — **não é um `APP_GUARD` global**:
   um guard global rodaria antes do `AuthGuard`, e `EntitlementsService
   .resolve()`→`getOrCreate()` faria INSERT de uma linha de subscription
   para qualquer UUID de household adivinhado, mesmo sem autenticação (vetor
   de escrita/probe). Esse desenho foi corrigido **antes** da implementação
   por uma revisão de arquitetura que pegou o defeito. Aplicado em
   `transactions`/`categories`/`goals` (escrita core, permitida ao
   Essencial); **não aplicado em `households`** (gestão de conta — renomear,
   membros, sair/deletar — continua disponível mesmo locked, o usuário nunca
   fica preso); `budgets`/`scheduled-transactions` usam
   `@RequireCapability` + `HouseholdEntitlementGuard` em vez disso (bloqueiam
   TODAS as rotas, incl. GET, para Essencial/locked — módulos inteiramente
   Completo-only).
5. Migration `0004_subscription_tiers`: enum `subscription_tier`
   (`essencial`|`completo`); `subscriptions.tier` (nullable);
   `subscriptions.trial_consumed` (boolean, default false — 1 trial
   self-serve por household).

### PR 2 — Trial self-serve + checkout com seleção de plano + gate de onboarding

6. **Checkout aceita `planKey`**: o usuário escolhe Essencial/Completo ×
   mensal/anual **no checkout** (decisão do responsável, contra a
   recomendação inicial de "vira Essencial por padrão" — o plano escolhido é
   o que é cobrado ao fim do trial, sem tier-padrão pós-trial).
7. **Trial de 30 dias, sempre com cartão** (`payment_method_collection:
   "always"`): `trial_consumed` é marcado **antes** da chamada ao Stripe (um
   checkout abandonado não libera um 2º trial). Durante o trial
   (`status=trialing`), o acesso resolvido é sempre **Completo**,
   independente do tier escolhido para cobrança pós-trial.
8. **Onboarding**: signup → criar o 1º lar → redirect automático para o
   gate de assinatura (não mais para a lista de lares) — todo mundo passa
   pelo checkout antes de usar o app, inclusive no trial.

### PR 3 — UX: somente-leitura + paywall por tier + landing

9. `LockedBanner` novo em `HouseholdLayout`: aviso de somente-leitura em toda
   página de um lar sem assinatura ativa (some na própria página de
   assinatura). Orçamentos e lançamentos programados ganham paywall de
   **página inteira** (não só o form) — reflete o
   `HouseholdEntitlementGuard` bloqueando GET para quem não tem a
   capability. Categorias mantém o padrão anterior (lista/edição sempre
   livres, só a criação de categoria nova é gateada — já estava correto
   desde o PR1).
10. Landing reconstruída: 2 planos pagos com toggle mensal/anual + trial de
    30 dias em todas as CTAs (nav/hero/pricing/FAQ/finalCta), 7 locales —
    removida toda menção a "grátis"/"sem cartão".

### PR 4 — Faturas no admin + fim do trial administrativo local

11. **`IPaymentGateway.listInvoices(customerId)`** (pedido original do
    responsável: "poder listar as faturas dos meses já pagos") + endpoint
    `GET /admin/households/:id/subscription/invoices` + UI no painel admin.
12. **Trial administrativo local removido**: `GrantTrialUseCase`/
    `RevokeTrialUseCase`, rotas, DTO, exceção `TrialNotAllowedException`, e o
    branch `type="trial"` do `EntitlementsService.resolve()` — redundante
    desde que o trial virou self-serve via Stripe (PR2). O único caminho de
    "acesso grátis" via admin continua sendo o **comp** (isenção),
    inalterado. `billing-expiry-sweep` passa a varrer só isenção vencida.
    `type: "trial"` continua na união `SubscriptionPlan` só por
    compatibilidade com o enum do banco e linhas antigas de teste — nada
    mais escreve esse valor.
13. Painel admin mostra o `tier` (essencial/completo) num badge.

## Consequências

- O enum `subscription_type` (`free|trial|standard|custom`) **não muda** —
  `free` passa a significar "sem assinatura ativa" (= `locked`) em vez de
  "no plano gratuito funcional"; nenhuma migração de enum foi necessária
  (mesmo espírito do `custom` já reaproveitado pelo ADR-0026 original).
  Coluna `trial_ends_at` (do trial administrativo removido) fica intocada no
  banco — dead-but-harmless, sem migration de remoção.
- `EntitlementsService` continua o ponto único de gating server-side; a
  régua por contagem do D-1 (ADR-0026) está **completamente substituída**
  por capabilities — qualquer feature nova Completo-only usa
  `@RequireCapability`, nunca mais um limite numérico.
- Landing, e-mails e onboarding não têm mais nenhuma menção a plano
  gratuito — todo signup termina no gate de assinatura.
- Pré-lançamento: sem migração de pagantes reais nem grandfathering — lares
  existentes em staging (dado de teste) viram `locked` naturalmente.

## Alternativas rejeitadas

- **Trial sem cartão** (fricção zero no início): rejeitada pelo responsável
  — sem cartão upfront, o checkout não é universal e o tracking de conversão
  trial→pago fica mais fraco (quem nunca deu cartão não é comparável a quem
  deu e não converteu).
- **Pós-trial vira Essencial por padrão** (recomendação inicial): rejeitada
  pelo responsável em favor de "usuário escolhe o plano no checkout" — sem
  tier-padrão pós-trial, o que a pessoa escolhe pagar é o que é cobrado.
- **Guard de escrita como `APP_GUARD` global**: rejeitada por review de
  arquitetura antes da implementação — rodaria antes do `AuthGuard` e
  criaria um vetor de escrita/probe pré-autenticação (ver PR1, item 4).

## Fora de escopo (decidido)

- Remover `type="trial"`/`"free"` do enum `subscription_type` do banco —
  troca de enum é migração arriscada sem ganho real (nada escreve esses
  valores como "estado funcional" hoje; `free` só significa `locked`).
- Migração de pagantes reais e grandfathering — não há (pré-lançamento).
- Cupom/anual promocional, dunning avançado além do que o Stripe já faz,
  e-mail de aviso de fim de trial (`trial_will_end`).
- 3º tier ("Pro"/Open Finance, ADR-0025) — segue em espera com gatilho
  próprio, independente deste ADR.
- Filtro de plano na lista admin de lares (`admin-households.tsx`) filtrar
  pelo `tier` resolvido em vez do `type` bruto — segue com o eixo antigo
  (`free|standard|custom`, "trial" removido do filtro por nunca mais ser
  escrito), labels atualizados (`plan_free`→"Sem assinatura",
  `plan_standard`→"Pagante") mas sem reescrever a semântica do filtro.
