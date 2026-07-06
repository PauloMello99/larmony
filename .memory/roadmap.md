---
name: roadmap
description: Roadmap do Larmony — M1 fechado e M2 (Categories+Transactions) entregue; auditoria de milestones M1–M9 com estado real, esforço e estimativas (snapshot 2026-07-06)
metadata:
  type: project
---

# Roadmap — Larmony

> Snapshot de **2026-07-06** (atualizado após fechar M1 e entregar M2). Cada
> milestone vira um plano de implementação próprio antes de começar. Esforço
> em dias-de-dev aproximados (dev sênior + agente).

## Bootstrap — CONCLUÍDO ✅

| Fase | Escopo | Status |
|---|---|---|
| 0 — Preparação | branch, baseline verde | ✅ |
| 1 — Cleanup | domínio ink-ops removido, shell de infra mantido | ✅ |
| 2 — Redocumentação | `.memory/`, ADRs 0001–0018, `docs/`, `CLAUDE.md` | ✅ |
| 3 — Evolução do RAG | bge-m3, parent-document, hybrid, código indexado, SessionStart | ✅ |
| 4 — Fundação | org→household, schema `finance/`, baseline 0000+0001 RLS, i18n base | ✅ |
| Extras | cron registry (@CronJobName + DiscoveryService), GuestGuard, shell teal + IA completa do sidebar, placeholders M2–M8 | ✅ (2026-07-05) |

## Auditoria de milestones (2026-07-06, atualizada pós M1+M2+M5+M7)

| M | Feature | Estado real | O que falta | Esforço |
|---|---|---|---|---|
| M1 | Households core | **✅ 100% (2026-07-06)** — rename ponta a ponta, convites, switcher, GuestGuard, i18n base, shell teal, seletor de idioma no Account, onboarding signup→criar lar (`?welcome=1` auto-abre o Sheet), landing com copy de finanças domésticas | nada | — |
| M2 | Categories + Transactions | **✅ entregue (2026-07-06)** — backend CRUD completo (`households/:id/categories` e `/transactions`, RLS via DRIZZLE, filtros mês/ano/tipo/categoria, join de nomes) + frontend completo (Sheet de criar/editar, Table+cards responsivos, CurrencyInput/DatePicker, filtros) | nada — M4 estende com parcelamento/rateio depois | — |
| M3 | Dashboard | **✅ entregue (2026-07-06)** — `GET /households/:id/overview` + frontend com trends/progress/skeletons; **confirmado que para de mostrar zero automaticamente** assim que M2 populou dados reais, sem nenhuma mudança no endpoint | nada — evolui sozinho conforme M4-M7 populam mais tabelas | — |
| M4 | Parcelamento + rateio | schema pronto (installment_groups, transaction_members); 0% lógica | use-cases (criar N parcelas, split igual/específico com sobra determinística ADR-0017) + UI no Sheet de transação (M2 já aceita os campos como nulos) | **M** (2–3d) |
| M5 | Budgets | **✅ entregue (2026-07-06)** — backend CRUD (`households/:id/budgets?month=&year=`, RLS via DRIZZLE) com **spending derivado em runtime** (join correlacionado budgets→transactions, só `type='expense'`, sem persistir); update só do limite (categoria/período imutáveis), 409 na duplicata (unique) + frontend (grid de cards com progress bar, badge "Excedido", period nav mês/ano, Select filtrado por tipo+não-orçadas) | nada — evolui com M2 povoando transações | — |
| M6 | Goals | schema pronto; 0% | módulo + tela (cards, aportes via dialog, progresso derivado por SUM) | **M** (1,5–2d) |
| M7 | Bills + lembretes | **✅ entregue (2026-07-06)** — CRUD completo (`households/:id/bills`, RLS via DRIZZLE) somado à fatia cron já existente (repo agora injeta DRIZZLE+DRIZZLE_ADMIN no mesmo repositório); "lançar como transação" via `LaunchBillAsTransactionUseCase` reusando `CreateTransactionUseCase` (bills nunca geram transaction automaticamente — launch é sempre ação explícita, a bill nunca é consumida); frontend com seções Ativas/Inativas, Switch inline, alerta amber ≤7 dias, Select de lembrete {1,3,7,15} | nada | — |
| M8 | Relatórios | 0% (Recharts já é dependência) | use-cases de agregação (mensal 6m, anual 12m, por pessoa via person_id) + telas bar/pie | **M/L** (2–4d) |
| M9 | Recorrência | fora do schema **por design** (nunca existiu no old-larmony) | design próprio: modelo de regra, engine no tick do cron, edição de série vs ocorrência, relação com bills | **L** (3–5d) |

**Ordem sugerida de execução (M1, M2, M5 e M7 concluídos):** M6 → M4 → M8 → M9.
Racional: M6 (goals) é gêmeo de M5 (padrão CRUD + derivado por SUM); M4 (rateio) fica mais rico agora que budgets/bills consomem a mesma base de transações.

## Qualidade — testes (sessão 2026-07-06)

- Backend: Jest + supertest — unit (use-cases com fakes) + integração por
  funcionalidade contra Supabase local (auth, households, invitations,
  isolamento RLS, cron/dedup, categories, transactions, budgets, bills).
  37 e2e + 12 unit.
- Frontend: Playwright — fluxo principal (signup→lar→overview→nav) + convite +
  locale da conta + onboarding + categories (CRUD) + transactions (CRUD,
  filtros, promessa cross-milestone do overview) + budgets (CRUD com spending
  derivado refletindo despesa + badge Excedido) + bills (CRUD, lançar como
  transação sem consumir a bill, toggle ativa/inativa). 22 specs.
  Gotcha: a suíte cheia serial (22 specs, cada um re-logando) tem flakiness
  ambiental no dev server (Next/Turbopack ocasionalmente trava no login sob
  carga); cada spec passa isolado. Em CI usar build de produção deve estabilizar.
- **Estender um módulo existente sem quebrá-lo**: ao completar o CRUD de bills
  sobre a fatia cron já entregue, o repositório passou a injetar `DRIZZLE`
  (CRUD) + `DRIZZLE_ADMIN` (os métodos do cron, renomeados de `this.db` para
  `this.admin`) — o `cron.e2e-spec` existente pegaria qualquer regressão nesse
  rename. Padrão: ao estender um módulo de uma fatia anterior, rodar o spec
  daquela fatia antes de seguir.
- **Reuso de use-case entre módulos**: `LaunchBillAsTransactionUseCase` (bills)
  injeta `CreateTransactionUseCase` (transactions) diretamente — para isso o
  provider precisou ser adicionado a `exports` no `TransactionsModule` (só
  providers exportados ficam visíveis para quem importa o módulo). Padrão para
  qualquer ponte entre domínios financeiros (ex.: M9 recorrência → transactions).
- Regra: **toda feature nova de milestone entrega seus specs junto** (test-first
  por módulo, ver domain-rules).
- Padrão de repositório confirmado para escrita autenticada: `DRIZZLE`
  (RLS-enforced, claims setadas pelo `RlsInterceptor` global) é o padrão para
  toda escrita de módulo household-scoped; `DRIZZLE_ADMIN` fica reservado a
  bootstrap (sign-up, criação do primeiro membership) e jobs sem request
  context (cron). Resolução de `authId → users.id` (para `createdBy`/
  `personId` em transactions) é feita no controller via `GetMeUseCase`,
  nunca dentro do use-case. **Violação de unique (código pg 23505)**: o Drizzle
  embrulha o erro do pg — inspecionar `err` E `err.cause` ao mapear para uma
  DomainException (ver `drizzle-budget.repository.ts`).
- **Spending/derivados nunca persistidos**: budget spending e (futuro) goal
  progress são calculados em runtime via join/SUM correlacionado com o range
  do período. O padrão canônico do join está no overview `budgetsProgress` e
  replicado em `drizzle-budget.repository.ts` (sem acoplar os dois módulos).

## Fora de escopo do v1

- Permissões por módulo (roles owner/member bastam).
- Billing/assinatura (módulo `subscriptions` fica como shell).
- OAuth Google/Apple (reavaliar após M1 — auth atual é e-mail/senha).
- Ledger append-only de transações (ADR-0010 superseded).

## Infra — estado 2026-07-06

- **Git**: origin → PauloMello99/larmony, `main` com histórico limpo; v1 em `legacy/v1`.
- **Staging VERDE**: Railway (Backend backend-staging-f229 + Frontend
  frontend-staging-5b93 + Cron) × Supabase `larmony-staging`
  (ubpcmccdvldspoyfoark). Baseline de migrations aplicado, RLS on, health/tick ok.
- **v1 produção**: intocada (decisão 2026-07-05); services trackeiam `main`,
  builds futuros falham sem derrubar o deploy servido.
