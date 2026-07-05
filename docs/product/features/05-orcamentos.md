# 05 — Orçamentos (M5)

## Escopo

- CRUD de budget: categoria + mês/ano + `amount_cents` (limite).
- Navegação por mês/ano; barra de progresso gasto vs limite.

## Regras

- Unique `(household_id, category_id, month, year)`.
- Spending calculado em tempo real via query de transactions (nunca persistido).
- Categoria imutável após criação (trocar = deletar + criar).
