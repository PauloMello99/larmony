# 06 — Metas (M6)

## Escopo

- CRUD de goal: nome, `target_amount_cents`, `target_date` opcional (clearable), cor.
- Contribuições (`goal_contributions`): valor, data, autor; dialog secundário com DatePicker.
- Progress bar `current/target`; badge "Concluída".

## Regras

- `current_amount` **derivado** por SUM no use-case — sem trigger, sem coluna
  persistida (materializar só se performance exigir).
- Concluída quando `current >= target`.
