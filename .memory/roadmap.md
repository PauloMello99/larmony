---
name: roadmap
description: Roadmap do Larmony — v1 completo (M1–M9 + ADR-0020); v1.1 em andamento (M10 budgets versionados ✅, M11 notificações multicanal ✅, M12 timezone dos disparos ✅)
metadata:
  type: project
---

# Roadmap — Larmony

> Snapshot de **2026-07-08** (M9 Recorrência entregue — **v1 COMPLETO**). Cada
> milestone virou um plano de implementação próprio antes de começar. Esforço
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

## Auditoria de milestones (2026-07-07, M1–M8 concluídos)

| M | Feature | Estado real | O que falta | Esforço |
|---|---|---|---|---|
| M1 | Households core | **✅ 100% (2026-07-06)** — rename ponta a ponta, convites, switcher, GuestGuard, i18n base, shell teal, seletor de idioma no Account, onboarding signup→criar lar (`?welcome=1` auto-abre o Sheet), landing com copy de finanças domésticas | nada | — |
| M2 | Categories + Transactions | **✅ entregue (2026-07-06)** — backend CRUD completo (`households/:id/categories` e `/transactions`, RLS via DRIZZLE, filtros mês/ano/tipo/categoria, join de nomes) + frontend completo (Sheet de criar/editar, Table+cards responsivos, CurrencyInput/DatePicker, filtros) | nada — M4 estende com parcelamento/rateio depois | — |
| M3 | Dashboard | **✅ entregue (2026-07-06)** — `GET /households/:id/overview` + frontend com trends/progress/skeletons; **confirmado que para de mostrar zero automaticamente** assim que M2 populou dados reais, sem nenhuma mudança no endpoint | nada — evolui sozinho conforme M4-M7 populam mais tabelas | — |
| M4 | Parcelamento + rateio | **✅ entregue (2026-07-06)** — estende `transactions` (aditivo): parcelamento (POST com `installmentCount>1` → grupo + N transações atômicas, valor=total dividido por `splitEqually` com 1ª absorvendo a sobra, datas mês a mês; DELETE `/installment-groups/:id` cascade) + rateio (`transaction_members` via `members[]`, share null=igual/valor=específico, GET `/:id/members` com `effectiveShareCents`, replace no update). **Combinado permitido só com rateio igual** (específico+parcela → 422). Frontend: form com toggles Parcelar/Dividir, `RateioField` inline (igual/específico), badges N/M+Rateio, delete "esta parcela vs série" | nada | — |
| M5 | Budgets | **✅ entregue (2026-07-06)** — backend CRUD (`households/:id/budgets?month=&year=`, RLS via DRIZZLE) com **spending derivado em runtime** (join correlacionado budgets→transactions, só `type='expense'`, sem persistir); update só do limite (categoria/período imutáveis), 409 na duplicata (unique) + frontend (grid de cards com progress bar, badge "Excedido", period nav mês/ano, Select filtrado por tipo+não-orçadas) | nada — evolui com M2 povoando transações | — |
| M6 | Goals | **✅ entregue (2026-07-06)** — backend CRUD (`households/:id/goals`, RLS via DRIZZLE) + sub-recurso `/:goalId/contributions` (add/list com `authorName`/delete, aportes positivos, escopo via goal pai); **savedCents derivado por SUM em runtime** (nunca persistido); overview estendido aditivamente com `goals.top` (top-3 por %) e a seção "Metas ativas" agora renderiza GoalRow (corrigido o EmptyState incondicional) + frontend (grid de cards com progress, badge "Concluída" em success, dialog de aporte com histórico e exclusão, DatePicker com `startMonth`/`endMonth` opcionais p/ data alvo futura) | nada | — |
| M7 | Bills + lembretes | **✅ entregue (2026-07-06)** — CRUD completo (`households/:id/bills`, RLS via DRIZZLE) somado à fatia cron já existente (repo agora injeta DRIZZLE+DRIZZLE_ADMIN no mesmo repositório); "lançar como transação" via `LaunchBillAsTransactionUseCase` reusando `CreateTransactionUseCase` (bills nunca geram transaction automaticamente — launch é sempre ação explícita, a bill nunca é consumida); frontend com seções Ativas/Inativas, Switch inline, alerta amber ≤7 dias, Select de lembrete {1,3,7,15} | nada | — |
| M8 | Relatórios | **✅ entregue (2026-07-06)** — módulo `reports` read-only: `GET /reports/monthly` (série 6m + pizza categoria + gasto por pessoa no mês corrente via `person_id`) + `GET /reports/annual?year=` (12m + totais); frontend Recharts (bar/pie/lista), toggle Mensal/Anual, navegação de ano | nada | — |
| M9 | Recorrência | **✅ entregue (2026-07-08)** — módulo `recurrences` (backend + frontend). Regra com `frequency ∈ {weekly,monthly,yearly}` + `interval` ("a cada N"; sem RRULE) e `start/end/nextRunDate`; engine `recurrence-engine` no tick do cron gera as ocorrências vencidas (catch-up bounded, **avança o cursor ANTES de inserir** = gaps-over-dups) via `CreateGeneratedTransactionUseCase` (DRIZZLE_ADMIN, sem auditoria). Transação gerada tem `recurrence_id` (FK SET NULL → histórico sobrevive à exclusão da regra) e badge "Recorrente". **Sem rateio nem parcelamento no v1**; `startDate` >= hoje (sem backfill); reativação re-ancora `nextRunDate` para não gerar o gap pausado. Frontend `features/recurrences` (Sheet + lista ativas/inativas, toggle pausar) | nada | — |

**M1–M9 concluídos — v1 COMPLETO (2026-07-08).** Todo o núcleo financeiro +
relatórios + recorrência entregues. Não há milestone pendente no roadmap do v1.

## Qualidade — testes (sessão 2026-07-07)

- Backend: Jest + supertest — unit (use-cases com fakes) + integração por
  funcionalidade contra Supabase local (auth, households, invitations,
  isolamento RLS, cron/dedup, categories, transactions, budgets, bills, goals,
  parcelamento+rateio, **reports**). 55 e2e + 12 unit.
- Frontend: Playwright — fluxo principal (signup→lar→overview→nav) + convite +
  locale da conta + onboarding + categories (CRUD) + transactions (CRUD,
  filtros, promessa cross-milestone do overview) + budgets (CRUD com spending
  derivado refletindo despesa + badge Excedido) + bills (CRUD, lançar como
  transação sem consumir a bill, toggle ativa/inativa) + goals (aportes,
  Concluída, exclusão de aporte recuando o progresso) + parcelamento/rateio
  (badges N/M+Rateio, excluir série) + reports (mensal/anual, toggle, nav ano). 29 specs.
  Gotcha: a suíte cheia serial (cada spec re-logando) tem flakiness
  ambiental no dev server (Next/Turbopack ocasionalmente trava no login sob
  carga); cada spec passa isolado. Em CI usar build de produção deve estabilizar.
- **Placeholder de referência nos E2E (obsoleto)**: já não há asserção de
  placeholder de Recorrência em `fluxo-principal.e2e.ts` (foi removida antes do
  M9). `FEATURE_PAGES` em `features/dashboard/lib/nav.ts` também está defasado
  (lista até M8, `bills` marcado M7 mesmo com página real) — metadados de
  placeholder não são mais usados por nenhuma rota. Nada a "mover"; ao entregar
  M9 adicionou-se nav + página + specs reais.
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
- **M9 recorrência — reconciliação do reuso cross-módulo (importante)**: o engine
  roda no cron (sem request context), e `CreateTransactionUseCase` grava via
  `DRIZZLE` (RLS request-scoped) → **não pode ser reusado no cron** (o proxy cai
  no pool sem claims e o RLS nega tudo). Solução que honra a intenção da memória
  ("M9 → transactions") sem quebrar o RLS: `DrizzleTransactionRepository` ganhou
  `DRIZZLE_ADMIN` + método `createGenerated` (mesmo split `this.db`/`this.admin`
  de bills), exposto por um `CreateGeneratedTransactionUseCase` **sem auditoria**
  (evento de sistema, sem authId) que o `TransactionsModule` exporta. Regra geral:
  **qualquer escrita disparada por cron usa DRIZZLE_ADMIN**, nunca o use-case
  request-scoped — reusar use-case cross-módulo só vale quando o consumidor roda
  em request context (como `LaunchBillAsTransactionUseCase`).
- **M9 engine — idempotência (ticks sequenciais) sem transação cross-repo**: o
  loop de catch-up **avança `next_run_date` ANTES de inserir a transação**
  (espelha o mark-before-send de bills). Crash entre as duas escritas PULA uma
  ocorrência (gap visível/corrigível) em vez de DUPLICAR (corrupção silenciosa
  de relatórios/orçamentos). Protege re-tick **sequencial** (o caso real: 1 só
  serviço Cron, tick em ms), **não** ticks concorrentes — se a topologia mudar,
  usar índice único parcial `(recurrence_id, date) WHERE recurrence_id IS NOT
  NULL` (considerado e adiado). Teto de segurança por regra loga (não silencia).
  **Gotcha de teste**: o driver `pg` devolve coluna `date` como `Date`, não
  string — comparar `next_run_date` no e2e exige `::text` no SELECT.
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
- **M8 reports — padrões confirmados**: módulo read-only `reports` (1 feature =
  1 módulo); agregação no `DrizzleReportRepository` via `to_char(date,'YYYY-MM')`
  + `groupBy(type)` (reusa padrão `monthTotals` do overview); pizza/pessoa só no
  mês corrente; gasto por pessoa via `person_id` (não `created_by` nem rateio);
  e2e usa datas relativas a `new Date()` (janela rolling de 6m); frontend Recharts
  em `features/reports/` com `queryKeys.reports.{monthly,annual}`.
- **Gotcha — empty-state não pode esconder navegação**: a vista anual é
  navegável por ano; o `hasNoData` global da `ReportsPage` inicialmente também
  cobria a anual, escondendo a `AnnualView` (e seus botões ‹ ›) sempre que o
  ano corrente vinha vazio — o usuário ficava sem como voltar a um ano com
  dados. Corrigido: `hasNoData` só se aplica à vista **mensal** (janela fixa,
  sem navegação); a anual sempre renderiza `AnnualView`, que trata "sem
  movimentação neste ano" internamente sem esconder a navegação. Regra geral:
  qualquer empty-state que substitua uma view inteira precisa considerar se
  essa view tem estado navegável (período/página) que o usuário precisaria
  para sair do estado vazio.
- **`apps/frontend/e2e/manual-qa-battery.e2e.ts` não tem `afterAll` de limpeza**
  (arquivo exploratório, roda isolado sob demanda, não faz parte da suíte
  regular). Cada execução deixa um household `"Lar QA Manual..."` + usuários
  `@e2e.larmony.local` no Supabase local **sem remover depois** — na próxima
  vez que qualquer spec padrão (`*.e2e-spec.ts` do backend) tentar
  `cleanupByEmailPattern`, a query falha com
  `violates foreign key constraint "transactions_created_by_users_id_fk"`
  porque o cleanup batch deleta por e-mail, não por suite, e a transação órfã
  ainda referencia o usuário. Sintoma: **todas** as suítes e2e do backend
  passam nos testes mas a suíte inteira aparece como `failed` (erro só no
  `afterAll`). Fix: `DELETE FROM households WHERE name LIKE 'Lar QA Manual%'`
  (cascade limpa o resto) antes de rodar a suíte de novo. Não rodar esse
  arquivo como parte da verificação de rotina de um milestone.
- **Dev Turbopack — gotcha (2026-07-07)**: cache corrompido em `apps/frontend/.next`
  pode fazer rotas dinâmicas (`/dashboard/household/[slug]/*`) retornarem 404
  (`PageNotFoundError: Cannot find module for page`). O `404.tsx` redireciona tudo
  para `/dashboard/households` — parece bug de auth/layout, mas é rota ausente no
  dev. Fix: `pnpm --filter frontend dev:reset` (ou apagar `.next` + reiniciar).
  `pnpm build` continua verde; CI não é afetado.

## Pós-v1

| Feature | Estado | Notas |
|---|---|---|
| Onboarding (tour guiado) | **✅ entregue (2026-07-08)** | Backend: `users.onboarding` (jsonb `{ [tourKey]: maiorVersãoVista }`), `POST /auth/me/onboarding` (merge atômico via `||`). Frontend: `features/onboarding/` — registro central `lib/tours.ts` (steps `modal` \| `spotlight`, versionados), `OnboardingProvider` (auto-start: tour `sidebar` primeiro, depois o da aba via `route-tour.ts`; tour do formulário de transação dispara manualmente ao abrir o Sheet), `TourRenderer` + componentes custom (sem lib externa — Dialog para modal, overlay+card fixo para spotlight, alvo localizado por `data-tour`, pulado se ausente no DOM). Monta em `HouseholdLayout`. i18n em `public/locales/{pt-BR,en}/onboarding.json`, precisa constar em **todo** `makeI18nProps([...])` das páginas do household (o tour do menu pode disparar em qualquer uma). Bump de `version` em `tours.ts` = re-exibe para quem já viu. |

**Gotcha — migration criada não é migration aplicada**: gerar o arquivo SQL (`drizzle-kit generate` ou manual) e registrar no `_journal.json` não roda a migration no Postgres local — é preciso `pnpm --filter backend db:migrate` explicitamente. Sintoma: `GET /auth/me` (ou qualquer query que toque a coluna nova) quebra com 500 "Failed query" mesmo com o código do backend correto, porque a coluna não existe de fato na tabela. Sempre confirmar com `\d <tabela>` no psql (ou rodar a migration) antes de testar uma feature que depende de uma migration nova.

## v1.1 — Próximos milestones

Specs-esqueleto em `docs/product/features/` (mesmo contrato do v1: escopo +
regras; plano de implementação + ADR no kickoff de cada um). Ordem M10 → M11 →
M12 (M11 depende do limite vigente do M10 para "orçamento estourado"; M12
define o *quando* dos jobs que o M11 cria).

| M | Feature | Spec | Resumo | ADR |
|---|---|---|---|---|
| M10 | Orçamentos recorrentes/versionados | [11-orcamentos-recorrentes.md](../docs/product/features/11-orcamentos-recorrentes.md) | **✅ entregue (2026-07-10)** — `budgets` vira série por categoria + `budget_versions` (histórico), limite resolvido on-read (`DISTINCT ON`, nunca materializado); editar = upsert da versão do mês corrente (nunca toca o passado); série encerrada (`ended_from`) → 422 ao editar; remover sempre encerra (nunca hard delete); migration `0006` sem backfill de valores | [ADR-0022](adr/0022-budget-series-versions.md) |
| M11 | Notificações multicanal + preferências | [12-notificacoes-multicanal.md](../docs/product/features/12-notificacoes-multicanal.md) | **✅ entregue (2026-07-11)** — `DispatchNotificationUseCase` único ponto de entrada (in-app sempre + e-mail real + SMS/WhatsApp ports stub atrás de flag); `notification_preferences` (matriz por usuário) + `notification_dedup` (tabela dedicada, household-scoped); 5 eventos: lembrete migrado + meta atingida + orçamento estourado (M10) + lançamento automático + relatório mensal (cron `monthly-report`); `NotificationsSection` no Account | [ADR-0023](adr/0023-notification-dispatcher-multicanal.md) |
| M12 | Disparos com horário + timezone | [13-cron-horario-timezone.md](../docs/product/features/13-cron-horario-timezone.md) | **✅ entregue (2026-07-11)** — timezone + hora **por lar** (`households.timezone` IANA + `notification_hour`, migration 0008); tick segue burro, cada job resolve "agora" no fuso do lar via helper `tz-clock` (date-fns-tz): engine gera na data local (teto UTC+14 + corte fino), lembrete/relatório saem a partir da hora local, dedup em data local; `currentPeriodStart` dos orçamentos migrado (cumpre ADR-0022). **Por-lar, não por-usuário** (hora/dedup por-destinatário → pós-v1.1). Front: fuso auto-detectado na criação + seletor de fuso/hora nas Configurações | [ADR-0024](adr/0024-cron-timezone-household.md) |
| M13 | Open Finance (conexão bancária) | [14-open-finance.md](../docs/product/features/14-open-finance.md) | Importação/conciliação automática via agregador licenciado (Pluggy/Belvo/Klavi — escolher na Fase 0 com PoC + ADR); port `IBankAggregator`, dedup idempotente, consentimento LGPD; destrava plano "Conectado" da assinatura B2C (decisão comercial 2026-07-10: freemium + Premium R$ 14,90/mês por lar). Pré-requisito: entitlements/billing (Stripe) | ADR no kickoff |

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
