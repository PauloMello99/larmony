# ADR-0030 — Aviso de cookies sem banner de consentimento, com gatilho de reversão

- **Status:** Aceito
- **Data:** 2026-07-27
- **Relacionados:** ADR-0027 (sessão via localStorage, não cookie), ADR-0018
  (i18n locale no perfil), ADR-0014 (telemetria de erro via Better Stack)

## Contexto

O produto usa hoje apenas um cookie: `NEXT_LOCALE` (preferência de idioma,
`apps/frontend/src/shared/lib/locale.ts`), estritamente essencial/funcional,
validade de 1 ano, sem nenhum propósito de rastreamento. A sessão de
autenticação não vive em cookie — fica em localStorage (ADR-0027). Não há
nenhum tracker de marketing ou analytics de terceiros no código: nem pixel de
ads, nem ferramenta de product analytics, nem A/B testing, nem
heatmap/session-replay, nem chat de terceiros com cookie próprio. A
telemetria existente (Better Stack, ADR-0014) é operacional — captura erro de
runtime — e não rastreia navegação nem comportamento do usuário.

A LGPD, diferente do regime europeu de ePrivacy/GDPR, não exige opt-in prévio
para cookies estritamente necessários ou funcionais equivalentes. Como o único
cookie do produto se enquadra nessa categoria, não há hoje uma obrigação legal
de banner de consentimento — mas há uma obrigação de transparência sobre o que
é usado e por quê.

## Decisão

Publicar um **aviso** dedicado na rota `/legal/cookies`
(`apps/frontend/src/pages/legal/cookies.tsx`) explicando o inventário de
cookies do produto (hoje, só `NEXT_LOCALE`) e justificando explicitamente por
que não há banner de consentimento — em vez de implementar um CMP
(Consent Management Platform) ou qualquer banner.

**Gatilho de reversão (o ponto central desta decisão):** a ausência de banner
deixa de ser válida no instante em que qualquer cookie/tracker não-essencial
for adicionado ao produto. Isso inclui, sem se limitar a:

- Analytics de produto (Google Analytics, PostHog, Mixpanel);
- Pixel de ads (Meta Ads, TikTok Ads, Google Ads remarketing);
- Ferramenta de A/B testing com cookie de bucketing;
- Heatmap ou session-replay (Hotjar, FullStory, Clarity);
- Chat/suporte de terceiros com cookie próprio (Intercom, Crisp, Drift).

Ao integrar qualquer um desses, um banner de consentimento **prévio** (opt-in,
bloqueando o carregamento do script até aceite) passa a ser obrigatório antes
do primeiro carregamento — e este ADR deve ser marcado como **Superado**,
com um novo ADR descrevendo o CMP escolhido.

## Consequências

- `/legal/cookies` precisa ser atualizado manualmente sempre que um cookie
  novo (essencial ou não) for introduzido — não há mecanismo automático de
  inventário.
- Qualquer PR que adicione um script de terceiro com cookie próprio deve
  tratar a implementação do banner de consentimento como pré-requisito
  bloqueante da própria feature, não como débito técnico para depois — a
  ordem é banner primeiro, tracker depois.
- `/legal/cookies` usa uma constante própria de "última atualização", não
  `LEGAL_VERSION` (ver ADR-0031) — corrigir um typo ou detalhe factual nessa
  página não deve dar a impressão de que há uma mudança material de termos.

## Alternativas rejeitadas

- **CMP completo agora** (banner com granularidade de categorias, hoje): custo
  de UX (fricção em toda primeira visita) e de engenharia sem ganho legal
  correspondente, já que não existe nenhum cookie não-essencial no produto
  hoje. Adiado até o gatilho de reversão disparar.
- **Banner "informativo" sem opt-in real** (só um aviso dispensável, sem
  bloquear nada): rejeitado por ser teatro de conformidade — teria adicionado
  fricção de UX ao único cookie essencial (`NEXT_LOCALE`) sem nenhuma
  necessidade legal ou prática, já que cookie essencial não exige opt-in.

## Fora de escopo

- Categorização granular de cookies (essencial/analytics/marketing) na
  própria página — hoje há uma única categoria (essencial).
- Integração com Google Consent Mode ou qualquer API de sinalização de
  consentimento — só relevante quando o CMP do gatilho de reversão for
  implementado.
