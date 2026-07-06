# 07 — Contas a pagar (M7)

> **Entregue (2026-07-06)**: CRUD completo via `households/:householdId/bills`
> (RLS via `DRIZZLE`) somado à fatia cron já validada (job
> `send-bill-reminders`, dedup bill×mês). O repositório passou a injetar
> `DRIZZLE` (CRUD) + `DRIZZLE_ADMIN` (os 3 métodos do cron, sem quebra —
> `cron.e2e-spec` confirmou). "Lançar como transação"
> (`LaunchBillAsTransactionUseCase`) reusa o `CreateTransactionUseCase` do
> módulo transactions (exportado para esse fim) — cria uma despesa com a data
> de hoje, valor/categoria da bill, e **a bill nunca é consumida/apagada**:
> lançar é sempre uma ação manual e explícita do usuário. Frontend: seções
> Ativas/Inativas, Switch inline de `isActive`, alerta amber quando
> `daysUntilDue ≤ 7`, Select de lembrete {1,3,7,15}.
>
> **Validado ao vivo (2026-07-06)**: seed de bill com janela de disparo exata →
> 1º tick cria a notificação in-app + loga o e-mail (no-op, flag off) e grava
> `reminder_last_sent_at`; 2º e 3º ticks no mesmo mês → **zero notificações
> novas** (`count=1` após 3 ticks). Dedup por contexto bill×mês confirmado
> sem mocks, direto no banco local.

## Escopo

- CRUD de bill: nome, `amount_cents`, `due_day` (1–31), categoria opcional,
  `is_active` (Switch inline), `reminder_days_before` (1/3/7/15 ou sem lembrete).
- Listagem separada Ativas / Inativas; alerta amber para vencimento ≤7 dias.
- Job `send-bill-reminders` no tick do `internal-cron` (primeiro job do array `jobs`).

## Regras

- **Bills ≠ transactions** — nunca gerar transaction automaticamente.
- Lembrete dispara quando `dias_até_vencimento == reminder_days_before` e
  `reminder_last_sent_at` não é do mês corrente (guarda anti-duplicata).
- E-mail via módulo `mail` para todos os membros do lar, respeitando locale.
- `due_day` 29–31 em meses curtos: considerar o último dia do mês (definir no plano).
