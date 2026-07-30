# ADR-0032 — Login social (Google/Apple) via Supabase Auth, mediado pelo backend

- **Status:** Aceito
- **Data:** 2026-07-30
- **Relacionados:** ADR-0027 (sessão via localStorage — sem cookie httpOnly, o
  que torna o binding de estado do callback o único anti-CSRF do fluxo),
  ADR-0031 (re-aceite bloqueante de Termos — usuário social nasce em estado
  de pré-aceite e é interceptado pelo mesmo mecanismo), ADR-0029 (funil
  signup → criar 1º lar → gate de assinatura, também aplicado a quem entra
  via social)

## Contexto

O único caminho de entrada era e-mail/senha. OAuth Google/Apple estava
explicitamente fora do escopo do v1 (`.memory/roadmap.md`, "reavaliar após
M1") e nunca foi reavaliado. Esta ADR cobre essa reavaliação: reduzir o
atrito de cadastro na fase pré-lançamento, usando os providers OAuth já
suportados nativamente pelo GoTrue (Supabase Auth).

## Decisão

**Backend-mediated**: o frontend continua sem `@supabase/*` no bundle
(invariante já registrado em `.memory/supabase-coupling.md`). O backend
expõe:

- `GET /auth/social/:provider/authorize` → `{ url }` — URL de autorização do
  GoTrue, montada com `redirectTo = ${FRONTEND_URL}/auth/callback` **computado
  no servidor**, nunca aceito do cliente (elimina open-redirect por
  construção).
- `POST /auth/social/callback` — recebe os tokens que o front leu do
  fragment da URL após o redirect do Supabase (`access_token`,
  `refresh_token`, `expires_in`), verifica a identidade via
  `IAuthProvider.verifyToken` (sem efeito colateral) e devolve o **mesmo
  formato de sessão do `POST /auth/sign-in`** mais `isNewUser`.

O front faz navegação top-level (`window.location.assign`) para o passo de
authorize; o Supabase redireciona de volta para `/auth/callback`, uma página
sem guard (nem `GuestGuard` nem `AuthGuard` — ambos correriam em corrida com
o próprio roteamento do callback).

**Alternativa rejeitada**: SDK `@supabase/supabase-js` no frontend, chamando
`signInWithOAuth` diretamente do browser. Custaria `NEXT_PUBLIC_SUPABASE_URL`
em `turbo.json` (`globalEnv`), nos dois `.env.example`, no Railway, e `ARG`
build-time no Dockerfile — além de quebrar o invariante de
`.memory/supabase-coupling.md` de que o frontend não conhece Supabase.

### Crescimento da porta `IAuthProvider`

Um método novo, `getSocialAuthorizeUrl(provider, redirectTo): Promise<string>`,
foi adicionado à interface `IAuthProvider`
(`apps/backend/src/modules/auth/application/ports/auth-provider.interface.ts`).
Qualquer implementação futura da porta (troca de provedor de auth) passa a
precisar implementar esse método também — atualizar
`.memory/supabase-coupling.md` §1 (lista de métodos cobertos) ao evoluir essa
porta.

### `termsVersion = null` como estado de pré-aceite

Login social provisiona o usuário local com `termsVersion: null` (nunca
aceitou nada, ao contrário do sign-up por senha, que grava `TERMS_VERSION`
vigente). Isso encaixa diretamente no mecanismo já existente da ADR-0031: o
backend computa `termsAcceptanceRequired = user.termsVersion !== TERMS_VERSION`,
que é `true` para `null` sem nenhuma mudança de lógica no `GetMeUseCase`. A
única adição foi uma variante de copy no `TermsReacceptDialog` —
`termsFirstAccept.*` ("antes de começar") em vez de `termsReaccept.*`
("atualizamos os termos") — escolhida por `me.termsVersion === null`.
Consentimento é coletado **depois** do provisionamento da conta (não antes),
via o mesmo modal bloqueante que já existia.

### Binding de estado one-shot como defesa de login-CSRF

A sessão do larmony não vive em cookie httpOnly (ADR-0027) — é
`localStorage`, alimentado via `POST /auth/social/callback`. Sem nenhuma
defesa adicional, `/auth/callback` aceitaria tokens de QUALQUER origem: um
atacante poderia forçar a vítima a abrir
`/auth/callback#access_token=<tokens do atacante>` e logá-la silenciosamente
na conta do atacante.

A defesa: `startSocialSignIn` gera um nonce e grava
`{ provider, nonce, invite?, redirect? }` em `sessionStorage` (chave
`larmony_social_auth`) antes de navegar para o Supabase. O callback lê esse
estado com `takeSocialAuthState()` — **one-shot** (lê e remove). Se não
houver estado (callback não solicitado por esta aba), o handler nunca chama
`completeSocialSignIn` — mostra erro. Como `sessionStorage` é isolado por
aba/origem e o estado é consumido uma única vez, um link malicioso aberto
diretamente não encontra estado válido.

### Política de colisão de e-mail

Usuário genuinamente novo no GoTrue (não achado por `findByAuthId`) mas com
e-mail que já existe em `public.users` sob outro `auth_id`: **rejeitado, não
fundido**. Rebind de `users.auth_id` para o novo `auth_id` seria risco de
account takeover (qualquer um que registre uma conta Google/Apple com o
e-mail de uma vítima assumiria a conta dela). A identidade social recém-criada
no GoTrue é removida (compensação best-effort, mesmo padrão de
`rollbackAuthUser` do `sign-up.use-case.ts`), e a resposta é
`409 SOCIAL_EMAIL_ALREADY_REGISTERED`. Mesma rejeição, sem checar colisão,
quando `emailVerified === false` — não dá para confiar em e-mail não
verificado para nenhuma decisão de identidade.

Essa política foi definida de forma **defensiva**, sem teste ao vivo do
comportamento real de auto-link do GoTrue neste ambiente (ficou como dívida
de validação manual — ver checklist de teste em `docs/deployment.md`).

### Apple private relay

E-mails `@privaterelay.appleid.com` tornam dedupe por e-mail impraticável
para contas Apple com "Ocultar meu e-mail" — aceito por design: contas
separadas por relay diferente não são fundidas. Nome do usuário também só é
enviado pela Apple na primeira autorização; como `AuthUser` (a porta) não
carrega nome, o fallback é a parte local do e-mail, editável depois em
`/account`. Não alargamos a porta `IAuthProvider`/`AuthUser` só por isso.

### Rotação do client secret Apple

O client secret do Sign in with Apple é um JWT assinado (ES256) com validade
máxima de 6 meses — não é um segredo estático como o do Google. Isso é dívida
operacional recorrente, documentada com a data de expiração em
`docs/deployment.md`.

## Consequências

- Zero env var nova, zero mudança em `turbo.json`, zero var no Railway — os
  segredos dos providers OAuth vivem nos dashboards do Supabase (staging e
  prod), não no ambiente do backend.
- Zero mudança de CSP — navegação top-level não é governada por
  `connect-src`, e o `form_post` do Sign in with Apple é entregue ao
  `/auth/v1/callback` do GoTrue, não a uma página larmony.
- Dois bugs preexistentes em `DrizzleUserRepository.create()` foram corrigidos
  como efeito colateral necessário (não escopo novo): `row!` explodindo em
  `undefined` num conflito de insert (agora re-lê por `authId` e devolve o
  usuário existente, tornando o find-or-create idempotente contra abas
  concorrentes), e `termsAcceptedAt` sendo gravado incondicionalmente (agora
  condicional a `termsVersion` não ser `null`).

## Alternativas rejeitadas

- SDK Supabase no frontend — ver seção "Decisão" acima.
- Merge automático de conta ao detectar e-mail igual — rejeitado por risco de
  account takeover.
- Gate do botão Apple por env var (ex. `SOCIAL_APPLE_ENABLED`) — rejeitado
  por exigir infra de env nova (`turbo.json` + 2 `.env.example` + Railway)
  para um booleano; o provider desligado no GoTrue já responde
  `422 SOCIAL_PROVIDER_NOT_CONFIGURED`, que a UI traduz sem esconder o botão.

## Fora de escopo

- Merge manual de contas (usuário decide fundir conta social com conta por
  senha existente) — trabalho futuro se a fricção da rejeição automática
  virar reclamação de suporte recorrente.
- Providers OAuth adicionais além de Google/Apple.
- Teste ao vivo do comportamento de auto-link do GoTrue — pendência de
  validação manual antes do primeiro deploy em produção (ver
  `docs/deployment.md`).
