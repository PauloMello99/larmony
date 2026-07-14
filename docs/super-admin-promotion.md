# Runbook — promover/rebaixar super_admin (DB-only)

Decisão do M15 (redesign do admin): **não existe rota nem UI** para alterar
`users.platform_role`. A promoção/rebaixamento de super_admin é uma operação
deliberadamente manual no banco — sem superfície de sistema para escalar
privilégio de plataforma (um super_admin comprometido não consegue criar
outros; um bug de guard não vira promoção).

## Como executar

No SQL editor do Supabase do ambiente (ou `psql` com o role `postgres`):

```sql
-- Promover
UPDATE users SET platform_role = 'super_admin', updated_at = now()
WHERE email = 'pessoa@exemplo.com';

-- Rebaixar
UPDATE users SET platform_role = 'user', updated_at = now()
WHERE email = 'pessoa@exemplo.com';

-- Verificar (sempre, após qualquer mudança)
SELECT email, platform_role FROM users WHERE platform_role = 'super_admin';
```

## Regras

- **Verifique o e-mail duas vezes** — o UPDATE por e-mail não tem confirmação.
- Nunca rebaixe o **último** super_admin (a query de verificação acima deve
  retornar pelo menos 1 linha depois da mudança) — sem super_admin, o painel
  `/admin` fica inacessível e a recuperação é outro UPDATE manual.
- A mudança vale no **próximo request** (o `PlatformAdminGuard` consulta
  `users.platform_role` a cada chamada — não há cache de sessão a invalidar).
- Registre o motivo onde fizer sentido (o UPDATE manual não passa pelo
  `AuditService` — anote em canal interno se a rastreabilidade importar).

## Histórico

- Até o M15 existia `PATCH /admin/users/:id/platform-role` (com guard de
  auto-rebaixamento). Removida junto com os botões da UI — ver ADR do M15.
