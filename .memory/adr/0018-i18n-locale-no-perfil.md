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
