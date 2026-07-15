# Larmony — Visão e Domínio (v1)

> Destilado do `old-larmony/CLAUDE.md` (fonte de verdade do produto v1) e adaptado
> à arquitetura deste repo. Regras completas em `.memory/domain-rules.md`; escopo
> por feature em `docs/product/features/`.

## Essência

Aplicação web de **controle financeiro doméstico multi-usuário**. Um *household*
(lar) tem múltiplos membros que compartilham as mesmas entidades financeiras,
isoladas por `household_id` via RLS. Cada membro autentica individualmente.

Produção: **larmony.me** · e-mail transacional Resend (`Larmony <team@larmony.me>`).

## Entidades

| Entidade | Papel | Pontos-chave |
|---|---|---|
| `households` | Unidade de tenancy | usuário pode pertencer a vários lares |
| `household_memberships` | pivot user↔household | role `owner` \| `member` |
| `household_invitations` | convites por e-mail | token único, expira em 7 dias |
| `users` | conta + perfil | `locale` (pt-BR \| en), avatar |
| `categories` | classificação | `income`/`expense`/`both`, cor; 13 defaults na criação do lar |
| `transactions` | **central** — gasto/receita | `amount_cents`, `date` de ocorrência, `created_by` ≠ `person_id`, categoria opcional |
| `installment_groups` | parcelamentos | 1 transaction por parcela (`installment_number`/`count`) |
| `transaction_members` | rateio entre membros | `share_amount_cents` NULL = divisão igual |
| `goals` + `goal_contributions` | metas de poupança | progresso derivado por SUM (sem trigger) |
| `budgets` | limite mensal por categoria | unique (household, category, month, year); spending derivado |
| `bills` | contas fixas | `due_day` 1–31, lembrete 1/3/7/15 dias, **não geram transactions** |

## Features do v1 (milestones M1–M9)

1. **M1 Households core** — setup de lar no signup, convites, switcher, i18n base
2. **M2 Categories + Transactions** — CRUDs centrais com filtros
3. **M3 Dashboard** — resumo mensal, últimas transações, contas ≤7 dias
4. **M4 Parcelamento + rateio**
5. **M5 Budgets** — orçamento mensal por categoria
6. **M6 Goals** — metas + aportes
7. **M7 Bills + lembretes** — cron de e-mail no tick de 5min
8. **M8 Relatórios** — mensal/anual, por pessoa (`person_id`)
9. **M9 Recorrência** — transações recorrentes (nunca implementado no v1 antigo)

## Diferenças deliberadas vs old-larmony

| old-larmony | Larmony (este repo) |
|---|---|
| Frontend fala direto com PostgREST | Frontend só fala com a API NestJS |
| Lógica em triggers (defaults, sync de goals) | Lógica em use-cases |
| `numeric` para dinheiro | centavos inteiros (`_cents`) |
| `my_household_ids()` nas policies | `app_user` NOBYPASSRLS + `request.jwt.claims` + helpers |
| Campos de recorrência sem lógica | recorrência só entra no M9, com design próprio |
| 3 services Railway (web/backend/reminders) | 3 services (Frontend/Backend/Cron tick unificado) |
| OAuth Google/Apple | e-mail/senha no v1; OAuth reavaliado pós-M1 |
