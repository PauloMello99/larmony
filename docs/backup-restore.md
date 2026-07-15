# Backup & Restore — estratégia e runbook

Fase pre-production (P-3). Antes disto, backup/restore nunca tinha sido
demonstrado no projeto (staging em Supabase free = **sem backup automático
nenhum**; prod planejada em Supabase pago).

## Estratégia por ambiente

| Ambiente | Backup | Restore |
|---|---|---|
| **Produção** (Supabase Pro) | Daily backups gerenciados (7 dias no Pro). **Recomendado**: ativar o add-on **PITR** (point-in-time, granularidade de segundos; exige compute Small+) quando houver receita — daily backup ainda perde até 24h de dados. | Dashboard Supabase → Database → Backups → restore; ou PITR p/ o instante desejado. |
| **Staging** (Supabase free) | **Nenhum automático do provedor.** Dump lógico sob demanda via `pnpm --filter backend db:backup` — obrigatório **antes de toda migration/deploy relevante** (o passo de squash/baseline desta fase é o exemplo canônico). | `pg_restore` (abaixo). |
| **Local** | `pnpm --filter backend db:backup` quando quiser um snapshot (ex.: antes de mexer em migrations). | `pg_restore` (abaixo). |

Regras:
- Dumps contêm **PII** → a pasta `apps/backend/backups/` está no `.gitignore`
  e **nunca** deve ser versionada nem enviada a serviços de terceiros sem
  criptografia. Armazenamento off-site é decisão manual (ex.: drive pessoal
  criptografado), não automatizado de propósito.
- Formato: `pg_dump -Fc --no-owner` (custom) — restaurável seletivamente com
  `pg_restore`, portátil entre versões de Postgres.

## Como gerar um backup

```bash
pnpm --filter backend db:backup
# → apps/backend/backups/larmony-<db>-<timestamp>.dump
```

O script (`apps/backend/scripts/db-backup.ts`) lê `DATABASE_URL` do
`apps/backend/.env`:
- com `pg_dump` no PATH → usa direto (funciona apontando p/ staging/prod
  trocando a `DATABASE_URL`);
- sem client tools (dev Windows) → fallback automático via
  `docker exec supabase_db_larmony pg_dump ...` (container configurável via
  `SUPABASE_DB_CONTAINER`).

## Como restaurar (procedimento verificado)

Local/staging (banco alvo NOVO — nunca por cima do original):

```bash
# 1. copiar o dump para o container do Postgres
docker cp apps/backend/backups/<arquivo>.dump supabase_db_larmony:/tmp/restore.dump

# 2. criar o banco de destino
docker exec supabase_db_larmony psql -U postgres -c "CREATE DATABASE larmony_restore;"

# 3. restaurar (erros no schema `vault` do Supabase são esperados e ignoráveis)
docker exec supabase_db_larmony pg_restore -U postgres -d larmony_restore \
  --no-owner --no-privileges /tmp/restore.dump

# 4. validar contagens (comparar com o original)
docker exec supabase_db_larmony psql -U postgres -d larmony_restore -c \
  "SELECT count(*) FROM public.users; SELECT count(*) FROM public.transactions;"
```

Para assumir o restore como banco ativo: apontar `DATABASE_URL`/
`DATABASE_APP_URL` para o banco restaurado (ou renomear os databases) e
recriar o role RLS se necessário (`app_user` vem nas migrations).

Produção (Supabase Pro): preferir o restore gerenciado do dashboard; o fluxo
`pg_restore` acima vale para restaurar um dump lógico num projeto novo
(ver docs Supabase "Restore to a new project").

## Registro de drills

| Data | Origem | Resultado |
|---|---|---|
| 2026-07-13 | Local (Supabase dev, dump 1,6 MB via fallback docker) | ✅ Restore em `larmony_drill` — contagens idênticas em users (5), households (6), subscriptions (6), transactions (253), budgets (8), audit_logs (7134). Únicos erros: 2 no schema `vault` (secrets internos do Supabase, não usados pela aplicação). Drill DB e dump removidos após validação. |

> Repetir um drill: antes de cada mudança estrutural grande e ao provisionar
> produção (validar o restore gerenciado do Supabase Pro pelo menos uma vez).
