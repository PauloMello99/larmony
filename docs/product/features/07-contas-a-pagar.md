# 07 — Contas a pagar (M7)

> **Fatia cron entregue (2026-07-06)**: módulo `bills` mínimo (repo admin) +
> `SendBillRemindersUseCase` + job `send-bill-reminders` no tick, com dedup
> bill×mês via `reminder_last_sent_at` (gravado antes do envio) e notificação
> in-app + e-mail para todos os membros. Falta: CRUD/telas + "lançar como transação".

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
