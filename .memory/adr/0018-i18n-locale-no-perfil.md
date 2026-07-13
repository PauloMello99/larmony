# ADR-0018 — i18n pt-BR/en com locale persistido no perfil

**Status:** Aceito
**Data:** 2026-07-04

## Contexto

O old-larmony suportava `pt-BR` (padrão) e `en` com i18next, persistindo o locale
em `profiles.locale`. O Larmony mantém o requisito: a UI e os e-mails transacionais
devem respeitar o idioma de cada usuário.

## Decisão

- Idiomas do v1: **`pt-BR` (padrão)** e **`en`**.
- Locale persiste em `users.locale` (`text`, default `'pt-BR'`); endpoint de update
  no módulo `user`; seletor na página Account.
- Frontend Next.js (pages router): **next-i18next**, namespaces por feature,
  strings via `useTranslation()` — nenhum texto de UI hardcoded em componentes novos.
- E-mails: templates React Email recebem `locale` (do destinatário) e resolvem
  strings pelo mesmo catálogo.
- Moeda continua **BRL** independente do idioma (produto brasileiro); datas usam
  o locale ativo (date-fns).

## Consequências

- M1 instala a fundação (config, namespaces, seletor); features seguintes já
  nascem traduzidas (chaves nos dois idiomas por PR).
- A landing pode permanecer pt-BR-only até o produto pedir o contrário.

## Adendo (2026-07-13) — Rollout para 7 idiomas + fechamento dos gaps de i18n

Decisão do §13 (doc de viabilidade): lançar suportando **7 idiomas** — `pt-BR`
(padrão), `en-US`, `es-ES`, `zh-CN`, `de-DE`, `fr-FR`, `ja-JP`. Revisão completa
do i18n (consultado o ZipTalk como referência — não adotado por inteiro) +
varredura de todas as páginas (incl. Stripe e landing) atrás de hardcoded.

**Estado herdado (antes deste adendo):** o app já tinha evoluído para 3 locales
(`pt-BR`/`en`/`es`, além do previsto originalmente), com 26 páginas conectadas
e schemas Zod já localizados — mais avançado do que este ADR documentava. Mas
com gaps reais: landing e admin 100% hardcoded (sem namespace próprio),
e-mails do backend 100% hardcoded pt-BR (**nunca implementado** apesar da
decisão original acima), erros de API exibidos verbatim, e dois locale-JSON
com drift (`es/subscription.json` faltando; `es/households.json` com bloco
stray).

**Decisões desta fase:**
- **Tags BCP 47 completas** (`en-US`/`es-ES`, não mais `en`/`es`) — tags antigas
  são normalizadas na leitura (front `normalizeLocale`, back
  `common/i18n/app-locale.ts`, ambos com mapa de legado + match por
  idioma-base) e uma migration (`0001_locale_tags`) saneia `users.locale`
  existente. Lista de locales segue duplicada manualmente em ~5 lugares
  (documentado nos comentários de cada arquivo) — aceito como custo do design
  sem geração de código.
- **Checker de sync de locales** (`bin/scripts/check-locales.mjs`, gate no CI):
  compara o key-set + placeholders de cada namespace contra `pt-BR` (fonte).
  Ideia adaptada do ZipTalk (lá, um `TranslationType` único do TypeScript fazia
  esse papel; aqui, com JSON por namespace, o checker cobre o mesmo risco).
- **Namespaces novos**: `landing` e `admin` (100% hardcoded antes). Legais
  (`termos-de-uso`/`privacidade`) **seguem pt-BR-only** — prosa jurídica não
  é traduzida (revisão jurídica ficaria cara/arriscada); ganharam uma nota
  localizada (`landing.legal.officialNotice`) informando que o documento
  oficial é em português.
- **E-mails do backend implementados** (cumprindo a decisão original, nunca
  feita): catálogo `modules/mail/i18n/mail-messages.ts` (mesmo padrão do
  catálogo de notificações), templates recebem `locale`. Locale do convite =
  do **remetente** (convidado ainda não tem conta). Corrigido de quebra:
  welcome/invite carregavam copy do produto anterior (ink-ops/tatuagem —
  "Boa tatuagem! 🖤", "no Ink") — bug independente de i18n, fixado junto.
- **Erros de API traduzidos por código, não na fonte**: o backend já emite
  códigos estáveis (`domain-status.map.ts`, ~55 códigos). O front mapeia
  `api.<CODE>` → mensagem localizada, com fallback ao texto verbatim do
  backend para código desconhecido (`translateApiError`, `defaultValue` do
  i18next). Decisão explícita: **não** localizar as exceções na fonte agora
  (custo maior, backend teria que resolver idioma por request).
- **Stripe Checkout/Portal recebem `locale`** — a página hospedada abre no
  idioma da UI. Evita o bug visto na referência consultada (Portal sempre
  hardcoded num idioma, independente do usuário).
- **Moeda continua BRL sempre** (decisão original mantida) — datas/números
  seguem o locale ativo (`Intl`/date-fns, mapa expandido para os 7).
- **Tradução gerada pelo responsável** (via IA) para os 7 idiomas — zh-CN e
  ja-JP sem revisão nativa ainda; marcado como melhoria futura antes de
  investimento pesado de marketing nesses mercados.

**Gatilho de revisão futura:** se o produto expandir para mercados que exigam
métodos de pagamento locais/moeda local, revisitar a decisão de BRL-sempre
(ADR original) e a ausência de revisão nativa em zh-CN/ja-JP.
