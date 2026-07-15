# ADR-0027 — Sessão: localStorage (com hardening) vs. cookie httpOnly

**Status:** Aceito
**Data:** 2026-07-12

## Contexto

A sessão do frontend (access token + refresh token + user) vive em
`localStorage["larmony_session"]` em plaintext, anexada às requests como
`Authorization: Bearer`. Qualquer XSS pode ler a chave — e o app não tinha
nenhuma camada de defesa em profundidade (sem CSP, sem helmet). A pergunta
pré-produção: migrar para cookie httpOnly (imune a leitura via JS) ou manter
localStorage e blindar?

Fatos levantados (exploração 2026-07-12):
- Auth é 100% Bearer; backend não tem NENHUM código de cookie/CSRF; CORS já
  tem `credentials: true` (pré-wired, não usado). Verificação de token é
  chamada de rede ao Supabase (`admin.auth.getUser`) por request.
- **Frontend e backend são cross-site**: serviços Railway separados, e
  `railway.app` está na **Public Suffix List** — cada subdomínio conta como
  site registrável distinto. Um cookie de sessão setado pelo backend seria
  **third-party** para o frontend.
- Superfície XSS atual mínima: 2 `dangerouslySetInnerHTML` (ambos CSS
  estático), sem conteúdo de usuário renderizado como HTML; tokens não vazam
  p/ telemetria; recovery tokens transitam no fragment e são limpos.

## Decisão

**Manter a sessão em localStorage AGORA, com hardening de defesa em
profundidade, e migrar para cookie httpOnly quando existir domínio próprio em
produção** (ex.: `app.larmony.me` + `api.larmony.me` — aí o cookie vira
same-site `SameSite=Lax`, sem os problemas abaixo).

Racional contra migrar já:
1. Cookie cross-site entre `*.railway.app` exige `SameSite=None; Secure` e é
   **bloqueado por padrão** (Safari/Firefox ITP/ETP; phase-out de third-party
   cookies do Chrome) — a sessão simplesmente não funcionaria para parte dos
   usuários.
2. Mesmo onde funcionasse, cookie automático reintroduz **CSRF** → exigiria
   token anti-CSRF + `credentials: "include"` em todo fetch + rework do
   refresh — custo alto para um ganho que a PSL anula hoje.
3. O ganho real de httpOnly (XSS não lê o token) é mitigável parcialmente com
   CSP + superfície XSS mínima; e um XSS forte compromete a sessão de
   qualquer forma (pode agir *como* o usuário mesmo sem ler o token).

Hardening implementado junto com este ADR:
- **Backend**: `helmet()` em `main.ts` (nosniff, frameguard, HSTS etc. — API
  JSON, defaults bastam).
- **Frontend**: headers de segurança via `next.config.js` `headers()` — CSP
  enforce (`default-src 'self'`; `script-src 'self' 'unsafe-inline'` [+
  `unsafe-eval` só em dev]; `img-src ... https:` p/ avatares do Supabase
  Storage; `connect-src 'self' + API_URL`; `frame-ancestors 'none'`;
  `object-src/base-uri/form-action` restritos) + `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.

## Gatilho de migração (revisitar)

Ao provisionar produção com domínio próprio (front e API sob o MESMO site
registrável): migrar a sessão para cookie `httpOnly; Secure; SameSite=Lax`
setado pelo backend, com CSRF token para métodos mutantes, e remover o
localStorage. Este ADR deve ser revisado nessa fase.

## Consequências

- Sessão continua legível por JS até a migração — mitigada por CSP + revisão
  de qualquer futuro render de HTML de usuário (proibido sem sanitização).
- `script-src 'unsafe-inline'` permanece (pages router sem nonce); o ganho da
  CSP aqui é principalmente `connect-src`/`object-src`/`frame-ancestors`
  (exfiltração e clickjacking), não bloqueio total de inline script.
- Qualquer nova origem externa consumida pelo browser (imagens, APIs) precisa
  entrar na CSP — falha aparece no console como violação.

## Alternativas rejeitadas

- **Migrar para cookie httpOnly agora**: inviável cross-site (PSL) — quebraria
  login em browsers que bloqueiam third-party cookies.
- **BFF no Next.js** (proxy `/api/*` same-origin + cookie no Next): resolveria
  o cross-site, mas adiciona um hop/latência, duplica superfície de auth e
  reescreve o client de API inteiro — custo desproporcional pré-lançamento;
  o domínio próprio resolve o mesmo problema sem BFF.
