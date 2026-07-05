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
    ├── organizations/             # multi-tenant shell (→ vira households na fundação)
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
`CRON_SECRET`), chamado pelo service Cron do Railway a cada 5 minutos. Jobs de
domínio são registrados no array `jobs` do `InternalCronController` — hoje vazio;
o primeiro job do Larmony será `send-bill-reminders` (M7).

### Migrations (ver ADR-0003)

| Comando | Ação |
|---|---|
| `pnpm db:generate` | drizzle-kit generate → cria `.sql` em `drizzle/migrations/` |
| `pnpm db:migrate` | aplica migrations pendentes |
| `pnpm db:rollback [n]` | reverte n migrations (requer `.down.sql` companheiro) |
| `pnpm db:status` | exibe estado aplicado/pendente |

**Regra crítica de hash**: o migrator faz `sha256(rawSqlContent)` — não modifique o `.sql` gerado após criação.

**Estado transitório**: o schema (`database/schema/`) e as migrations atuais ainda
são os herdados do ink-ops (tabelas de estúdio órfãs, sem módulos que as usem).
Serão substituídos por um **baseline squashado** do domínio Larmony na fundação
do produto (ver [[roadmap]] M1) — não criar migrations novas sobre o schema velho.

### Supabase local

- Porta PostgreSQL: `54322`, Studio: `54323`, API: `54321`
- `supabase start` / `supabase stop` na raiz do monorepo
- Credentials locais em `apps/backend/.env` (gitignored)

## Frontend — feature-based (ver ADR-0007)

- `src/features/<feature>/` com `components/`, `hooks/`, `schemas/`, `types/`, `index.ts`
- `src/pages/` só monta features + layouts (`AuthGuard`, `OrgLayout`)
- Estado servidor: TanStack React Query; keys centralizadas em
  `src/infrastructure/query/query-keys.ts`
- O frontend **não** fala com Supabase — só com a API do backend
  (sessão própria em `localStorage.larmony_session`)

## Tipagem

- TypeScript strict mode em todos os packages
- `noUncheckedIndexedAccess` ativo
- `isolatedModules` ativo (compatível com esbuild/SWC)
- Supabase types em `@repo/types` (gerado via `/supabase-types` command)
- Drizzle inferred types via `typeof schema` — fonte separada dos Supabase types, não misturar
