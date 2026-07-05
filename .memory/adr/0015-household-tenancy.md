# ADR-0015 — Household como unidade de tenancy

**Status:** Aceito
**Data:** 2026-07-04
**Relacionado:** ADR-0005 (multi-tenant single DB + RLS), ADR-0013 (super_admin)

## Contexto

O Larmony herdou da carcaça ink-ops um shell multi-tenant completo baseado em
`organizations` (memberships, invitations, guards `OrgMembershipGuard`/`OrgOwnerGuard`,
helpers RLS `is_org_member`/`is_org_owner`, rotas `[orgSlug]`). No domínio do Larmony
o tenant é o **household** (lar): 2–4 pessoas compartilhando finanças domésticas.

O old-larmony implementava o isolamento com um helper `my_household_ids()` consultado
em cada policy, com o frontend falando direto com o PostgREST.

## Decisão

1. **Renomear o padrão org → household ponta a ponta** (M1): schema
   (`households`, `household_memberships`, `household_invitations`), módulo NestJS
   (`organizations` → `households`), guards (`HouseholdMembershipGuard`,
   `HouseholdOwnerGuard`), helpers RLS (`is_household_member`, `is_household_owner`),
   rota `[orgSlug]` → `[householdSlug]`, enum `household_role (owner|member)`.
   Adotamos a linguagem do domínio em vez de manter "org" genérico.
2. **Manter o padrão RLS da carcaça** (superior ao `my_household_ids()` do old-larmony):
   role `app_user` NOBYPASSRLS + `set_config('request.jwt.claims', ...)` por request
   via `RlsInterceptor`, policies sobre `auth.uid()` + helpers.
3. **Roles apenas `owner` | `member`** no v1 — sem permissões por módulo
   (`member-permissions`/`MODULE_KEYS` ficam vazios). Owner gerencia
   membros/convites/settings.
4. **Invitations do shell são reaproveitadas 1:1** (token hex, expiração de 7 dias) —
   equivalem ao `household_invites` do old-larmony.
5. **`subscriptions` e super_admin permanecem como shell** (fora do roadmap v1;
   ADR-0013 continua válido para administração da plataforma).

## Consequências

- Rename é transversal (backend, frontend, RLS, cache keys) — feito em um único PR
  mecânico com build como rede de segurança (M1).
- `household_id` nunca vem do cliente em inserts — sempre derivado da sessão.
- Toda nova tabela de domínio nasce com `household_id` + policies RLS.

## Alternativas consideradas

- **Manter "organization" como termo genérico** — evitaria o rename, mas o descompasso
  domínio↔código cobra caro em cada conversa e cada feature nova. Rejeitado.
- **Portar `my_household_ids()`** — mais simples de ler, porém sem a separação
  admin/app roles e sem o contrato `request.jwt.claims` já pronto na carcaça. Rejeitado.
