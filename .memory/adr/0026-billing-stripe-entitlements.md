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

## Adendo (2026-07-12) — Catálogo de planos espelhado com o Stripe (MC-2)

Correção sobre a decisão original: `STRIPE_PREMIUM_PRICE_ID` em env (§10
original) foi **substituído** por um catálogo declarativo em código +
reconciliação, a pedido do responsável — "espelharmos os dados que vêm do
Stripe, ao mesmo tempo que refletimos os nossos" vale tanto para os
planos (produtos/preços) quanto para as assinaturas em si.

1. **`PLAN_CATALOG`** (`subscriptions/domain/plan-catalog.ts`) declara os
   planos que o produto vende (hoje só `premium_monthly`, R$14,90/mês) — TS
   puro, mesmo padrão de "catálogo estático" já usado em
   `notifications/application/i18n/notification-messages.ts`.
2. **`PlanCatalogService`** (`OnModuleInit`) sincroniza esse catálogo com o
   Stripe no boot: busca um Price existente pelo `lookup_key` (mecanismo
   nativo do Stripe para achar por chave estável nossa, até 10 por chamada);
   se não achou, cria o Product (`id` customizado determinístico, ex.:
   `"premium"`) e o Price (gravando o `lookup_key`). **O Stripe é a fonte de
   verdade de existência** — a tabela nova `billing_plans` é só um cache
   local rápido, sem GRANT/RLS (mesmo padrão de `stripe_webhook_events`).
   Falha na reconciliação vira log de erro, nunca derruba o boot; um
   checkout chamado antes dela completar lança `PlanNotAvailableException`
   (503) — erro claro, não comportamento indefinido.
3. `CreateCheckoutSessionUseCase` passa a resolver o price via
   `billingPlanRepo.findByKey(DEFAULT_PLAN_KEY)`, nunca mais via
   `ConfigService`. `STRIPE_PREMIUM_PRICE_ID` foi removido de
   `.env`/`.env.example`/`turbo.json`/`ci.yml`.
4. **A segunda metade do pedido (sync bidirecional de `subscriptions`) não
   muda o desenho** — já era exatamente o escopo do webhook +
   reconciliação periódica (§5/§8 originais, tarefa B-3): Stripe → nosso
   banco via webhook/reconciliação; nosso sistema → Stripe já era verdade
   desde o B-2 (checkout/portal chamam a API diretamente) e permanece via
   B-7 (comp/desconto administrativo).

## Adendo (2026-07-12) — Webhook + reconciliação entregues (B-3)

Implementa §5 (`POST /webhooks/stripe`) e §8 (`billing-reconciliation`) do
desenho original. Sem mudança de contrato — só a materialização.

1. **Caminho de sync único**: webhook e reconciliação convergem para
   `ISubscriptionRepository.syncFromStripe(householdId, NormalizedSubscription)`.
   `subscription-sync.ts` centraliza `mapStripeStatus` (8 status do Stripe →
   4 nossos: `active|trialing|past_due` mantém 1:1; `canceled/unpaid/
   incomplete/incomplete_expired/paused` colapsam em `canceled`) — nenhum dos
   dois caminhos decide o mapeamento por conta própria. **Comp tem
   precedência**: se `type='custom'` local, o sync atualiza período/ids mas
   nunca rebaixa `type` (a isenção do §2 não pode ser desfeita por um evento
   Stripe atrasado).
2. **`IPaymentGateway` ganhou `constructWebhookEvent`/`getSubscription`** —
   verificação de assinatura e normalização (`NormalizedSubscription/Product/
   Price`) ficam 100% na infra (`StripePaymentGateway`); o resto do módulo
   nunca importa o SDK do Stripe diretamente. Gotcha confirmado (mesmo do
   ZipTalk): `current_period_start/end` e `price` vivem em
   `sub.items.data[0]`, não no top-level do objeto subscription (API v22).
3. **`stripe_webhook_events` (B-1) usada pela primeira vez**: `claim(id, type)`
   via `INSERT ... ON CONFLICT DO NOTHING RETURNING` — a PK garante
   idempotência sem lock explícito; replay do mesmo `event.id` é no-op.
   Assinatura inválida → `WebhookSignatureInvalidException` → 400 (não 500;
   `AllExceptionsFilter` só trata exceções não mapeadas como 500).
4. **Endpoint público**: `@Controller("webhooks/stripe")` sem `AuthGuard`,
   `@SkipThrottle()` (primeiro uso no repo — o throttler global de 120/min
   derrubaria retries do Stripe), escrita via `DRIZZLE_ADMIN` (mesmo padrão do
   `internal-cron.controller.ts`).
5. **Catálogo (`billing_plans`) também sincroniza ao vivo**: `product.updated`
   e `price.updated`/`deleted` chamam
   `IBillingPlanRepository.updateFromStripeProduct/updateFromStripePrice` —
   update where-matches, no-op se o produto/preço não corresponder a nenhum
   plano declarado (nunca cria plano novo a partir do dashboard; só espelha o
   que o `PLAN_CATALOG` já declara, ver adendo MC-2 acima).
6. **`ReconcileSubscriptionsUseCase` + `BillingReconciliationJob`**
   (`@CronJobName("billing-reconciliation")`) varre `findAllStripeLinked()` e
   chama `getSubscription` + `syncFromStripe` para cada household — pega
   webhooks perdidos (rede instável, deploy durante o evento). Dunning/grace
   period continuam sendo decisão do Stripe (`past_due → canceled` sai
   naturalmente do próprio Stripe cancelar); não recalculamos grace localmente.
7. **`main.ts` habilita `rawBody: true`** (`NestFactory.create(AppModule,
   { rawBody: true })`) — necessário porque `constructEvent` exige o buffer
   raw, e o parser JSON global já consome o body antes do handler. Não quebra
   o parse das outras rotas. `test/helpers.ts` replica a mesma opção para os
   e2e.
8. **e2e offline** (`subscriptions-webhook.e2e-spec.ts`, 7 casos): assina
   payloads com `stripe.webhooks.generateTestHeaderString` + um
   `STRIPE_WEBHOOK_SECRET` de teste fixo — sem depender do Stripe CLI ou de
   rede. Cobre: assinatura inválida (400), sync de status ativo, idempotência
   de replay, cancelamento, comp não rebaixado, e mirror de produto/preço.
   Suíte completa (15 specs / 91 testes) verde sem regressão.

## Adendo (2026-07-12) — Entitlements aplicado / gating por rota (B-4)

Materializa o §7 (`EntitlementsService` como gating server-side). O serviço,
criado no B-1, era um dead-end (`capabilities: {}`, nenhum consumidor); B-4
liga o mecanismo ponta a ponta e prova em uma rota-referência. **D-1 (a régua
comercial final do Free) segue em aberto** — decisão do responsável foi entregar
o mecanismo + gatear só relatórios avançados por ora.

1. **Modelo de capabilities no domínio** (`subscriptions/domain/entitlements.ts`):
   `ResolvedPlan` (migrado da service p/ o domínio) + `CAPABILITIES` (hoje só
   `advanced_reports`) + `PLAN_CAPABILITIES` (mapa plano→capability). **`custom`
   (comp) recebe as mesmas capabilities de `premium`** (§2, precedência de comp).
   `EntitlementsService.resolve` passou a preencher `capabilities` via
   `capabilitiesFor(plan)` (era `{}`). Adicionar capability = 1 linha + coluna.
2. **Gate capability-based, não plan-based** (decisão do responsável): espelha o
   par `@RequireModule`/`HouseholdModuleGuard`. Novos
   `@RequireCapability("advanced_reports")` (SetMetadata) +
   `HouseholdEntitlementGuard` (`Reflector` + `EntitlementsService`): sem
   metadata → libera; senão resolve entitlements do lar e bloqueia se a
   capability não estiver ativa. Roda **após** `AuthGuard`+`HouseholdMembershipGuard`
   (depende do `householdId` na rota).
3. **Bloqueio → HTTP 402 Payment Required** (decisão do responsável, não 403):
   nova `PremiumRequiredException` (`code = "PREMIUM_REQUIRED"`) + linha no
   `domain-status.map.ts`. O `code` estável deixa o paywall do B-6 distinguir
   "faça upgrade" (402) de "sem permissão" (403) pelo próprio status.
4. **`GET /households/:id/subscription` expõe entitlements** (cumpre a linha
   "estado resolvido: plano, status, entitlements, origem" do §5): resposta
   ganhou `entitlements: { plan, status, source, capabilities }` **aninhado**,
   preservando todo o top-level (os e2e de B-2/B-3 asseveram `body.type`/
   `status`/`stripeSubscriptionId`). É o contrato que o B-6 consome.
5. **Guard cross-módulo**: `SubscriptionsModule` provê+exporta
   `HouseholdEntitlementGuard`; `ReportsModule` importa `SubscriptionsModule`.
   Sem ciclo (subscriptions não importa reports). Padrão reutilizável por
   qualquer módulo que queira gatear rota por capability.
6. **Rota-referência gateada**: `GET .../reports/annual` vira premium-only
   (`advanced_reports`); `GET .../reports/monthly` permanece Free — relatório
   anual tratado como o "relatório avançado" da landing. Limites por contagem
   (2º lar, teto de membros do Free) ficam para follow-up (tocam
   households/invitations e dependem de D-1).
7. **Testes**: unit `entitlements.service.spec.ts` (free/standard/trial/custom →
   plano+source+capabilities) e `household-entitlement.guard.spec.ts`
   (sem-metadata/allow/deny/missing-household); e2e offline
   `entitlements.e2e-spec.ts` (Free → annual 402 `PREMIUM_REQUIRED`, monthly
   200; promovido a standard → annual 200; comp/custom → 200). `reports.e2e-spec.ts`
   ajustado: promove seu lar a premium no `beforeAll` (testa agregação, não
   billing). Suíte completa (16 specs / 95 testes) verde sem regressão.

## Adendo (2026-07-12) — Frontend de billing / paywall (B-6)

Materializa o §5 do lado do cliente (`settings/subscription.tsx` deixa de ser
placeholder) + paywall no ponto que B-4 gateou. Só frontend — nenhum backend
tocado. Regra de produto respeitada: **nunca gatear no cliente** (o front só
reflete `entitlements`/402 do backend).

1. **Feature nova `features/subscription/`**: `use-subscription` (query GET
   subscription, key nova `queryKeys.subscription.detail`), `use-entitlements`
   (derivado; enquanto carrega assume o mais restritivo p/ não vazar conteúdo
   premium num flash), `use-subscription-mutations` (`checkout`/`portal` →
   `apiRequest<{url}>` POST → `window.location.assign(url)`; redirect pós-mutation
   é padrão **novo** no repo). `SubscriptionPage` + `PremiumGate` (card de paywall
   reutilizável).
2. **`SubscriptionPage`** mostra plano/status/source (badges) e ramifica: **Free**
   → oferta Premium + botão checkout; **premium** → "Premium ativo" + botão portal
   (aviso extra se `past_due`); **custom/comp** → "Isenção concedida" (com motivo),
   sem botões. Botões de ação só p/ `household.role === "owner"` (checkout/portal
   são owner-only no backend; nav de settings já é owner-only). Lê
   `?checkout=success|cancel` (URLs de retorno montadas pelo backend a partir de
   `FRONTEND_URL`) → banner. Sem publishable key / sem PCI no front (ADR §5).
3. **Paywall proativo** (decisão do responsável) no relatório anual: a página de
   relatórios usa `useEntitlements`; a aba "Anual" ganha cadeado p/ Free e, ao
   selecionar, renderiza `<PremiumGate/>` **sem disparar** a request condenada
   (`useAnnualReport(householdId, year, enabled=canAnnual)`). O 402
   `PREMIUM_REQUIRED` ainda é tratado defensivamente (`premiumRequired` no hook;
   sem retry em 4xx).
4. **i18n**: namespace novo `subscription` (pt-BR + en; es cai no fallback);
   chaves `households.subscription.*` órfãs removidas. `PremiumGate` reusa o
   namespace, então a página de relatórios também o carrega.
5. **Verificado no browser** (backend+frontend locais): Free → página mostra
   oferta + checkout → POST 201 → redirect real p/ `checkout.stripe.com` (test
   mode, sem completar pagamento); `?checkout=success` → banner; Relatórios/Anual
   (Free) → cadeado + PremiumGate, **nenhuma** request `/reports/annual` disparada;
   após promover a `standard` via SQL → página vira "Premium" + portal e a aba
   Anual dispara `/reports/annual → 200` e renderiza. `check-types`+`lint` limpos,
   sem erros de console. Backend intacto (B-6 não toca backend).

## Adendo (2026-07-12) — Admin de isenção/desconto (B-7 — M14 concluído)

Materializa o §5 (rotas admin), §2 (comp) e §3 (desconto). Backend + frontend
no mesmo PR (decisão do responsável). O modelo de dados (colunas da migration
0009, `auditActionEnum.subscription_changed`, `PlatformAdminGuard`) já existia;
B-7 construiu a camada de aplicação/interface/gateway em cima.

1. **Duração do desconto — contrato nativo do Stripe** (resolve o detalhe que o
   ADR deixara em aberto): o corpo de `POST .../discount` é `{ percent? |
   amountCents?, duration: "once"|"repeating"|"forever", durationInMonths? }`
   (`durationInMonths` obrigatório só quando `repeating`). 1:1 com o Coupon do
   Stripe; a tela admin oferece os 3 modos. Valor fixo em centavos (BRL).
2. **Gateway** ganhou `createCoupon`/`applyCouponToSubscription`/
   `removeSubscriptionDiscount`/`cancelSubscription` (SDK v22: `coupons.create`,
   `subscriptions.update({ discounts: [{ coupon }] })`, `deleteDiscount`,
   `cancel`). Stripe 100% na infra.
3. **Comp (isenção) 100% local**: `GrantCompUseCase` — se há sub Stripe ativa,
   cancela via API antes; grava `type='custom'`/`status='active'`/`priceCents=0`/
   `comp_*` e desvincula `stripeSubscriptionId` (preserva `stripeCustomerId`).
   `RevokeCompUseCase` → volta a `free`, limpa `comp_*`, **nunca apaga dados**.
   Repo ganhou `grantComp`/`revokeComp`/`setDiscountCache`/`clearDiscountCache`;
   a entity expõe `stripeCouponId`/`discountPercent` (o `GET subscription`
   existente passa a mostrá-los; `compGrantedBy` fica interno — resolvido do ator
   via USER_REPOSITORY).
4. **Desconto sempre via Stripe** (`ApplyDiscountUseCase`): valida (exatamente um
   de percent/amountCents; percent 1..100; `repeating` exige meses) → 422
   `INVALID_DISCOUNT`; exige sub Stripe ativa → senão 422
   `SUBSCRIPTION_NOT_STRIPE_LINKED`; cria coupon + anexa + cacheia. `RemoveDiscount`
   remove no Stripe + limpa cache.
5. **Rotas** (`admin-subscription.controller.ts`, prefixo
   `admin/households/:householdId/subscription`, `AuthGuard`+`PlatformAdminGuard`):
   `POST/DELETE comp`, `POST/DELETE discount`. GET de estado reusa o
   `GET /households/:id/subscription` (super_admin passa no `HouseholdMembershipGuard`
   por fallback `isSuperAdmin`). Toda ação audita `subscription_changed` com
   `{ operation, reason?/percent?/amountCents? }`. SubscriptionsModule importa
   `UserInfrastructureModule` (AuditService é global).
6. **Frontend** `admin-billing.tsx` (antes placeholder → tela real; admin não usa
   i18n, strings PT hardcoded): busca de lar → seleciona → estado da assinatura +
   painel de isenção (motivo obrigatório + validade via DatePicker de datas
   futuras; revogar via ConfirmDialog) + painel de desconto (percent/valor +
   duração; some/hint quando não há sub Stripe). Mutations novas em `use-admin.ts`
   invalidam `admin.all` + `subscription.detail`.
7. **Verificado**: unit (11 casos: grant cancela sub, comp precede, validações de
   desconto, cache) + e2e offline `admin-subscription.e2e-spec.ts` (comp grant/
   revoke, não-admin 403, desconto sem sub 422, input inválido 422). Browser
   (super_admin): busca → conceder isenção → lar vira custom ao vivo → revogar →
   free; desconto mostra o hint "requer assinatura Stripe". Suíte completa
   **17 specs / 100 testes** e2e verde, sem regressão. Happy-path de desconto real
   precisa de sub Stripe viva → coberto por unit + verificação manual.

## Adendo (2026-07-12) — Fase billing-hardening (integração real local + trial + expiry)

Fase pós-M14 (novo modelo de entrega: 1 branch/PR por fase, subtarefas em
commits). Reproduz o fluxo de billing fielmente em local (Stripe test +
webhooks **reais** via `stripe listen`) e fecha os gaps expostos pela bateria
de 8 cenários do responsável.

1. **Rig local** (H-1): script `pnpm --filter backend stripe:webhook`
   (`stripe listen --forward-to localhost:3001/webhooks/stripe`, padrão
   ZipTalk — ngrok desnecessário p/ Stripe) + runbook
   `docs/billing-local-testing.md` (setup + bateria como checklist + registro
   de execuções).
2. **Job `billing-expiry-sweep`** (H-2): corrige bug latente do B-7 —
   `comp_expires_at` era write-only (reconcile só varre subs Stripe-linked).
   `ExpireSubscriptionsUseCase` + `@CronJobName`: comp vencido → `revokeComp`;
   trial vencido → `expireTrial` (novo). Audita `comp_expired|trial_expired`
   com ator null (sistema). Entity/mapper expõem `trialEndsAt` (coluna existia
   sem uso).
3. **Trial administrativo** (H-3, cenário 8): `POST/DELETE
   /admin/households/:id/subscription/trial` `{months: 1..24}`. 100% local
   (sem Stripe/cartão, espírito do comp §2): `type='trial'`/`status='trialing'`/
   `trial_ends_at`; expira via sweep → free. Só concedível a lar free
   (`TRIAL_NOT_ALLOWED` 422). `EntitlementSource` ganha `'trial'` (plan segue
   premium). Frontend: TrialPanel na página de assinatura (validade + CTA
   assinar; **portal só com `source==='stripe'`**) + painel Trial no admin.
4. **Free espelhado no Stripe** (H-4, cenário 1, decisão do responsável):
   `PLAN_CATALOG` ganha `free_monthly` (R$ 0) — Product+Price reais no
   dashboard; lar Free NÃO passa por checkout nem vira subscription.
5. **Bateria 1–8 executada de verdade** (H-5): upgrade via Checkout real
   (cartão de teste) → webhooks reais → premium; portal; downgrade (portal =
   fim do período; CLI = imediato) → free sem apagar dados; comp; desconto
   repeating/forever (coupons conferidos no Stripe); trial + expiração via
   sweep. **3 bugs pegos e corrigidos** (invisíveis aos e2e offline):
   (a) return URL do checkout/portal usava `/dashboard/<uuid>` (rota
   inexistente) → agora `/households/<slug>` via `findHouseholdSlug`;
   (b) `cancelSubscription` não-idempotente (500 ao conceder comp sobre sub já
   cancelada) → cancel idempotente no gateway;
   (c) `source` classificava trial como `stripe` (id de sub cancelada fica
   para registro) → resolve reordenado (trial antes de stripe) + `grantTrial`
   limpa o id remanescente.
   Detalhe/registro no runbook. Suíte final: unit 96, e2e 17 specs/108 testes.
