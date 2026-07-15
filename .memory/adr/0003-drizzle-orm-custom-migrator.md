---
name: adr-0003-drizzle-orm-custom-migrator
description: Decision to use Drizzle ORM with a custom migrator script that supports rollback
metadata:
  type: project
---

# ADR-0003: Drizzle ORM with Custom Migrator for Rollback Support

**Date:** 2026-06-06
**Status:** Accepted â€” re-ratified for Larmony on 2026-07-04

## Context

NestJS needs an ORM for PostgreSQL. The project uses Supabase (PostgreSQL), is TypeScript-first, and needs schema-as-code with migration history tracking. Rollback capability is a hard requirement.

## Decision

Use **Drizzle ORM** (`drizzle-orm/node-postgres` + `pg` driver) with a **custom migration runner** (`src/database/migrator.ts`) instead of Drizzle's native `migrate()` for production use.

Drizzle's built-in `migrate()` is used internally for the `up` path, but the migrator also implements `down` and `status` commands that Drizzle does not provide natively.

## Alternatives considered

- **Prisma** â€” Too opinionated, generates its own client, poor Supabase RLS integration, heavyweight migrations
- **TypeORM** â€” Mature but decorator-heavy and poorly typed; known issues with complex joins
- **Drizzle native migrate only** â€” No rollback support; rejected because schema mistakes during development would require manual DB surgery

## Consequences

- **Schema-as-code** in `src/database/schema/` â€” single source of truth for types AND migrations
- **Every migration requires a companion `.down.sql`** file before it can be rolled back
- **Hash computation**: The migrator hashes the raw `.sql` file content (`sha256(rawContent)`) â€” this must match Drizzle's internal hash. Do NOT modify generated `.sql` files after creation.
- **Migration commands** (run from `apps/backend/`):
  - `pnpm db:generate` â€” drizzle-kit generate (creates `.sql`)
  - `pnpm db:migrate` â€” apply pending migrations
  - `pnpm db:rollback [n]` â€” roll back last n migrations (requires `.down.sql`)
  - `pnpm db:status` â€” show applied/pending state
- **Drizzle Studio** available via `pnpm db:studio` for visual schema inspection
- The `DRIZZLE` injection token (a Symbol) is the DI handle for the DB connection in NestJS modules

## Key implementation detail

The `computeMigrationHash` function must hash the raw SQL file content without modification. An early bug split on `"--> statement-breakpoint"` and rejoined â€” this produced a different hash than Drizzle stored. Fixed to: `createHash("sha256").update(rawSql).digest("hex")`.

## Adendo (2026-07-13) — Squash 0000..0011 ? 0000_baseline + comando `baseline`

A cadeia herdada foi squashada num único `0000_baseline` (fase pre-production):
concatenação LITERAL dos `.sql` originais na mesma ordem (equivalência por
construção — o `migrate()` do drizzle já aplicava a cadeia inteira numa única
transação) e downs concatenados em ordem reversa. Snapshots removidos
(`drizzle-kit generate` já estava aposentado a favor de SQL manual).

Novo comando `migrator.ts baseline` para bancos JÁ migrados pela cadeia antiga
(staging/devs): limpa `drizzle.__drizzle_migrations` e insere a row do baseline
(hash+when) SEM executar SQL; recusa bancos sem `public.users`. Bancos novos
seguem pelo `up` normal. Racional do porquê isso é necessário: o `up` do
drizzle decide por watermark de timestamp (não por hash), então um banco antigo
ignoraria/duplicaria o baseline sem o re-baseline explícito.

Verificado: (1) restore do estado antigo real (dump P-3) ? `baseline` ? `status`
? e `up` no-op, dados intactos; (2) banco recriado do zero (`supabase db reset`)
? `up` aplica o baseline ? suíte e2e completa passou (exceto 2 flakes
pré-existentes de meia-noite no spec de scheduled-transactions, alheios ao
schema — runner UTC-3 vs lar UTC na janela 21h–00h; verdes no CI/UTC).

As regras originais continuam: nunca editar `.sql` aplicado; todo migration com
`.down.sql`; hash = sha256 do arquivo cru.
