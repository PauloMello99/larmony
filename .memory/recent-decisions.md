# Decisões Recentes

Índice rápido — ver `.memory/adr/` para detalhe completo.

| # | Decisão | Data | Status |
|---|---|---|---|
| ADR-0001 | Turborepo como estrutura de monorepo | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0002 | RAG local com Qdrant + Ollama + MCP Server | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0003 | Drizzle ORM com migrator customizado (suporte a rollback) | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0004 | Arquitetura NestJS com use-cases por operação | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0005 | Multi-tenancy: DB único + tenant_id + RLS | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07; tenant = household, ver ADR-0015) |
| ADR-0006 | Clean Architecture + SOLID no backend NestJS | 2026-06-08 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0007 | Feature-Based Architecture no frontend Next.js | 2026-06-08 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0008 | RAG/memória obrigatória com servidor MCP `larmony-memory` | 2026-06-13 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0009 | Feature Flags para liberação controlada de recursos | 2026-06-13 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0010 | Caixa: livro append-only com erratas + saldo por agregação | 2026-06-16 | **Superseded** — domínio de estúdio; transações do Larmony são editáveis |
| ADR-0011 | Topologia de deploy (staging/prod) + caching in-memory sem Redis | 2026-06-27 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0012 | E-mail transacional: React Email + módulo `mail` dedicado | 2026-06-28 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0013 | super_admin age como owner de qualquer tenant | 2026-06-29 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0014 | Error tracking com Better Stack | 2026-07-01 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0015 | Household como unidade de tenancy (adaptação do padrão org) | 2026-07-04 | Aceito |
| ADR-0016 | Evolução do RAG: bge-m3 + hybrid search + parent-document | 2026-07-04 | Aceito |
| ADR-0017 | Dinheiro em centavos inteiros em todo o stack | 2026-07-04 | Aceito |
| ADR-0018 | i18n pt-BR/en com locale no perfil do usuário | 2026-07-04 | Aceito |
| ADR-0019 | Recorrência: modelo simples + engine no cron gravando via DRIZZLE_ADMIN | 2026-07-08 | **Superseded** — unificado com bills no ADR-0020 |
| ADR-0020 | Unificar bills + recurrences em "lançamentos programados" (scheduled_transaction_entries) | 2026-07-09 | Aceito |
| ADR-0021 | Adoção do Design System gerado no Claude Design (logo, landing, glass app-wide) | 2026-07-10 | Aceito |
| ADR-0022 | Orçamentos como série + versões, resolução on-read (M10) | 2026-07-10 | Aceito |
| ADR-0023 | Dispatcher multicanal de notificações + dedup por evento (M11) | 2026-07-11 | Aceito |
| ADR-0024 | Assertividade dos disparos: timezone + hora por lar (M12) | 2026-07-11 | Aceito |
| ADR-0025 | M13 Open Finance desacoplado do lançamento + gatilho de ativação | 2026-07-11 | Aceito |
| ADR-0026 | Billing (Stripe) + Entitlements + comp/desconto administrativo (M14) | 2026-07-12 | Aceito (adendo D-1 e trial administrativo local superseded pelo ADR-0029) |
| ADR-0027 | Sessão em localStorage vs cookie httpOnly (hardening pré-produção) | 2026-07-13 | Aceito |
| ADR-0028 | Redesign do super admin: centrado em lares, suspensão segura, role DB-only (M15) | 2026-07-14 | Aceito |
| ADR-0029 | Assinatura pago-only: 2 tiers (Essencial/Completo) + trial self-serve, fim do Free (M16) | 2026-07-14 | Aceito (supersede o adendo D-1 do ADR-0026) |
| ADR-0030 | Cookies: aviso dedicado `/legal/cookies`, sem banner (gatilho de reversão registrado) | 2026-07-27 | Aceito |
| ADR-0031 | Re-aceite bloqueante de termos (`TERMS_VERSION` deixa de ser inerte) | 2026-07-27 | Aceito |
| ADR-0032 | Login social (Google/Apple) via Supabase Auth, mediado pelo backend | 2026-07-30 | Aceito (adendo: múltiplas identidades por usuário, mesmo dia) |
| ADR-0033 | Import/categorização: pipeline em camadas (regras+ML) | 2026-08-22 | Aceito (adendo: serviço Python dedicado pra OCR/regras/ML, mesmo dia) |
| ADR-0034 | Contrato de API entre `backend` e `statement-processor` | 2026-08-22 | Aceito |

## Decisões/registros recentes (sem ADR)

- **2026-08-23 — Fase 2 do import de extrato + débito da Fase 1 quitado**:
  sessão pedida como só Fase 2 (memória por lar) encontrou o módulo backend
  inteiro do import de extrato faltando (só o serviço Python da Fase 1
  existia) — as duas foram entregues juntas. Backend: migrations 0007–0010
  (`merchant_category_memory`, `statement_import_jobs`,
  `statement_import_candidates`, RLS household-scoped provado por e2e
  cross-tenant), módulo `statement-import` completo (4 camadas),
  `ProcessorSecretGuard`, 2 eventos de notificação novos (7 locales, sempre
  contagem — nunca percentual isolado, regra do ADR-0033), job de cron de
  reconciliação de timeout (30s csv/ofx, 5min pdf). Processor Python:
  `rules/merchant_key.py` (normalizador) + `rules/household_member.py`
  (cross-referência) integrados ao pipeline. Limite de body HTTP global
  subiu de 100kb (default Express) pra 10mb (`main.ts`/`test/helpers.ts`,
  `useBodyParser`) — CSV/OFX em base64 excede o default; verificado que não
  quebra a verificação de assinatura do webhook Stripe (rawBody
  preservado). **Decisão em aberto**: gate de assinatura ficou igual ao de
  transações (tier Essencial) por analogia, não confirmado com produto —
  revisar antes do lançamento se import de extrato deveria exigir tier
  Completo. **Achado crítico na revisão final** (só apareceu depois de toda
  a implementação/testes passarem): `amountCents` cruzava a fronteira
  processor→backend com sinal nativo do extrato (negativo pra despesa) em
  vez de sempre positivo como o próprio ADR-0034 já mandava — inverteria
  silenciosamente somas de orçamento. Corrigido nos dois lados (`pipeline.py`
  deriva `type` do sinal antes do `abs()`; backend rejeita — nunca coage —
  `amountCents` não-positivo no callback) + `completeJob`/`insertCandidates`
  unificados numa transação atômica (`completeJobWithCandidates`, evita job
  `completed` órfão sem candidatos em caso de crash no meio). Detalhe
  completo em `docs/product/features/16-import-extrato.md` (atualização
  2026-08-23) e [[statement-import-amount-cents-sign-gotcha]].

- **2026-08-22 — Investigação de viabilidade de LLM/ML → ADR-0033**:
  investigação de várias sessões (não implementação) testando viabilidade
  de LLM pequeno pro import/categorização/relatório/chatbot. PoCs reais com
  5 extratos Nubank (meses diferentes) + 2 PDFs reais da Caixa: LLM
  genérico como motor primário errou de forma concreta (Pix pessoa física
  virando "Salário" com alta confiança, fatura de cartão tratada como
  categoria única); regras+CNPJ+memória por lar cobriram 76,6–96,1% em
  meses "normais" mas caíram pra 12,9–16,9% em meses antigos (causa raiz:
  a regra mais valiosa dependia de um relacionamento/conta compartilhada
  que só passou a existir depois — cobertura de import não é constante);
  cross-referência com membros do lar (dado que o Larmony já tem) bateu
  regra de texto de banco sozinha; classificador de ML simples (TF-IDF+
  LogReg) generalizou nome de comerciante em ordem de palavra diferente,
  mas só com `class_weight="balanced"` e só rodando depois da checagem
  estrutural. PDF real da Caixa não tinha camada de texto (é imagem) —
  Docling (OCR CPU-only) testado ao vivo com 0 valor errado em 2
  documentos. **Decisão: nenhum serviço próprio de IA/ML** — pipeline em
  camadas dentro do backend NestJS (módulo novo `statement-import`),
  classificador de ML adiado do launch (quando entrar, roda embutido, sem
  microserviço Python), OCR de PDF via API gerenciada (não self-host de
  Docling), LLM só como fallback estreito. Self-hosting de GPU
  (Railway/RunPod) rejeitado. Detalhe completo em
  `.memory/adr/0033-import-categorizacao-regras-ml-llm-fallback.md` e nas
  notas de sessão `.memory/sessions/2026-08-21-llm-viability-investigation.md`.

- **2026-07-30 — Múltiplas identidades por usuário entregue (adendo
  ADR-0032)**: teste real em staging expôs que login social rejeitava
  (409) quando o e-mail já tinha conta por senha. Causa raiz encontrada:
  `auth.users` do GoTrue tem índice único **case-sensitive** em `email`,
  enquanto `findByEmail` do Larmony já comparava via `lower()` — um e-mail
  com capitalização diferente entre cadastro por senha e o devolvido pelo
  Google passa pelo índice do GoTrue (2ª linha criada) mas é pego como
  colisão pelo nosso código. Decisão do usuário: e-mail como fonte única de
  verdade, múltiplos métodos de login pra mesma conta. Nova tabela
  `user_identities` (migration `0005`, aditiva); as 4 funções RLS
  (`is_super_admin`, `is_household_member`, `is_household_owner`,
  `shares_household_with`) + policies de `users`/`notification_preferences`
  reescritas pra resolver via essa tabela (migration `0006`,
  comportamentalmente no-op pra quem tem 1 identidade). **8 pontos extras**
  fora do módulo `user` faziam a mesma resolução inline (guards de
  household/platform-admin, repos de household/member/notification) —
  descobertos só durante a implementação; sem corrigi-los, login social
  funcionaria mas todo acesso a lar quebraria com 403 pra quem logasse por
  identidade não-primária. `SignInWithSocialUseCase`: colisão de e-mail
  verificado agora vincula (`linkIdentity`) em vez de rejeitar;
  `DeleteAccountUseCase` passa a limpar TODAS as identidades no provedor,
  não só a da sessão atual. `users.auth_id` mantido como coluna legada
  (remoção é migration futura, só após validação prolongada). 152/152 unit
  + 173/173 e2e verdes. Lacuna aceita e documentada: e2e do cenário
  completo (2 identidades GoTrue reais) exigiria forjar JWT — cobertura
  fica no nível de unit test + validação manual já feita ao vivo em
  staging (é a origem deste próprio adendo). Detalhe completo no adendo de
  `.memory/adr/0032-login-social-backend-mediated.md`.

- **2026-07-30 — Infra de SEO entregue**: Google Search Console rejeitou a
  verificação OAuth do app por falta de sinais de SEO na landing (homepage
  não verificada, sem descrição de finalidade, nome do app não batendo com o
  site). Adicionado: `NEXT_PUBLIC_SITE_URL` (env nova, build-time, mesmo
  padrão de `NEXT_PUBLIC_API_URL` — `turbo.json` globalEnv + `.env.example`)
  + helper `shared/lib/site-url.ts` (`SITE_URL`/`absoluteUrl`); componente
  `shared/components/seo/page-seo.tsx` (title/description/canonical/OG/
  Twitter Card/JSON-LD via `next/head`), aplicado na landing (JSON-LD
  `SoftwareApplication`) e nas 3 páginas legais; `public/robots.txt` (domínio
  de prod hardcoded, como é padrão — aponta pro `Sitemap:`); `pages/
  sitemap.xml.tsx` (gerado via `getServerSideProps` escrevendo XML direto na
  response, sem lib nova, só as 4 rotas públicas estáticas); `pages/api/og.tsx`
  — imagem Open Graph 1200×630 gerada em runtime via `next/og`
  (`ImageResponse`, **já embutido no Next 16.2.7**, zero dependência nova) com
  o SVG do logo + tagline; `next.config.js` ganhou 2º bloco de `headers()`
  aplicando `X-Robots-Tag: noindex, nofollow` a `/auth/*`, `/households*`,
  `/account`, `/admin*`, `/invite/*`, `/support*` (mesmo conjunto do
  `Disallow` do robots.txt — header cobre o caso de uma URL autenticada já
  indexada por outro meio, que `Disallow` sozinho não desindexa). Verificado
  ao vivo: `curl`-equivalente via `fetch()` no browser confirmou o header
  presente em `/households`/`/account` e ausente em `/`/`/legal/*`; `/api/og`
  renderiza 1200×630 sem erro de edge runtime; build de produção limpo.
  Pendência do usuário (fora do escopo de código): reverificar a propriedade
  `https://larmony.me` no Google Search Console e reenviar o app pra revisão
  OAuth — agora com meta description/title reais no HTML.

- **2026-07-30 — Login social Google/Apple entregue (ADR-0032)**: backend-mediated
  (frontend continua sem `@supabase/*`); `IAuthProvider.getSocialAuthorizeUrl`
  monta a URL de authorize com `redirectTo` computado no servidor;
  `POST /auth/social/callback` verifica via `verifyToken` (sem side effect) e
  faz find-or-create idempotente. Usuário social nasce com `termsVersion: null`
  — intercepta no modal bloqueante da ADR-0031 (copy nova `termsFirstAccept.*`).
  Colisão de e-mail (usuário novo no GoTrue com e-mail já cadastrado por senha)
  é **rejeitada, não fundida** (409, risco de account takeover) — política
  defensiva, não testada ao vivo com Google OAuth real antes deste PR. Binding
  de estado one-shot em `sessionStorage` (nonce) como defesa de login-CSRF, já
  que a sessão não vive em cookie httpOnly (ADR-0027). Dois bugs preexistentes
  corrigidos em `DrizzleUserRepository.create()`: `row!` explodindo em
  `undefined` num conflito de insert (agora idempotente) e `termsAcceptedAt`
  gravado incondicionalmente (agora condicional a `termsVersion`). Zero env var
  nova/Railway/CSP — segredos dos providers ficam nos dashboards do Supabase
  (checklist manual em `docs/deployment.md`, "Auth social"). Corrigido de
  passagem: `.memory/domain-rules.md` afirmava a existência de um
  `middleware.ts` de redirect de locale que não existe (roteamento nativo do
  Next está desligado por design). 7 locales + `check-locales` verde; 12/12 e2e
  de auth + 145 unit backend verdes. Detalhe completo em
  `.memory/adr/0032-login-social-backend-mediated.md`.

- **2026-07-27 — Conformidade legal pré-go-live (LGPD/CDC), ADR-0030 +
  ADR-0031**: ToS §4 vendia produto que não existe mais ("plano gratuito +
  Premium R$ 14,90") — reescrita para refletir o ADR-0029 (pago-only 2
  tiers, trial 30d com cartão upfront, sem tier-padrão pós-trial, lar sem
  assinatura = somente-leitura, direito de arrependimento CDC art. 49 = 7
  dias da primeira cobrança efetiva). Fonte única de versionamento criada
  (`apps/frontend/src/shared/lib/legal-info.ts` ↔
  `apps/backend/.../auth/terms-version.ts`, par acoplado — só muda junto)
  com `CONTROLLER` (razão social/CNPJ/endereço reais, populados pelo
  responsável). Nova página `/legal/cookies` (aviso, não banner — só 1
  cookie essencial, zero tracker de terceiro). **Re-aceite bloqueante**:
  bump de `TERMS_VERSION` torna toda a base "stale" instantaneamente, por
  isso o modal (`TermsReacceptDialog`, montado no `AuthGuard` + em
  `/invite/accept`) subiu no MESMO PR do bump, nunca separado — endpoint
  `POST /auth/me/accept-terms` (audit log reusa `action:"update"` +
  `entityType:"terms_acceptance"`, evita migration de enum), flag
  `termsAcceptanceRequired` computada no servidor (`GET /auth/me`), rota
  `/account` isenta do bloqueio (única saída real via exclusão de conta).
  Divulgação comercial adicionada em `pricing.tsx`/`subscription-page.tsx`
  + `consent_collection.terms_of_service:"required"` no checkout Stripe
  (checkbox de aceite com trilha de auditoria do lado da Stripe — **exige
  URL de Termos configurada no Stripe Dashboard, Settings > Public
  details, em test E live mode**; sem isso todo checkout falha com 400/500
  — pegou o CI na primeira rodada, corrigido configurando o Dashboard).
  Convite de lar ganhou checkbox obrigatório de ciência de
  compartilhamento de dados (`dataSharingAcknowledged`, DTO próprio
  extraído do de aceite — estava sendo reaproveitado por `/decline`, que
  quebraria com o campo obrigatório). **Gotcha de teste**: `TestUser.id`
  retornado pelo helper `signUpUser` é o `authId` do provedor, não
  `public.users.id` — auditoria filtra por `users.id`, então specs que
  cruzam audit log com o usuário de teste precisam buscar o id real por
  e-mail primeiro. Fluxo: branch única, 5 commits (backend/frontend/i18n/
  docs/fix de e2e), PR #41 → `development` (CI verde após o fix do
  Dashboard), PR #42 `development→staging` (CI verde), PR #43
  `staging→main` aberta e aguardando confirmação explícita antes do merge
  final (produção).

- **2026-07-14 — M16 CONCLUÍDO — overhaul do modelo de assinatura: pago-only,
  2 tiers, trial self-serve (ADR-0029)**: fim do freemium. **PR 0**: criado o
  subagente `pricing-strategist` (read-only/consultivo) para pesquisar
  concorrentes BR e recomendar preço — decisão do responsável de não fixar
  número sem essa pesquisa; preço aprovado: Essencial R$ 9,90/mês (R$ 99/ano),
  Completo R$ 19,90/mês (R$ 199/ano). **PR 1** (núcleo): `ResolvedPlan` vira
  `locked|essencial|completo`; régua por contagem do D-1 (ADR-0026) removida
  por completo — pago = ilimitado, só capabilities diferenciam tier;
  `ActiveSubscriptionGuard` novo bloqueia escrita (402
  `SUBSCRIPTION_REQUIRED`) para `locked`, aplicado **por-controller** (não
  `APP_GUARD` global — um review de arquitetura pegou que um guard global
  rodaria antes do `AuthGuard` e criaria um vetor de escrita/probe
  pré-autenticação); `households` fica fora do guard (gestão de conta nunca
  bloqueia). **PR 2**: checkout ganha `planKey` (usuário escolhe
  Essencial/Completo no checkout, decisão do responsável contra a
  recomendação de "vira Essencial por padrão" pós-trial) + trial self-serve
  de 30 dias com cartão upfront (`payment_method_collection: "always"`,
  `trial_consumed` marca antes da chamada ao Stripe); onboarding redireciona
  pro gate de assinatura após criar o 1º lar. **PR 3**: `LockedBanner` em
  toda página de lar sem assinatura; orçamentos/lançamentos programados
  ganham paywall de página inteira (Completo-only, GET também bloqueado);
  landing reconstruída com 2 planos + trial, sem nenhuma menção a "grátis".
  **PR 4**: `IPaymentGateway.listInvoices` + listagem de faturas no admin
  (pedido original do responsável); trial administrativo local removido
  (`GrantTrialUseCase`/`RevokeTrialUseCase` + rotas — redundante desde o
  self-serve do PR2; único "acesso grátis" via admin continua sendo comp);
  painel mostra o `tier`. Enum `subscription_type` do banco **não mudou**
  (`free` agora significa `locked`, sem migração de enum). Detalhe completo
  no `.memory/adr/0029-subscription-paid-only-2-tiers.md`.

- **2026-07-14 — M15 CONCLUÍDO — PR 2 (KPIs de billing) + PR 3 (canal de
  suporte), ADR-0028**: fecha o redesign do super admin nas 3 fatias
  planejadas. **PR 2**: `GET /admin/stats/billing` com contadores locais
  (pagantes/trial/pagamento pendente/isenções) + MRR aproximado (normaliza
  intervalo + desconto); espelho mínimo de `invoice.paid`/
  `invoice.payment_failed` em `billing_invoice_events` (sem dado de
  cartão/line items, idempotente em 2 camadas — event.id do webhook +
  `unique(stripe_invoice_id, type)`) alimentando `revenueCents30d`/
  `failedPayments30d` reais (não mais aproximados); deep-links pro Stripe
  (customer+subscription) na aba Assinatura e no overview. **Staging/prod
  precisam do `enabled_events` do webhook Stripe atualizado manualmente**
  para os 2 tipos novos (não é automático). **PR 3**: canal de suporte
  in-app (`support_tickets`/`support_ticket_messages`, migration 0003, sem
  RLS — mesmo padrão de `notifications`); usuário abre/lista/responde os
  próprios chamados (reply reabre um ticket `answered`→`open`); admin vê
  todos, responde (`answered` + notificação `support_reply` ao autor) e
  fecha/reabre; fechado bloqueia nova resposta com 409 dos dois lados.
  Criar um ticket notifica todos os `super_admin` in-app+e-mail via
  `DispatchNotificationUseCase` (2 eventos novos no dispatcher:
  `support_ticket_created`/`support_reply`, catálogo ×7 locales). Nav do
  admin ganhou item "Suporte" com badge do total de chamados abertos.
  **Bug pego no smoke test e corrigido**: `PATCH .../status` sem
  `@HttpCode(NO_CONTENT)` devolvia 200 com corpo vazio — o client do
  frontend só trata corpo vazio no 204, `res.json()` quebrava com
  "Unexpected end of JSON input" ao fechar um chamado pela UI. 166 e2e /
  124 unit verdes ao final da PR3 (up de 156/115 no início do M15 PR2).

- **2026-07-14 — M15 PR 1: core do redesign do admin (ADR-0028)**: admin
  centrado em lares (listas server-side com filtro por e-mail do dono/plano,
  página de billing extinta → painel na aba Assinatura do detalhe), drill-down
  em 6 abas (settings/membros/assinatura/finanças/atividade/notificações,
  read-only paginado), suspensão de lar pago agora cancela no Stripe com
  crédito proporcional antes (409 como rede de segurança), promote/demote de
  super_admin removido do sistema (DB-only, runbook
  `docs/super-admin-promotion.md`), primeiro e2e do AdminController (28 casos
  — a ausência dele escondia um 500 real: coluna fantasma
  `stock_check_interval_days` do ink-ops no detail). PRs 2 (KPIs billing) e 3
  (canal de suporte) na sequência do M15.

- **2026-07-13 — Overhaul da landing page (billing real + UX)**: pricing passou
  a refletir o catálogo real — **Free** (grátis, o que hoje não é gated),
  **Family** (`premium_monthly`, R$ 14,90/mês — mesmo produto do Stripe, sem
  mudança de catálogo; único recurso gated de fato é `advanced_reports`) e
  **Pro** (card desabilitado "em breve", sem produto no Stripe — Open Finance/
  automações). Cards agora com **altura igual** (`items-stretch`+`h-full`,
  confirmado 423px×3 via DOM) independente do nº de features listadas. **A
  régua completa do Free segue em aberto (D-1)** — não resolvida aqui. Header
  ganhou link de login (antes só cadastro). Tour (`#tour`) virou navegável —
  6 abas clicáveis com paineis mock por feature (antes só "Visão geral"
  estática). About trocou os 4 stat cards por 3 blocos (como funciona em 3
  passos / diferenciais vs planilha / prova-resultado). FAQ expandiu de 5→6
  perguntas ancoradas em objeções reais de billing. Footer removeu links
  mortos (`href="#"`) e a coluna "Empresa". Todas as strings novas traduzidas
  nos 7 locales (checker de sync verde). **A régua do Free citada aqui como
  "em aberto (D-1)" foi resolvida em 2026-07-13** — ver entrada P-1..P-9
  abaixo; o pricing da landing foi corrigido em seguida (P-8) pra refletir a
  régua final.

- **2026-07-13 — Timezone visível na criação do lar (adendo ADR-0024)**: campo
  de fuso (`Select` sobre `IANA_TIMEZONES`, espelhando `edit-household-form`)
  adicionado ao formulário de criação — reverte a decisão original do
  ADR-0024 ("sem campo visível", auto-detecção silenciosa via
  `browserTimeZone()`). Auto-preenchimento mantido; agora editável antes de
  criar. Backend já suportava 100% (gap era só de UI). 7 locales.

- **2026-07-13 — D-1 resolvido: régua final do Free + paywall completo
  (adendo ADR-0026, P-1..P-9)**: até então só existia 1 capability
  (`advanced_reports`) e 1 rota gateada. Régua comercial decidida e
  implementada: **1 lar por dono, 2 membros/lar (dono+1), 0 categorias
  personalizadas (só as 13 padrão), 3 metas, 3 orçamentos ativos**; Family
  ilimitado em tudo. Capabilities novas: `custom_categories`, `report_export`
  (distinta de `advanced_reports` — visualizar o relatório mensal continua
  grátis, só o export CSV é Family). Feature nova: export CSV de relatório
  mensal/anual, reusando infra RPT-2 que já existia pronta sem consumidor
  (`csv.util.ts`, `ExportMenu`, `downloadCsv`). Limite de lares-por-dono não
  se encaixa no `HouseholdEntitlementGuard` (não há lar ainda na criação) —
  resolvido contando lares onde o usuário é `owner` via `findAllByAuthId`.
  Exceções dedicadas por recurso (não reusa `PremiumRequiredException`).
  Descobertos e corrigidos de passagem: 5 formulários do frontend sem
  nenhum tratamento de erro (`create-household`, `invite-member`,
  `category`, `goal`, `budget` — erros eram engolidos silenciosamente).
  Pricing da landing (PR #20) corrigido pra refletir a régua (P-8). **Fora de
  escopo, registrado como follow-up**: categorias-padrão sempre em pt-BR,
  independente do idioma do usuário — falta perguntar idioma no signup.
  Sem downgrade retroativo em lares que já excedem os novos limites. Ver
  detalhe completo em `domain-rules.md` §Free/Family e no adendo do
  ADR-0026.

- **2026-07-13 — Rollout de i18n para 7 idiomas + fechamento dos gaps (adendo
  ADR-0018)**: `pt-BR`/`en-US`/`es-ES`/`zh-CN`/`de-DE`/`fr-FR`/`ja-JP` (tags BCP
  47 completas; normalização de legado `en`→`en-US`/`es`→`es-ES` + migration
  `0001_locale_tags`). Checker de sync de locales (`bin/scripts/
  check-locales.mjs`) como gate no CI. Namespaces novos `landing` e `admin`
  (eram 100% hardcoded); legais seguem pt-BR-only com nota. **E-mails do
  backend implementados locale-aware** (nunca tinha sido feito, apesar do
  ADR original) — catálogo `mail-messages.ts` ×7 + fix de bug independente
  (welcome/invite carregavam copy stale do ink-ops/tatuagem). Erros de API
  traduzidos por código no front (`api.<CODE>`, fallback verbatim) sem tocar
  o backend. Stripe Checkout/Portal recebem `locale`. Traduções geradas pelo
  responsável; zh-CN/ja-JP sem revisão nativa (follow-up).

- **2026-07-13 — Review do RAG + eval + Qdrant compartilhado (adendo ADR-0016)**:
  primeiro harness de avaliação de retrieval (`bin/scripts/rag/eval.py` + golden
  set, roda pelo caminho de produção `hybrid_search`/`expand_parents`; baseline em
  `bin/scripts/rag/EVAL.md`). Baseline n=30: híbrido RRF hit@5 **1.00**, hit@3 0.97,
  MRR 0.736; ganho do híbrido concentrado em termo/símbolo/código. **Nenhum
  parâmetro alterado** (evidência): top_k=5 satura o recall, `MIN_SCORE=0.35`
  irrelevante, RRF > DBSF, chunks 400/60 sem sinal de problema. **Reranking avaliado
  e não adotado** (recall saturado → só reordena; MRR gap dentro do ruído; gatilho:
  hit@5 < ~0.9 ou precisão top-1). **Infra**: `docker-compose.rag.yml` virou **1
  Qdrant compartilhado** (`name: rag`, `rag-qdrant`, volume nomeado `rag-storage`,
  pin v1.18.1 + healthcheck) — 1 coleção por projeto (Larmony: `larmony_memory`);
  arquivo agora versionado (saiu do `.gitignore`). Hooks consolidados no
  `settings.json` (SessionStart sobe Qdrant + 1 reindex canônico; novo Stop), fim do
  double-reindex; `settings.local.json` podado (allowlist limpa). Dead code removido
  (`_SNIPPET_CHARS`), constantes internas documentadas no README.

- **2026-07-13 — Fase pre-production entregue (P-1..P-6)**: LGPD (páginas
  legais reais `pages/legal/*` — controlador "Larmony" + suporte@larmony.me;
  consentimento obrigatório no signup com `terms_accepted_at`/`terms_version`
  na migration 0011 e `TERMS_VERSION`); **ADR-0027** sessão localStorage vs
  cookie httpOnly (decisão: manter localStorage + hardening helmet/CSP;
  cookie inviável cross-site — `railway.app` na Public Suffix List; gatilho =
  domínio próprio) — a validação da CSP pegou e corrigiu quebra real (blob:
  p/ texturas GLTF do 3D da landing); **backup/restore** com script
  `db:backup` (fallback docker exec) + runbook + drill verificado (contagens
  idênticas); **squash das migrations** 0000–0011 → `0000_baseline`
  (concatenação literal; comando novo `migrator baseline` p/ bancos
  existentes — staging roda UMA VEZ; adendo no ADR-0003; validado com
  restore do estado antigo + `supabase db reset` + e2e full); **imagem
  standalone** do frontend (runner sem node_modules; `HOSTNAME=0.0.0.0`;
  healthcheck no railway.json). Gotcha registrado: 2 e2e de
  scheduled-transactions flakam na janela 21h–00h local (runner UTC-3 × lar
  UTC no spec) — verdes no CI/UTC; recalibrar o helper `isoDaysFromNow` fica
  como follow-up.

- **2026-07-12 — Fase billing-hardening entregue (pós-M14, ADR-0026 adendo)**:
  integração real local (Stripe test + webhooks reais via `stripe listen`,
  script `stripe:webhook` + runbook `docs/billing-local-testing.md`) + bateria
  de 8 cenários executada de verdade — **3 bugs pegos e corrigidos** (return
  URL do checkout/portal com rota inexistente; `cancelSubscription`
  não-idempotente; `source` classificava trial como stripe). Gaps fechados:
  job `billing-expiry-sweep` (aplica `comp_expires_at`, que era write-only, e
  `trial_ends_at`), **trial administrativo** por N meses (local, como comp;
  `TRIAL_NOT_ALLOWED` 422; source `trial`; TrialPanel no front + painel no
  admin) e **Free espelhado no Stripe** (`free_monthly` R$ 0, só catálogo —
  sem checkout). **Novo modelo de entrega adotado**: 1 branch/PR por fase,
  subtarefas como commits revisados+testados. Unit 96; e2e 17 specs/108.

- **2026-07-12 — Admin de isenção/desconto entregue (B-7, ADR-0026 §2/§3/§5 +
  adendo) — M14 (billing) CONCLUÍDO**: 4 rotas admin
  (`POST/DELETE /admin/households/:id/subscription/comp|discount`,
  `PlatformAdminGuard`). Comp 100% local (cancela sub Stripe se houver, preserva
  customer, nunca apaga dados); desconto sempre via Stripe Coupon. **Contrato de
  duração nativo do Stripe** (decisão do responsável): `{ percent?|amountCents?,
  duration: once|repeating|forever, durationInMonths? }`. Gateway ganhou
  createCoupon/applyCoupon/removeDiscount/cancelSubscription; repo ganhou
  grantComp/revokeComp/set|clearDiscountCache; entity expõe stripeCouponId/
  discountPercent. Exceções `INVALID_DISCOUNT`/`SUBSCRIPTION_NOT_STRIPE_LINKED`
  (422). Frontend `admin-billing.tsx` vira tela real (busca lar → estado →
  isenção/desconto; admin sem i18n). Auditoria `subscription_changed`. Backend +
  frontend no mesmo PR. 17 specs / 100 testes e2e verdes; verificado no browser.
  Detalhe no adendo de `.memory/adr/0026-billing-stripe-entitlements.md`.

- **2026-07-12 — Frontend de billing / paywall entregue (B-6, ADR-0026 §5 +
  adendo)**: `settings/subscription.tsx` deixa de ser placeholder — feature nova
  `features/subscription/` (hooks `use-subscription`/`use-entitlements`/
  `use-subscription-mutations` + `SubscriptionPage` + `PremiumGate`). Página
  mostra plano/status/source e ramifica Free (checkout) / premium (portal) /
  comp (isenção); botões owner-only; lê `?checkout=success|cancel`; redirect via
  `window.location.assign(url)` (padrão novo). **Paywall proativo** (decisão do
  responsável) no relatório anual: aba com cadeado + `PremiumGate` sem disparar
  a request condenada; 402 tratado defensivamente. Namespace i18n novo
  `subscription` (pt-BR+en). Só frontend — backend intacto. Verificado no
  browser (checkout → Stripe test; paywall Free; premium → portal + anual 200).
  Detalhe no adendo de `.memory/adr/0026-billing-stripe-entitlements.md`.

- **2026-07-12 — Entitlements aplicado / gating por rota entregue (B-4, ADR-0026
  §7 + adendo)**: liga o `EntitlementsService` (antes dead-end com
  `capabilities: {}`) ponta a ponta. Modelo de capabilities no domínio
  (`subscriptions/domain/entitlements.ts`: `ResolvedPlan` + `CAPABILITIES` +
  `PLAN_CAPABILITIES`; `custom`/comp = premium). Gate **capability-based**
  (decisão do responsável): `@RequireCapability("advanced_reports")` +
  `HouseholdEntitlementGuard`, espelhando `@RequireModule`/`HouseholdModuleGuard`.
  Bloqueio → **HTTP 402** (`PremiumRequiredException`, code `PREMIUM_REQUIRED`)
  para o paywall do B-6 distinguir "upgrade" de "sem permissão". `GET
  subscription` passa a expor `entitlements` (aninhado, top-level preservado).
  Rota-referência gateada: `reports/annual` = premium-only, `monthly` fica Free.
  **D-1 (régua final do Free) segue em aberto** — só relatórios avançados
  gateado por ora; limites por contagem (lares/membros) em follow-up. 16 e2e
  specs / 95 testes verdes. Detalhe no adendo de
  `.memory/adr/0026-billing-stripe-entitlements.md`.

- **2026-07-12 — Webhook Stripe + reconciliação entregues (B-3, ADR-0026 §5/§8 +
  adendo)**: `POST /webhooks/stripe` (público, `@SkipThrottle()`, verifica
  assinatura via `rawBody: true` novo em `main.ts`) + `billing-reconciliation`
  (cron). Caminho de sync único (`syncFromStripe` + `mapStripeStatus` em
  `subscription-sync.ts`) usado tanto pelo webhook quanto pela reconciliação —
  comp (`type='custom'`) tem precedência e nunca é rebaixado por evento
  Stripe. `stripe_webhook_events` (B-1) usada pela 1ª vez para idempotência
  (`claim` via `INSERT ON CONFLICT DO NOTHING`). Catálogo (`billing_plans`)
  também passa a sincronizar ao vivo via `product.updated`/`price.updated`.
  e2e offline com `generateTestHeaderString` (sem Stripe CLI). 15 specs / 91
  testes e2e verdes, sem regressão. Detalhe completo no adendo de
  `.memory/adr/0026-billing-stripe-entitlements.md`.

- **2026-07-12 — ADR-0026 Billing/Entitlements entregue (checkpoint C1, M14)**:
  contrato técnico do billing definido antes de qualquer código. Estende o
  shell `subscriptions` existente (não substitui) — `type='custom'` já cobria
  o caso de isenção, nenhuma migração de enum necessária; RLS já era
  super_admin-only para escrita, nenhuma policy nova. Requisito do responsável:
  super-admin concede **desconto** (via Stripe Coupon, criado/anexado pela
  nossa API) ou **isenção total/comp** (100% local, cancela a Stripe sub se
  houver) — em ambos os casos **sem o operador abrir o dashboard do Stripe**,
  tudo pelo admin do Larmony. Reusa guards/serviços existentes
  (`PlatformAdminGuard`, `HouseholdOwnerGuard`, `AuditService.logByAuthId` com
  `subscription_changed` já no enum) — nenhum mecanismo novo de autorização.
  Nova tabela `stripe_webhook_events` para idempotência do webhook (PK =
  event id do Stripe), sem persistir payload completo (minimização de dado
  sensível). `EntitlementsService` como novo ponto único de gating
  server-side, exportado no mesmo padrão de bridge cross-módulo do
  `DispatchNotificationUseCase` (ADR-0023). Detalhes em
  `docs/product/features/15-billing-entitlements.md`. Backlog de execução
  (B-1..B-7) no plano de coordenação do ciclo de lançamento.

- **2026-07-11 — M12 timezone dos disparos entregue (ADR-0024)**: cron passa a
  resolver "agora" no fuso do lar. `households.timezone` (IANA) +
  `notification_hour` (migration 0008); helper `common/time/tz-clock.ts`
  (date-fns-tz): `zonedNow`/`localISODate`/`localHour`. Engine auto gera quando
  a data local do lar chega (`findDue` busca até teto UTC+14 + JOIN do fuso;
  corte fino em código); lembrete e relatório mensal saem a partir da
  `notification_hour` local, dedup em data local do lar. Âncora de orçamentos
  (`currentPeriodStart`/`currentMonthYear`) migrada para exigir timezone
  (cumpre a promessa do ADR-0022) — budgets/overview resolvem o fuso do lar.
  **Escopo por-lar, não por-usuário** (hora/fuso e dedup por-destinatário
  adiados p/ pós-v1.1 — evita redesenhar o dedup "nunca por usuário" do M11).
  Frontend: criação auto-detecta o fuso do navegador; Configurações do lar têm
  seletor de fuso (lista IANA via `Intl.supportedValuesOf`) + hora. 54 unit
  (tz-clock Kiritimati/Midway/DST + 3 jobs com `now` controlado) + 78 e2e
  (households cobre create/update/validação de fuso) verdes. Gotcha:
  `Intl.supportedValuesOf` existe no runtime mas não na lib de tipos do TS
  (cast pontual back+front); `toISODate`/`monthBounds` legados misturam
  construtor local + `toISOString` (só corretos em processo UTC) — por isso os
  helpers novos usam `formatInTimeZone` (robustos a qualquer TZ). Detalhes em
  `domain-rules.md` §Timezone e `docs/product/features/13-cron-horario-timezone.md`.
- **2026-07-04 — Bootstrap do Larmony**: repo nasceu como cópia da carcaça ink-ops;
  domínio de estúdio removido (Fase 1); old-larmony é a fonte do domínio, esta
  arquitetura é a fonte do *como*. Ver `project-overview.md` e `roadmap.md`.
- **2026-07-04 — Sem permissões por módulo no v1**: households têm 2–4 pessoas;
  roles `owner`/`member` bastam. `member-permissions.ts` (back) e `MODULE_KEYS`
  (front) ficam vazios até existir necessidade real.
- **2026-07-04 — Recorrência fora do v1**: campos e engine só no M9, com design próprio.
- **TDD obrigatório por module**: regra em `domain-rules.md` (test-first;
  unitário + integração por module). Herdada da carcaça.
- **2026-07-07 — M8 Relatórios entregue**: módulo `reports` (backend) +
  `features/reports` (frontend Recharts). Endpoints `GET
  /households/:id/reports/monthly` e `/annual?year=`. Agregação read-only sem
  schema novo; gasto por pessoa via `person_id`. Validado no browser com dados
  reais (bar 6m, donut categoria, lista pessoa, vista anual com cards + nav ano).
- **2026-07-07 — Dev Turbopack cache corrompido**: se `/dashboard/household/[slug]`
  retorna 404 no dev, o `404.tsx` manda de volta para `/dashboard/households`.
  Fix: `pnpm --filter frontend dev:reset`. Build de produção não é afetado.
- **2026-07-08 — M9 Recorrência entregue → v1 COMPLETO**: módulo `recurrences`
  (backend + frontend). Modelo simples (`frequency` weekly/monthly/yearly +
  `interval`, sem RRULE), engine no tick do cron gerando ocorrências vencidas.
  Decisão-chave: o engine **não reusa `CreateTransactionUseCase`** (grava via
  `DRIZZLE` RLS request-scoped, morto no cron) — em vez disso
  `DrizzleTransactionRepository` ganhou `DRIZZLE_ADMIN` + `createGenerated`,
  exposto por `CreateGeneratedTransactionUseCase` (sem auditoria). Idempotência
  por **avançar-cursor-antes-de-inserir** (gaps-over-dups). Sem rateio/
  parcelamento no v1. Migration `0002_recurrences` (hand-written + RLS). Detalhes
  e gotchas em `roadmap.md`/`architecture.md`/`domain-rules.md`. Migration + specs
  validados no Supabase local (9 e2e + 11 unit + regressão cron/transactions verde).
- **2026-07-09 — Unificação bills+recurrences → "Lançamentos" (ADR-0020)**:
  módulo `scheduled-transactions` substitui `bills`+`recurrences` por completo
  (deletados, sem período de coexistência). Eixo que separa os dois modos é
  `posting_mode` (`auto`|`manual`), não o tipo — por isso o lançamento programado
  é type-neutral (receita ou despesa). Dois helpers de "próxima data": cursor-based
  (`nextRunOnOrAfter`, só engine `auto`) vs stateless (`nextManualOccurrence`, só
  lembrete/card `manual` — evita drift de clamp de dia-de-mês). Dedup do lembrete
  mudou de mês para dia (bug latente em bills para cadências não-mensais, nunca
  ocorria porque bills só tinha `monthly`). Migration `0005` preserva `id` de
  recurrences (valida backfill de `transactions.recurrence_id`) e sintetiza
  `start_date` de bills a partir de `due_day`. Rotas `/bills` e `/recurrences`
  removidas sem redirect (app interno). Migration + 34 unit + 67 e2e verificados
  no Supabase local; browser: nav única "Lançamentos", toggle auto↔manual
  re-ancorando cursor, launch manual criando transação real, dashboard "Próximos
  lançamentos". Detalhes em `domain-rules.md` §Lançamentos programados e
  `docs/product/features/10-lancamentos-programados.md`.
- **2026-07-10 — M10 Orçamentos recorrentes entregue (ADR-0022)**: `budgets`
  vira série por categoria + `budget_versions` (histórico de limites),
  resolução do limite on-read (`DISTINCT ON`, nunca materializada). Editar
  sempre faz upsert da versão do mês corrente (nunca toca o passado); série
  com `ended_from` preenchido (não é mais a aberta) → 422 ao editar. Remover
  sempre encerra a série (nunca hard delete). `currentPeriodStart()`/
  `currentMonthYear()` centralizam "mês corrente" em `common/finance/
  due-date.ts` (prepara M12). Overview (`budgetsProgress`) replica a mesma
  resolução. Migration `0006` sem backfill de valores (staging é dado de
  teste descartável — decisão do kickoff). Gotcha de ambiente resolvido no
  caminho: `drizzle.__drizzle_migrations` local estava com hashes de
  0000-0002 divergentes do conteúdo atual dos arquivos e 0004/0005 nunca
  registradas (embora já aplicadas) — corrigido recalculando os hashes reais
  e reinserindo as linhas faltantes antes de rodar a 0006 (bookkeeping puro,
  sem tocar dado/schema). 11 e2e novos (herança, projeção, imutabilidade,
  reabertura de série) + 72 e2e/34 unit da suíte completa seguem verdes;
  Playwright cobre CRUD no mês corrente + navegação para mês passado/futuro
  somente-leitura. Detalhes em `domain-rules.md` §Orçamentos e
  `docs/product/features/11-orcamentos-recorrentes.md`.
- **2026-07-10 — Batch de polimento de UI (pós-M10)**: 5 melhorias de frontend
  (+1 linha no backend do overview). (1) Lançamentos deixou de ser lista de
  linhas custom e virou Table+cards (lista única ativos-primeiro, inativos
  esmaecidos). (2) Paginação **client-side** uniforme (`usePagination` +
  `Pagination`, 10/25/50/100) em transações/categorias/lançamentos — decisão
  de não fazer server-side porque as listas são naturalmente limitadas (regra
  27 de UI). (3) Fix do submenu "Idioma" que não pintava — `DropdownMenuSubContent`
  precisava de `Portal` (regra 28). (4) Onboarding utilizável no mobile — o
  spotlight só mede alvo on-screen (drawer off-canvas) e usa placement "bottom"
  no mobile; **decisão explícita de NÃO migrar para biblioteca** (driver.js/
  NextStepjs) porque a causa-raiz era coordenação do drawer, não o motor de
  render, e NextStepjs traria framer-motion que o projeto evita. (5) Dashboard
  mostra 20 recentes (era 5) com scroll interno casando a altura da coluna
  lateral (regra 29). Verificado ao vivo com o seed + suíte e2e verde (72
  backend, Playwright budgets/transactions/scheduled). Gotcha corrigido de
  passagem: flake de fuso no `isoDaysFromNow` do e2e de scheduled-transactions
  (usava UTC, app usa local). Detalhes em `domain-rules.md` regras 24/27/28/29.
- **2026-07-11 — M11 Notificações multicanal entregue (ADR-0023)**:
  `DispatchNotificationUseCase` (in-app sempre + e-mail real + SMS/WhatsApp
  ports stub atrás de flag, sem provedor integrado) substitui o antigo
  `NotificationService.notify()`. `notification_preferences` (matriz por
  usuário, evento×canal, default e-mail on/sms-whatsapp off) +
  `notification_dedup` (tabela dedicada household-scoped, não coluna em
  goals/budgets). 5 eventos: lembrete de lançamento (migrado), meta atingida,
  orçamento estourado (resolve limite via `budget_versions`/M10), lançamento
  automático (sem dedup — idempotência estrutural do cursor), relatório
  mensal (novo cron `monthly-report`, último dia do mês, baseline UTC).
  **Bug real pego em e2e antes do merge**: `budget_exceeded` sempre lia via
  `DRIZZLE_ADMIN`, mas a despesa recém-gravada por
  `CreateTransactionUseCase` ainda estava numa transação Postgres aberta na
  conexão `DRIZZLE` do request (`RlsInterceptor` só commita ao fim do
  request) — invisível para uma conexão diferente. Fix: leitura via `DRIZZLE`
  nos chamadores request-scoped, variante `...Admin` (`DRIZZLE_ADMIN`) só
  para o chamador de cron (engine de auto-lançamento). Regra geral: um check
  "leio o que acabei de escrever" usa a MESMA conexão da escrita. Frontend:
  `NotificationsSection` no Account (matriz `Table`+`Switch`, SMS/WhatsApp
  sempre desabilitados). 77 e2e + typecheck/lint verdes; verificado ao vivo
  no browser (transação estourando orçamento → notificação aparece no sino
  após refresh). Detalhes em `domain-rules.md` §Notificações e
  `docs/product/features/12-notificacoes-multicanal.md`.
- **2026-07-11 — i18n das notificações (render-at-send, adendo ADR-0023)**: as
  notificações eram hardcoded pt-BR nos 5 use-cases. Agora os use-cases passam
  `type` + params estruturados (união discriminada) e o dispatcher renderiza
  por destinatário no idioma do perfil (`users.locale`), gravando o texto já
  traduzido na linha in-app (render-at-send — zero mudança no frontend, o sino
  lê title/body como antes). Catálogo função-por-mensagem (TS puro, sem dep) em
  `notifications/application/i18n/`, 3 locales (pt-BR/en/es, fallback pt-BR).
  **Moeda fixa em pt-BR/BRL** (igual ao frontend `formatCentsToBRL`); só datas/
  nomes de mês seguem o locale. Descoberta: **não havia infra de i18n no
  backend** — e-mails também são hardcoded pt-BR (a nota antiga em domain-rules
  e o ADR-0018 eram aspiracionais); esta é a fundação, escopada a notificações
  (e-mails = track separado). Verificado ao vivo: conta em inglês, despesa
  estourando orçamento → sino mostra "Budget for … exceeded" (com R$) ao lado
  de uma notificação antiga ainda em pt-BR. 78 e2e + 41 unit verdes (corrigi de
  passagem 2 unit specs de scheduled-transactions que estavam quebrados desde o
  M11 — nunca tinham sido rodados via `pnpm test`). Detalhes em
  `domain-rules.md` §Notificações/§i18n.
