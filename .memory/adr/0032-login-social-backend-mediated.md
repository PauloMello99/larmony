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

### Política de colisão de e-mail (revisada — ver adendo abaixo)

~~Usuário genuinamente novo no GoTrue (não achado por `findByAuthId`) mas com
e-mail que já existe em `public.users` sob outro `auth_id`: **rejeitado, não
fundido**. Rebind de `users.auth_id` para o novo `auth_id` seria risco de
account takeover~~ — **superado pelo adendo "Múltiplas identidades por
usuário" abaixo**, depois de confirmado ao vivo em staging que esse cenário
acontece de verdade e o usuário decidiu que e-mail deve ser a fonte única de
verdade. Mesma rejeição, sem checar colisão, quando `emailVerified === false`
— **isso não muda**: e-mail não verificado nunca é base suficiente para
nenhuma decisão de identidade, nem merge nem rejeição.

Essa política foi definida de forma **defensiva**, sem teste ao vivo do
comportamento real de auto-link do GoTrue neste ambiente (ficou como dívida
de validação manual). A validação aconteceu — ver adendo.

## Adendo (2026-07-30) — Múltiplas identidades por usuário

### Contexto do adendo

Em teste real de staging, um usuário criou conta por senha e depois tentou
entrar via Google com o mesmo e-mail. O backend rejeitou corretamente com
`409 SOCIAL_EMAIL_ALREADY_REGISTERED` (política original acima) — mas isso
provou, ao vivo, que o **auto-link nativo do GoTrue não cobre este caso**
neste projeto. Investigação encontrada na documentação oficial do Supabase
(`auth-identity-linking`): o GoTrue *deveria*, por padrão, unificar
identidades de e-mail verificado automaticamente (mesmo `auth.users.id`,
múltiplas linhas em `auth.identities`) — mas o comportamento observado aqui
foi a criação de uma **segunda linha em `auth.users`**, com `auth_id`
diferente.

**Causa raiz identificada**: `auth.users` tem um índice único
(`users_email_partial_key`) sobre a coluna `email` **crua**, não sobre
`lower(email)` — enquanto o `DrizzleUserRepository.findByEmail` do Larmony já
comparava por `lower(email)` (case-insensitive) desde antes deste adendo. Um
e-mail com capitalização diferente entre o cadastro por senha e o retornado
pelo Google (ex.: `User@Gmail.com` vs `user@gmail.com`) passa pelo índice
único do GoTrue sem conflito, criando de fato um segundo `auth.users`, mas é
pego como colisão pelo `findByEmail` do Larmony. Essa é a explicação
concreta — não hipotética — de por que a colisão acontece na prática, mesmo
com o GoTrue "prometendo" auto-link.

### Decisão

Em vez de reimplementar auto-link no GoTrue (fora do nosso controle), ou
seguir rejeitando o login (fricção ruim: usuário precisa lembrar qual método
usou no cadastro), o Larmony passa a suportar **múltiplas identidades de
autenticação por usuário local** — 1 `public.users.id` pode ter N
identidades Supabase (`auth_id`), uma por provedor (senha, Google, Apple).

- Nova tabela `user_identities` (`user_id` FK cascade, `provider`, `auth_id`
  único) — migration `0005_user_identities.sql`. `users.auth_id` **mantido
  como coluna legada** (não removido nesta fase) até validação prolongada em
  produção; nenhuma query nova depende dela.
- As 4 funções RLS (`is_super_admin`, `is_household_member`,
  `is_household_owner`, `shares_household_with`) e as policies de
  `users`/`notification_preferences` passam a resolver identidade via JOIN
  em `user_identities` em vez de `users.auth_id` direto — migration
  `0006_rls_user_identities.sql`. Comportamentalmente no-op para todo
  usuário com 1 identidade (o caso de 100% da base até este adendo).
- `IUserRepository` ganha `linkIdentity(userId, provider, authId)` e
  `listIdentityAuthIds(userId)`; `findByAuthId`/`update`/`mergeOnboarding`/
  `acceptTerms`/`delete` resolvem `userId` a partir de QUALQUER identidade
  vinculada (não só a original), via `resolveUserIdByAuthId` (dois passos:
  resolve `user_identities` → opera em `users.id`) — evita depender de
  sintaxe de UPDATE/DELETE com JOIN do Drizzle.
- **Fora do módulo `user`**: 8 outros pontos faziam a mesma resolução
  inline (`is-super-admin.ts`, guards de household/platform-admin,
  `DrizzleHouseholdRepository` ×5, `DrizzleMemberRepository.findByAuthId`,
  `DrizzleNotificationRepository.findUserIdByAuthId`) — descobertos durante
  a implementação, não previstos no desenho inicial da ADR original. Sem
  corrigi-los, login social funcionaria mas todo acesso a household quebraria
  com 403 para quem logasse por uma identidade não-primária.
- `SignInWithSocialUseCase`: o ramo de colisão de e-mail (`emailCollision`,
  com `emailVerified === true`) deixa de rejeitar e passa a chamar
  `linkIdentity(emailCollision.id, socialProvider, authUser.id)` — vincula a
  nova identidade ao usuário existente, audita como
  `action: "update"` / `metadata.event: "identity_linked"`, retorna
  `isNewUser: false`. Falha de `linkIdentity` aciona a mesma compensação
  (`rollbackAuthUser`) do caminho de criação.
- `DeleteAccountUseCase`: agora captura `listIdentityAuthIds(user.id)` ANTES
  de deletar o usuário local (FK cascade apaga `user_identities` junto) e
  remove CADA identidade no provedor (best-effort — uma falha não impede as
  demais nem a exclusão já concluída). Antes, só a identidade da sessão
  atual era removida, deixando identidades órfãs no GoTrue.

### Por que confiar em e-mail verificado é aceitável aqui

Mesmo nível de confiança usado por GitHub, Notion e a maioria dos apps que
oferecem múltiplos métodos de login: o e-mail retornado por um provedor
OAuth (`emailVerified: true`) já passou pela verificação do PRÓPRIO
provedor (Google confirma antes de devolver o claim). Continuamos **nunca**
confiando em e-mail não verificado para nenhuma decisão — esse caso segue
rejeitando sem checar colisão, comportamento inalterado deste adendo.

### Lacuna de teste registrada (não bloqueante)

Simular em e2e o cenário completo (2 identidades GoTrue reais para o mesmo
e-mail) exigiria forjar um JWT compatível com o GoTrue local (secret HS256 +
claims exatos) ou orquestrar OAuth real — avaliado como esforço
desproporcional ao valor: a lógica de merge já tem cobertura unitária direta
(`sign-in-with-social.use-case.spec.ts`: merge bem-sucedido + falha de
`linkIdentity` com compensação), a suíte e2e completa dos endpoints segue
verde sem alteração, e o cenário motivador deste adendo já foi validado
manualmente ao vivo em staging (é a origem deste próprio adendo). Gap
aceito, não um teste pulado por descuido.

### Fora de escopo

- Remover `users.auth_id` (coluna legada) — migration futura, só depois de
  staging/produção rodarem por um tempo sem regressão.
- UI de "contas conectadas" (usuário ver/desvincular identidades em
  `/account`) — nada no adendo impede, mas não foi pedido.

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
