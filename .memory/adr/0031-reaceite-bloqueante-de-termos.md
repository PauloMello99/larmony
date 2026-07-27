# ADR-0031 — Re-aceite bloqueante de Termos de Uso após mudança material (bump de `TERMS_VERSION`)

- **Status:** Aceito
- **Data:** 2026-07-27
- **Relacionados:** ADR-0029 (assinatura pago-only, 2 tiers — motivo do bump
  desta versão dos Termos), ADR-0027 (sessão via localStorage), ADR-0030
  (aviso de cookies — deliberadamente fora do par acoplado descrito abaixo)

## Contexto

Os Termos de Uso publicados descreviam um produto que não existe mais: plano
gratuito + Premium a R$ 14,90/mês, modelo superado pelo ADR-0029 (pago-only,
2 tiers — Essencial R$ 9,90 e Completo R$ 19,90 — com trial self-serve). Ao
corrigir o texto dos Termos para refletir o modelo comercial vigente e
incrementar `TERMS_VERSION`
(`apps/backend/src/modules/auth/terms-version.ts`), toda a base de usuários
existente passa a ter `termsVersion` desatualizado no banco. Sem um mecanismo
de re-aceite, essa base continuaria operando sob condições comerciais de
cobrança que nunca aceitou, sem registro de consentimento válido para as
novas condições — risco relevante dado que há cobrança real ativa (ADR-0026,
ADR-0029).

## Decisão

Modal bloqueante — `TermsReacceptDialog`
(`apps/frontend/src/features/auth/components/terms-reaccept-dialog.tsx`) —
montado em dois pontos autenticados da aplicação:

1. `AuthGuard` (`apps/frontend/src/features/auth/components/auth-guard.tsx`),
   cobrindo o fluxo autenticado padrão;
2. A página de aceite de convite (`pages/invite/accept.tsx`), único ponto
   autenticado da aplicação que fica fora do `AuthGuard`.

**A flag `termsAcceptanceRequired` é computada no servidor**, dentro do
`GetMeUseCase`, comparando `user.termsVersion !== TERMS_VERSION` — nunca no
cliente. Isso evita que o frontend precise conhecer ou hardcodear a versão
vigente dos Termos; ele só reage a um booleano vindo do backend.

O endpoint `POST /auth/me/accept-terms` **não aceita a versão no body** — o
cliente não escolhe o que está aceitando, o servidor decide. O endpoint grava
`termsVersion`/`termsAcceptedAt` a partir da constante do servidor e audita o
evento com `action: "update"` + `entityType: "terms_acceptance"` — reuso
deliberado de uma action já existente no enum `auditActionEnum`, evitando
migration de schema para um evento de baixa frequência (mesmo espírito de
reuso de enum já registrado no ADR-0029, item "Consequências", para
`subscription_type`).

O modal precisa oferecer saídas obrigatórias para quem recusa aceitar:
sign-out, link para a página de exclusão de conta (`/account`) e contato de
suporte. A rota `/account` é explicitamente **isenta** do próprio bloqueio —
caso contrário, a saída de "encerrar conta" ficaria inacessível, bloqueada
pelo mesmo modal que ela deveria contornar.

## Consequências

- `TERMS_VERSION` deixa de ser uma constante inerte: a partir de agora, **todo
  bump força o modal de re-aceite para 100% da base logada** no próximo
  request autenticado. Isso é uma ferramenta poderosa e não deve ser usada
  para mudanças cosméticas nos Termos — só para mudanças materiais (ex.:
  alteração de modelo de cobrança, nova cláusula relevante).
- `apps/backend/src/modules/auth/terms-version.ts` (backend,
  `TERMS_VERSION`) e `apps/frontend/src/shared/lib/legal-info.ts` (frontend,
  `LEGAL_VERSION`) formam um **par acoplado que só deve mudar junto, em um
  único PR/deploy**: nunca subir a versão do backend sem o texto/modal
  correspondente já estar em produção no frontend, e vice-versa — um
  descompasso faria o backend sinalizar re-aceite para termos que o frontend
  ainda não sabe exibir corretamente (ou o inverso, um texto novo sem o
  gatilho de re-aceite correspondente).
- `/legal/cookies` (ADR-0030) fica **deliberadamente fora** desse par
  acoplado — usa uma constante de "última atualização" própria, não
  `LEGAL_VERSION`. Uma correção de typo ou detalhe factual na página de
  cookies não deve disparar re-aceite bloqueante para toda a base.

## Alternativas rejeitadas

- **Aviso não-bloqueante**, confiando na cláusula de "uso continuado implica
  concordância" já presente nos próprios Termos: rejeitada por produzir um
  registro de consentimento mais fraco justamente para a cláusula de
  cobrança — inaceitável havendo cobrança real ativa sobre os usuários.
- **Bump de versão sem nenhum mecanismo de re-aceite**: rejeitada por deixar
  toda a base operando sob condições comerciais que nunca aceitou, sem
  qualquer registro de consentimento para as novas condições.

## Fora de escopo

- Re-aceite granular por cláusula (aceitar parte dos Termos e não outra) —
  o modelo é tudo-ou-nada, como o próprio contrato de Termos de Uso.
- Notificação por e-mail avisando da mudança de Termos antes do login — fica
  como trabalho futuro se a frequência de bumps justificar o investimento.
