# Migrations — Larmony backend

Migrator próprio (`src/database/migrator.ts`), executado via:

```bash
pnpm db:migrate          # = tsx src/database/migrator.ts up   (aplica pendentes)
pnpm exec tsx src/database/migrator.ts status    # estado aplicado/pendente
pnpm exec tsx src/database/migrator.ts down [n]  # rollback (exige .down.sql)
pnpm exec tsx src/database/migrator.ts baseline  # re-baseline pós-squash (ver abaixo)
```

O `up` usa o `migrate()` padrão do drizzle-orm, que lê `meta/_journal.json` + os
arquivos `NNNN_*.sql` e aplica os que ainda não estão em `drizzle.__drizzle_migrations`.

## Squash / baseline (fase pre-production, 2026-07-13)

A cadeia herdada **0000–0011 foi squashada** num único **`0000_baseline`**
(concatenação literal dos arquivos originais, na mesma ordem — equivalência
por construção; histórico preservado no git). O `when` do baseline é novo, e o
`.down.sql` concatena os downs originais em ordem reversa.

- **Banco NOVO** (CI, dev fresh): nada muda — `up` roda o baseline.
- **Banco EXISTENTE** (staging, dev local já migrado pela cadeia antiga):
  rodar **UMA VEZ** `migrator.ts baseline` — marca o baseline como aplicado
  SEM executar SQL (limpa as rows antigas de `__drizzle_migrations` e insere
  a nova). O comando recusa bancos sem o schema (`public.users`).
- Nunca rode `baseline` num banco vazio (use `up`).

## ⚠️ Snapshots e `drizzle-kit generate` (DX-2)

Não há snapshots (`meta/*_snapshot.json` foi removido no squash). Todas as
migrations deste projeto são **SQL custom escritas à mão**.

Consequência: **não rode `drizzle-kit generate`** — sem snapshot ele geraria
um create-everything divergente. Se algum dia for necessário voltar ao
generate, realinhe o snapshot ao estado real (introspect) antes de confiar no
diff.

Regra prática:

- **Mudança de schema simples e padrão** → escreva o SQL à mão como nova migration
  custom (passos abaixo). É o caminho default deste projeto.

## Como adicionar uma migration custom

1. Crie `drizzle/migrations/NNNN_descricao.sql` (use `--> statement-breakpoint` entre
   statements). Opcionalmente `NNNN_descricao.down.sql` para permitir rollback.
2. Adicione a entrada correspondente em `meta/_journal.json` (`idx` sequencial, `when`
   crescente, `tag` = nome do arquivo sem extensão, `breakpoints: true`).
3. `pnpm db:migrate` e confira com `... migrator.ts status`.

> O `idx`/`tag` no journal precisam casar exatamente com o arquivo — o hash gravado em
> `__drizzle_migrations` é o `sha256` do conteúdo do `.sql`.
