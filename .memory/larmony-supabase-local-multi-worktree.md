---
name: larmony-supabase-local-multi-worktree
description: Como rodar `supabase start` do larmony quando outro projeto Supabase local já ocupa as portas 54321-54327
metadata:
  type: feedback
---

`supabase/config.toml` do larmony fixa `project_id = "larmony"` e portas
literais (API 54321, DB 54322, Studio 54323, Inbucket 54324, Analytics
54327) — **é possível rodar dois projetos Supabase locais em paralelo no
mesmo host**, mas cada um precisa de portas distintas (o CLI não
resolve conflito sozinho, só falha com "port is already allocated").

**Workaround usado (sessão 2026-08-23)**: editar `supabase/config.toml`
temporariamente, somando +1000 em todas as portas (`55321`, `55322`,
`55320` shadow, `55329` pooler, `55323` studio, `55324` inbucket,
`55327` analytics), rodar `npx supabase start`, e **reverter o arquivo
antes de finalizar a sessão** — é um arquivo versionado no git, a mudança
de porta não deve ir pro commit/PR (afetaria todo mundo que usa a porta
default). `apps/backend/.env` (gitignored) aponta `DATABASE_URL`/
`DATABASE_APP_URL`/`SUPABASE_URL` pras portas novas enquanto durar a sessão.

**Gotcha relacionado — volume compartilhado entre worktrees**: como o
`project_id` é o mesmo (`"larmony"`) em qualquer worktree deste repo, o
Docker volume do Postgres também é compartilhado — um `supabase start`
numa worktree pode reidratar um snapshot ("Starting database from
backup...") com migrations de uma sessão anterior num estado diferente
do `drizzle/migrations/` atual (`migrator.ts status` mostra migrations
"no meio" da cadeia como pending mesmo com uma mais nova já aplicada).
Nesse caso, `npx supabase db reset` (recria o banco do zero a partir do
zero, roda `supabase/migrations/*`, NÃO roda a cadeia custom do Drizzle)
seguido de `pnpm db:migrate` resolve — seguro em ambiente local
(dado descartável), nunca fazer isso apontando pra staging/prod.

Ver também [[jest-e2e-testmatch-worktree-windows]].
