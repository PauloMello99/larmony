# Billing — teste de integração local com Stripe real (test mode)

Runbook para reproduzir o fluxo de billing **fielmente** em ambiente local:
Stripe test mode + entrega **real** de webhooks via Stripe CLI (`stripe listen`
— não precisa de ngrok; o CLI faz o túnel). Complementa os e2e offline
(`generateTestHeaderString`), que cobrem assinatura/idempotência mas não o
fluxo Stripe→webhook→banco de verdade.

> Tudo aqui é **test mode**: chaves `sk_test_...`, cartões de teste
> documentados pelo Stripe. Nunca use chaves live ou cartões reais.

## Setup (uma vez por sessão de teste)

1. **Pré-requisitos**: Supabase local rodando (`npx supabase start`),
   `apps/backend/.env` com `STRIPE_SECRET_KEY=sk_test_...` (conta de teste) e
   Stripe CLI logada (`stripe login`).
2. **Suba o listener** (terminal dedicado, fica rodando):
   ```bash
   pnpm --filter backend stripe:webhook
   # = stripe listen --forward-to localhost:3001/webhooks/stripe
   ```
   O CLI imprime `Ready! ... webhook signing secret is whsec_...`.
3. **Cole o `whsec_...`** em `STRIPE_WEBHOOK_SECRET` no `apps/backend/.env`
   (substituindo o valor de teste dos e2e) e **(re)suba o backend**
   (`pnpm --filter backend dev`). Suba também o frontend
   (`pnpm --filter frontend dev`).
4. **Sanity check**: `stripe trigger customer.subscription.updated` → o
   terminal do listener mostra o forward e o backend responde `200`
   (evento de customer desconhecido é ignorado com log — ok).
5. Ao terminar a bateria, **restaure** o `STRIPE_WEBHOOK_SECRET` local antigo
   se os e2e offline forem rodados de novo (eles assinam com o valor do .env).

Utilidades:
- Cartão de teste padrão: `4242 4242 4242 4242` (qualquer validade futura,
  qualquer CVC). Outros cenários (recusa, 3DS): skill `stripe:test-cards`.
- Criar assinatura sem browser: anexar `pm_card_visa` a um customer e criar a
  subscription via API/CLI (`stripe subscriptions create -d customer=cus_... -d "items[0][price]=price_..." -d default_payment_method=pm_card_visa`).
- Cancelar: `stripe subscriptions cancel sub_...`.

## Bateria de cenários (checklist)

Para cada cenário: executar, observar o webhook chegar no listener, e validar o
estado via `GET /households/:id/subscription` (ou UI) + tabela `subscriptions`.

### 1. Lar novo usa grátis; Free existe como Price no Stripe
- Criar conta + lar novo pelo frontend. Usar transações/orçamentos/relatório
  mensal normalmente.
- **Esperado**: `type=free`, sem `stripe_customer_id`; relatório anual → 402
  (`PREMIUM_REQUIRED`); no dashboard Stripe (test) existem os Products/Prices
  `Larmony Grátis` (R$ 0, lookup_key `free_monthly`) e `Larmony Premium`
  (R$ 14,90, `premium_monthly`) criados pelo sync de boot. Lar Free **não**
  vira subscription no Stripe (decisão: espelho de catálogo apenas).
- [ ] passou

### 2. Upgrade → ganha funcionalidades pagas
- Configurações → Assinatura → "Assinar o Premium" → Checkout hospedado →
  cartão `4242...` → concluir.
- **Esperado**: listener mostra `checkout.session.completed` +
  `customer.subscription.created/updated`; volta pra
  `?checkout=success` com banner; `GET subscription` → `type=standard`,
  `status=active`, `entitlements.plan=premium`; relatório anual → 200 (aba
  destrava sem cadeado).
- [ ] passou

### 3. Gerenciar assinatura (portal)
- Na página de assinatura (agora premium) → "Gerenciar assinatura".
- **Esperado**: Billing Portal hospedado abre (meio de pagamento, faturas,
  cancelamento visíveis); "voltar" retorna à página de assinatura.
- [ ] passou

### 4. Downgrade → perde funcionalidades pagas
- Cancelar pela opção do portal (imediato) **ou** `stripe subscriptions cancel sub_...`.
- **Esperado**: listener mostra `customer.subscription.deleted`;
  `type=free`/`status=canceled`; relatório anual volta a 402; **nenhum dado do
  lar é apagado** (transações/orçamentos intactos).
- [ ] passou

### 5. Admin concede assinatura gratuita (comp)
- `/admin/billing` (super_admin) → buscar o lar → "Conceder isenção" (motivo).
- **Esperado**: lar vira `custom`/`active`, entitlements premium/source comp;
  se havia sub Stripe ativa, ela é **cancelada** no Stripe (ver dashboard) e o
  `stripe_customer_id` é preservado; audit log `subscription_changed`
  `grant_comp`.
- [ ] passou

### 6. Admin concede desconto por até X meses
- Pré-requisito: lar com sub Stripe ativa (cenário 2). `/admin/billing` →
  Desconto → Percentual (ex.: 20) → "Alguns meses" → 3 → aplicar.
- **Esperado**: coupon criado e **anexado à subscription no Stripe**
  (dashboard → subscription → desconto ativo, `duration=repeating, 3 months`);
  badge `-20%` na tela admin; próxima fatura refletiria o desconto.
- [ ] passou

### 7. Admin concede desconto para sempre
- Igual ao 6, duração "Para sempre" (remover o desconto anterior antes).
- **Esperado**: coupon `duration=forever` anexado; remoção via "Remover
  desconto" limpa no Stripe e no cache local.
- [ ] passou

### 8. Admin concede trial por X meses
- Lar Free → `/admin/billing` → painel Trial → conceder X meses.
- **Esperado**: `type=trial`/`status=trialing`/`trial_ends_at=+X meses`;
  entitlements premium (relatório anual libera), `source=trial`; página de
  assinatura mostra o período de teste + CTA de assinar (sem botão de portal —
  não há customer). Expiração: setar `trial_ends_at` no passado via SQL +
  `POST /internal/cron/tick` (header `x-cron-secret`) → volta a `free` e o
  anual volta a 402 (job `billing-expiry-sweep`; o mesmo sweep aplica
  `comp_expires_at`).
- [ ] passou

## Registro de execuções

| Data | Cenários | Resultado | Observações |
|---|---|---|---|
| — | — | — | — |
