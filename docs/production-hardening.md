# Produção — hardening manual (runbook do fundador)

Passos que **só** você deve executar ao provisionar produção (Railway env
`production` + Supabase pago). Não são automatizáveis com segurança e por isso
ficam fora do boot/deploy. Complementa `docs/deployment.md` (§Production) e a
lista "Necessário para produção" de `docs/product/precificacao-e-viabilidade.md`.

> Contexto: staging já provisionado; produção **intocada** por decisão. Estes
> itens são pré-requisitos do 1º deploy de produção.

---

## 1. Rotacionar a senha do role `app_user` (RLS runtime)

**Por quê.** O baseline cria o role de runtime com uma senha de
desenvolvimento hardcoded (`apps/backend/drizzle/migrations/0000_baseline.sql`):

```sql
CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
```

`app_user` é o role NOBYPASSRLS que o backend usa em runtime (o `RlsContext`
faz `set_config('request.jwt.claims', ...)` por request). Em produção essa
senha **precisa** ser forte e diferente — ela é o que separa o runtime
(sujeito a RLS) do `postgres`/`service_role` (BYPASSRLS).

**Passos (uma vez, no banco de produção):**

1. Gere uma senha forte (ex.: `openssl rand -base64 32`).
2. No SQL editor do Supabase de produção (ou `psql` com o role `postgres`):
   ```sql
   ALTER ROLE app_user PASSWORD '<senha-forte-gerada>';
   ```
3. No serviço **backend** do Railway (env `production`), atualize
   `DATABASE_APP_URL` para usar a mesma senha:
   ```
   postgresql://app_user:<senha-forte-gerada>@<host-session-pooler>:5432/postgres
   ```
   (host = **Session pooler** do Supabase de produção, porta 5432, igual ao
   `DATABASE_URL`, só trocando role/senha.)
4. Redeploy do backend e valide (ver gotcha abaixo).

> ⚠️ **Gotcha (silencioso).** Se `DATABASE_APP_URL` tiver senha errada, o boot
> e o healthcheck `/health` passam **normalmente** (o health não usa o pool
> `app_user`), mas **toda request autenticada** falha com `28P01
> (password authentication failed)`. Valide fazendo login + abrindo o
> dashboard de um household, não só o `/health`. Ref: `.memory/deployment.md`.

> A senha `app_user_dev` de staging/dev pode permanecer — o gate é só produção.

---

## 2. MCPs de produção em modo read-only

**Por quê.** Os MCPs de staging (`.mcp.json`) misturam leitura e escrita. Para
produção, o acesso via MCP deve ser **read-only** — nunca deixar um agente
escrever/migrar/deployar no banco ou na infra de produção por engano.

Estado atual dos servidores usados (referência):

| MCP | Read-only? | Observação |
|---|---|---|
| `postgres-*` (`@modelcontextprotocol/server-postgres`) | **Sim, por design** | O tool `query` roda todo SQL em `BEGIN TRANSACTION READ ONLY` — não consegue escrever. |
| `supabase-*` (hosted `mcp.supabase.com`) | Não por padrão | Precisa do flag/param read-only (abaixo). |
| `railway` (hosted `mcp.railway.com`) | **Não** (deploy/variables/scale são escrita) | Sem escopo read-only nativo. |
| `stripe` | Restringível | Já usa `${STRIPE_RESTRICT_KEY}` (chave restrita). |

**Entradas a adicionar no `.mcp.json`** (quando o projeto Supabase de produção
existir — troque `<prod_project_ref>` e use **substituição por env**, nunca
senha hardcoded):

```jsonc
{
  "mcpServers": {
    // Postgres prod — read-only por design (query em READ ONLY tx).
    // Defesa em profundidade: use um role Postgres SÓ-LEITURA (ver abaixo),
    // não o `postgres`. Connection string via env, nunca hardcoded.
    "postgres-production": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_PROD_READONLY_URL}"]
    },

    // Supabase prod — force read-only com o flag explícito (self-hosted npx),
    // que é a garantia mais forte que o param da URL hospedada.
    "supabase-production": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=<prod_project_ref>"
      ],
      "env": { "SUPABASE_ACCESS_TOKEN": "${SUPABASE_PROD_PAT}" }
    }
  }
}
```

**Role Postgres só-leitura para o MCP** (rode no banco de produção; usado no
`DATABASE_PROD_READONLY_URL`):

```sql
CREATE ROLE mcp_readonly LOGIN PASSWORD '<senha-forte>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_readonly;
```

**Railway em produção:** o MCP hospedado não tem escopo read-only (expõe
deploy/variables/scale). Recomendação: **não** adicionar um MCP `railway`
apontando para produção — opere produção deliberadamente pela CLI
(`railway ... --environment production`), evitando escrita acidental por
agente. Se precisar de leitura via MCP, trate como read/write e confirme cada
ação.

---

## 3. Higiene de segredos no `.mcp.json`

- `.mcp.json` hoje é **untracked** no git (não commitado) **e não está no
  `.gitignore`** → um `git add -A` distraído o commitaria com segredos. Ação:
  adicionar `.mcp.json` ao `.gitignore` (ou manter só um `.mcp.example.json`
  com placeholders).
- A entrada `postgres-staging` tem a **senha do role `postgres` de staging em
  texto puro** na connection string. Prefira `${DATABASE_STAGING_URL}` por env
  como as demais entradas. Se essa senha já vazou (arquivo compartilhado),
  rotacione-a no Supabase de staging.
- Toda entrada de produção deve usar `${VAR}` — **nunca** hardcode de senha/URL
  de produção.

---

## Checklist rápido (produção)

- [ ] `ALTER ROLE app_user PASSWORD ...` no banco de prod + `DATABASE_APP_URL` atualizada no Railway.
- [ ] Validado login + dashboard (não só `/health`) — sem `28P01`.
- [ ] Role `mcp_readonly` criado; `postgres-production` MCP read-only via env.
- [ ] `supabase-production` MCP com `--read-only`.
- [ ] Sem MCP `railway` de produção (ou tratado como read/write consciente).
- [ ] `.mcp.json` no `.gitignore`; segredos por `${VAR}`; senha `postgres` de staging rotacionada se necessário.
- [ ] Webhook Stripe **live** registrado + `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` de produção (live mode) — análogo ao staging (ver `docs/deployment.md`).
