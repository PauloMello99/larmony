# Deploy no Railway

O projeto Larmony é um monorepo com três apps independentes. Cada um vira um **Service** separado no Railway, todos apontando para o mesmo repositório.

```
larmony/
├── apps/web        → Service: web       (frontend estático, Vite)
├── apps/backend    → Service: backend   (API NestJS + Fastify)
└── apps/reminders  → Service: reminders (cron de lembretes, Node.js)
```

---

## Pré-requisitos

- Conta no Railway com projeto criado
- Repositório conectado ao Railway (GitHub)
- Supabase: projeto configurado com URL e chaves disponíveis
- Resend: API key configurada e domínio `larmony.me` verificado

---

## Ordem de criação dos Services

Crie os services nesta ordem, pois as URLs geradas precisam ser usadas como variáveis de ambiente nos demais:

1. **backend** (gera a URL da API)
2. **web** (usa a URL do backend)
3. **reminders** (independente, mas usa `APP_URL` do web)

---

## 1. Service: backend

### Configuração inicial

1. No Railway, clique em **New Service → GitHub Repo**
2. Selecione o repositório `larmony`
3. No painel do service, vá em **Settings**:
   - **Service Name:** `backend`
   - **Config Path:** `apps/backend/railway.toml`
   - **Root Directory:** deixe vazio (usa a raiz do repo)
4. Clique em **Deploy**

### Variáveis de ambiente

Vá em **Variables** e adicione:

| Variável | Valor | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Modo de execução |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | `eyJ...` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Chave service role (secreta) |
| `RESEND_API_KEY` | `re_xxxx` | Chave da API Resend |
| `APP_URL` | `https://web-production-xxxx.up.railway.app` | URL pública do frontend (preencher após criar o service web) |
| `WEB_ORIGIN` | `https://web-production-xxxx.up.railway.app` | Mesmo valor de APP_URL (usado para CORS) |

> **Nota:** `PORT` é injetado automaticamente pelo Railway — não adicione manualmente.

### Domínio

Após o primeiro deploy bem-sucedido, vá em **Settings → Networking → Generate Domain** para obter a URL pública do backend (ex: `backend-production-xxxx.up.railway.app`). Anote esta URL para usar no service web.

---

## 2. Service: web

### Configuração inicial

1. No Railway, clique em **New Service → GitHub Repo**
2. Selecione o mesmo repositório `larmony`
3. No painel do service, vá em **Settings**:
   - **Service Name:** `web`
   - **Config Path:** `apps/web/railway.toml`
   - **Root Directory:** deixe vazio (usa a raiz do repo)
4. **Não faça deploy ainda** — configure as variáveis primeiro

### Variáveis de ambiente

| Variável | Valor | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | URL do Supabase (build-time) |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Chave anon do Supabase (build-time) |
| `VITE_BACKEND_URL` | `https://backend-production-xxxx.up.railway.app` | URL do service backend |

> **Importante:** variáveis `VITE_*` são embutidas no bundle durante o build. Qualquer alteração exige um novo deploy.

### Deploy e domínio

1. Clique em **Deploy**
2. Após o deploy, vá em **Settings → Networking → Generate Domain**
3. Copie a URL gerada (ex: `https://web-production-xxxx.up.railway.app`)
4. Volte ao service `backend` e atualize `APP_URL` e `WEB_ORIGIN` com esta URL
5. Faça redeploy do backend para aplicar as variáveis

### Configurar Supabase para o domínio de produção

No painel do Supabase (**Authentication → URL Configuration**):

- **Site URL:** `https://web-production-xxxx.up.railway.app`
- **Redirect URLs:** adicione `https://web-production-xxxx.up.railway.app/**`

---

## 3. Service: reminders

### Configuração inicial

1. No Railway, clique em **New Service → GitHub Repo**
2. Selecione o mesmo repositório `larmony`
3. No painel do service, vá em **Settings**:
   - **Service Name:** `reminders`
   - **Config Path:** `apps/reminders/railway.toml`
   - **Root Directory:** deixe vazio (usa a raiz do repo)
4. **Não faça deploy ainda** — configure as variáveis primeiro

### Variáveis de ambiente

| Variável | Valor | Descrição |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Chave service role (secreta) |
| `RESEND_API_KEY` | `re_xxxx` | Chave da API Resend |
| `APP_URL` | `https://web-production-xxxx.up.railway.app` | URL do frontend (usada nos emails) |
| `CRON_SCHEDULE` | `0 11 * * *` | (Opcional) Horário do cron — padrão: 11h UTC = 8h BRT |
| `RUN_ON_START` | `true` | (Opcional) Executa imediatamente ao iniciar, útil para testar |

### Deploy

1. Clique em **Deploy**
2. O service ficará rodando em background, executando o cron diariamente

> **Nota:** o service `reminders` não expõe porta HTTP. Railway pode marcar o health check como falho — isso é esperado. O processo continua rodando normalmente.

---

## Resumo das variáveis por service

| Variável | web | backend | reminders |
|---|:---:|:---:|:---:|
| `VITE_SUPABASE_URL` | ✓ | | |
| `VITE_SUPABASE_ANON_KEY` | ✓ | | |
| `VITE_BACKEND_URL` | ✓ | | |
| `NODE_ENV=production` | | ✓ | |
| `SUPABASE_URL` | | ✓ | ✓ |
| `SUPABASE_ANON_KEY` | | ✓ | |
| `SUPABASE_SERVICE_ROLE_KEY` | | ✓ | ✓ |
| `RESEND_API_KEY` | | ✓ | ✓ |
| `APP_URL` | | ✓ | ✓ |
| `WEB_ORIGIN` | | ✓ | |
| `CRON_SCHEDULE` | | | opcional |
| `RUN_ON_START` | | | opcional |

---

## Como funciona o deploy do monorepo

Cada service usa o **Config Path** para apontar para o `railway.toml` do app correspondente. O Railway:

1. Clona o repositório inteiro (raiz do monorepo)
2. Instala dependências com `yarn install`
3. Executa o `buildCommand` definido no `railway.toml` (ex: `yarn build:web`)
4. Inicia com o `startCommand` (ex: `yarn start:web`)

Os comandos `build:*` e `start:*` estão definidos no `package.json` raiz e usam o Turborepo com `--filter` para compilar apenas o app relevante.

---

## Redeploy ao fazer push

Por padrão, o Railway redeploya **todos os services** a cada push no branch conectado. Para evitar redeploys desnecessários, configure **Watch Paths** em cada service:

- **web:** `apps/web/**`, `packages/**`, `yarn.lock`
- **backend:** `apps/backend/**`, `packages/**`, `yarn.lock`
- **reminders:** `apps/reminders/**`, `yarn.lock`

Acesse: **Settings → Source → Watch Paths**

---

## Troubleshooting

**Build falha com "command not found: turbo"**
→ Verifique que `turbo` está em `devDependencies` do `package.json` raiz e que `yarn install` rodou antes do buildCommand.

**Backend não conecta ao Supabase**
→ Verifique `SUPABASE_URL` e `SUPABASE_ANON_KEY` nas variáveis do service backend.

**CORS bloqueado no frontend**
→ Verifique que `WEB_ORIGIN` no backend está com a URL exata do frontend (sem barra no final).

**Emails não estão sendo enviados**
→ Verifique `RESEND_API_KEY` e se o domínio `larmony.me` está verificado no painel do Resend.

**Service reminders aparece como "unhealthy"**
→ É esperado — o service não expõe porta HTTP. Desabilite o health check em **Settings → Deploy → Health Check**.
