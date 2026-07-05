# 01 — Households core (M1)

## Escopo

- Rename `organization` → `household` ponta a ponta (schema, módulo, guards, helpers
  RLS, rotas `[householdSlug]`) — ver ADR-0015.
- Squash das migrations herdadas: baseline `0000` (schema finance) + `0001_rls_policies`.
- Fluxo de signup → setup do lar (criar ou aceitar convite), com seed das 13
  categorias padrão por use-case.
- Convites por e-mail (token, 7 dias) — reaproveita invitations do shell + módulo mail.
- Switcher multi-lar (persistência do lar ativo + invalidação de queries na troca).
- Fundação de i18n (next-i18next, pt-BR/en, locale em `users.locale`) — ver ADR-0018.
- Landing com copy do Larmony (hoje é copy genérica renomeada).

## Regras

- Roles: `owner` | `member`; sem permissões por módulo (ver `.memory/domain-rules.md`).
- `household_id` nunca vem do cliente; RLS com `app_user` + helpers `is_household_*`.
- Só owner convida/remove membros e edita settings do lar.

## Fora de escopo

- OAuth (reavaliar depois), billing, permissões por módulo.
