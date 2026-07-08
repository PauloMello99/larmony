# 06 — Metas (M6)

> **Entregue (2026-07-06)**: CRUD via `households/:id/goals` + sub-recurso
> `/:goalId/contributions` (criar/listar com autor resolvido/excluir aporte).
> `savedCents` derivado por SUM em runtime (LEFT JOIN, nunca persistido).
> Aportes positivos no v1 (`@Min(1)`) — corrigir erro = excluir o aporte pelo
> histórico do dialog. `targetDate` clearable via `PATCH { targetDate: null }`.
> Delete de meta cascateia os aportes (dialog avisa). Overview estendido
> aditivamente: `goals.top` (top-3 por % de progresso) alimenta a seção "Metas
> ativas" com progress bars (antes era EmptyState incondicional). Frontend com
> grid de cards, badge "Concluída" em `success` e dialog de aporte com
> DatePicker + histórico.

## Escopo

- CRUD de goal: nome, `target_amount_cents`, `target_date` opcional (clearable), cor.
- Contribuições (`goal_contributions`): valor, data, autor; dialog secundário com DatePicker.
- Progress bar `current/target`; badge "Concluída".

## Regras

- `current_amount` **derivado** por SUM no use-case — sem trigger, sem coluna
  persistida (materializar só se performance exigir).
- Concluída quando `current >= target`.
