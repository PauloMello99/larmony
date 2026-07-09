---
name: architecture
description: Arquitetura do Larmony — estrutura do monorepo, padrão NestJS Clean Architecture, Drizzle migrations, Supabase local, pipeline Turborepo
metadata:
  type: architecture
---

# Arquitetura do Larmony

## Estrutura de pastas

```
larmony/
├── apps/
│   ├── backend/              # NestJS API (@repo/eslint-config/node)
│   └── frontend/             # Next.js frontend (@repo/eslint-config/next)
├── packages/
│   ├── eslint-config/        # @repo/eslint-config
│   ├── typescript-config/    # @repo/typescript-config
│   ├── ui/                   # @repo/ui (React components)
│   ├── types/                # @repo/types (Supabase + shared types)
│   └── utils/                # @repo/utils (cn, etc.)
├── .memory/                  # Banco de memória do Claude Code
│   ├── adr/                  # ADRs (versionados em git)
│   └── sessions/             # Notas de sessão (gitignored)
└── bin/scripts/rag/          # Scripts de indexação RAG
```

## Turborepo task pipeline

| Task | Dependência | Cache | Saídas |
|---|---|---|---|
| `build` | `^build` | sim | `.next/**`, `dist/**` |
| `lint` | `^lint` | sim | — |
| `check-types` | `^check-types` | sim | — |
| `dev` | nenhuma | não | — (persistente) |

## Convenções de pacotes

- Cada app/package tem `eslint.config.js` estendendo `@repo/eslint-config/<tipo>`
- Cada package tem `tsconfig.json` estendendo `@repo/typescript-config/<tipo>`
- Imports internos via workspace alias: `@repo/<nome>`
- `@repo/ui` exporta raw `.tsx` (sem build step) — apps importam diretamente

## Backend — estrutura NestJS

Padrão: **Clean Architecture** com use-case por operação (ver ADR-0004 + ADR-0006).

Cada módulo de feature tem quatro camadas explícitas:

```
src/modules/<feature>/
├── domain/                    # zero imports externos — entidades, interfaces, exceções
├── application/
│   ├── ports/                 # interfaces de serviços externos (IAuthProvider etc.)
│   └── use-cases/             # um arquivo por operação
├── infrastructure/
│   ├── persistence/           # DrizzleXxxRepository + XxxMapper
│   └── <feature>-infrastructure.module.ts  # binding Symbol → DrizzleImpl
└── <feature>.module.ts        # imports infra, providers use-cases, exports
```

Regra crítica: **use-cases injetam interfaces via Symbol token, nunca DRIZZLE direto**.

```
src/
├── main.ts                        # bootstrap + DomainExceptionFilter + HttpExceptionFilter
├── app.module.ts
├── common/
│   ├── exceptions/domain.exception.ts     # base abstract DomainException
│   ├── filters/                           # domain-exception + http-exception filters
│   ├── guards/cron-secret.guard.ts        # protege POST /internal/cron/tick
│   ├── interceptors/rls.interceptor.ts    # set_config('request.jwt.claims') por request
│   ├── cache/                             # cache in-memory (ADR-0011)
│   └── telemetry/                         # Better Stack (ADR-0014)
├── database/
│   ├── database.module.ts         # @Global(), exports DRIZZLE symbol
│   ├── migrator.ts
│   └── schema/                    # persistence models Drizzle (NÃO é domain layer)
└── modules/
    ├── auth/                      # sign-up/in/out, refresh, forgot/reset; IAuthProvider port
    ├── user/                      # get-me etc.
    ├── households/                # tenancy (multi-lar), membros, convites, overview (M3)
    ├── categories/                # CRUD de categorias (M2)
    ├── transactions/              # CRUD + filtros (M2) + parcelamento/rateio (M4)
    ├── budgets/                   # CRUD de orçamentos + spending derivado (M5)
    ├── goals/                     # CRUD de metas + aportes; savedCents derivado por SUM (M6)
    ├── bills/                     # CRUD + lançar como transação + job de lembrete (M7 completo)
    ├── reports/                   # agregações read-only mensal/anual (M8)
    ├── recurrences/               # regras de recorrência + engine no cron (M9)
    ├── admin/                     # super_admin de plataforma (ADR-0013)
    ├── mail/                      # Resend + React Email (ADR-0012)
    ├── notifications/             # notificações in-app + e-mail
    ├── audit/                     # audit log de plataforma
    ├── internal-cron/             # POST /internal/cron/tick (5min) — jobs de domínio
    └── health/                    # módulo simples de referência
```

### Módulos globais NestJS

- `ConfigModule.forRoot({ isGlobal: true })` — env vars via `ConfigService`
- `DatabaseModule` — `@Global()`, injeta pool PostgreSQL + Drizzle via token `Symbol("DRIZZLE")`
- Feature modules não precisam importar nenhum dos dois
- `DRIZZLE` só é injetado diretamente em `DrizzleXxxRepository` (infrastructure), nunca em use-cases

### Cron unificado

Um único endpoint `POST /internal/cron/tick` (protegido por `CronSecretGuard` +
`CRON_SECRET`), chamado pelo service Cron do Railway (schedule `*/15`). Jobs de
domínio se registram por **decorator + DiscoveryService** (padrão do
`@nestjs/schedule`) — o módulo `internal-cron` não muda por feature:

```ts
// no módulo da feature (ex.: scheduled-transactions), como provider normal:
@CronJobName("scheduled-transactions-reminders")
@Injectable()
export class ScheduledEntriesRemindersJob implements CronJob {
  constructor(private readonly useCase: SendScheduledEntryRemindersUseCase) {}
  run() { return this.useCase.execute(); }
}
```

`CronJobsService` (`modules/internal-cron/cron-jobs.service.ts`) descobre os
providers decorados no boot; o tick roda todos com isolamento de erro e retorna
`{ ok, jobs: [{name, status, durationMs}] }`.

| Job | Status |
|---|---|
| `scheduled-transactions-engine` (gera ocorrências `auto`) | ✅ entregue (ADR-0020, 2026-07-09 — ex-`recurrence-engine` do M9) — `modules/scheduled-transactions/application/jobs/scheduled-entries-engine.job.ts`; gera as ocorrências vencidas (`next_run_date <= hoje`) das entradas `posting_mode='auto'` ativas, catch-up bounded, **avança o cursor ANTES de inserir** (gaps-over-dups); grava via `CreateGeneratedTransactionUseCase` (DRIZZLE_ADMIN, sem auditoria) |
| `scheduled-transactions-reminders` (lembrete de entradas `manual`) | ✅ entregue (ADR-0020, 2026-07-09 — ex-`send-bill-reminders` do M7) — `modules/scheduled-transactions/application/jobs/scheduled-entries-reminders.job.ts`; dedup **por dia-calendário** (não por mês — corrige bug latente do M7 para cadências não-mensais) via `reminder_last_sent_at` gravado ANTES do envio; janela = próxima ocorrência (calculada estatelessmente por `nextManualOccurrence`) − hoje == reminderDaysBefore |

### Migrations (ver ADR-0003)

| Comando | Ação |
|---|---|
| `pnpm db:generate` | drizzle-kit generate → cria `.sql` em `drizzle/migrations/` |
| `pnpm db:migrate` | aplica migrations pendentes |
| `pnpm db:rollback [n]` | reverte n migrations (requer `.down.sql` companheiro) |
| `pnpm db:status` | exibe estado aplicado/pendente |

**Regra crítica de hash**: o migrator faz `sha256(rawSqlContent)` — não modifique o `.sql` gerado após criação.

### Padrão de conexão para escrita autenticada (DRIZZLE vs DRIZZLE_ADMIN)

Confirmado ao construir `categories`/`transactions` (M2): **toda escrita de um
módulo household-scoped usa `DRIZZLE`** (a conexão RLS-enforced — o
`RlsInterceptor`, global, seta `request.jwt.claims = {sub: authId}` antes do
handler rodar, então `is_household_member(household_id)` é avaliado pelo
Postgres em cada INSERT/UPDATE/DELETE). Não é preciso reverificar membership
no use-case quando o controller já usa `HouseholdMembershipGuard`.

`DRIZZLE_ADMIN` (BYPASSRLS) fica só para os dois casos que o RLS não cobre:
bootstrap (sign-up, criar o primeiro `household_membership` antes de existir
qualquer membership) e jobs de cron (sem request context, logo sem claims).

Resolução de `authId` (Supabase auth id) → `users.id` (interno, usado em FKs
como `transactions.createdBy`/`personId`) é feita **no controller**, via
`GetMeUseCase`, e passada como parâmetro simples para o use-case — nunca o
use-case resolve isso sozinho (mantém use-cases livres de import de `AuthUser`).

**Exceção do cron (M9)**: escrita disparada por job (sem request context) **não
pode** usar `DRIZZLE` (RLS nega sem claims). Por isso `DrizzleTransactionRepository`
injeta também `DRIZZLE_ADMIN` e expõe `createGenerated` (usado só pelo
recurrence-engine), espelhando o split `this.db`/`this.admin` de `DrizzleBillRepository`.
O `CreateGeneratedTransactionUseCase` (exportado pelo `TransactionsModule`) é o
ponto de reuso cross-módulo para o cron — sem auditoria (evento de sistema).

### Supabase local

- Porta PostgreSQL: `54322`, Studio: `54323`, API: `54321`
- `supabase start` / `supabase stop` na raiz do monorepo
- Credentials locais em `apps/backend/.env` (gitignored)

## Frontend — feature-based (ver ADR-0007)

- `src/features/<feature>/` com `components/`, `hooks/`, `schemas/`, `types/`, `index.ts`
- `src/pages/` só monta features + layouts (`AuthGuard`, `HouseholdLayout`)
- Estado servidor: TanStack React Query; keys centralizadas em
  `src/infrastructure/query/query-keys.ts`
- O frontend **não** fala com Supabase — só com a API do backend
  (sessão própria em `localStorage.larmony_session`)
- **Reports (M8)**: `features/reports/` — Recharts (bar/pie), toggle Mensal/Anual,
  `ReportTooltip` com `formatCentsToBRL`; reusa `usePrefersReducedMotion` do admin.

### Dev local — gotcha Turbopack

Se rotas `/dashboard/household/[householdSlug]/*` retornam 404 no `next dev`
(`PageNotFoundError: Cannot find module for page`), o `404.tsx` redireciona para
`/dashboard/households` (parece loop de auth). Corrigir com
`pnpm --filter frontend dev:reset` (limpa `.next`). Build de produção OK.

## Tipagem

- TypeScript strict mode em todos os packages
- `noUncheckedIndexedAccess` ativo
- `isolatedModules` ativo (compatível com esbuild/SWC)
- Supabase types em `@repo/types` (gerado via `/supabase-types` command)
- Drizzle inferred types via `typeof schema` — fonte separada dos Supabase types, não misturar
