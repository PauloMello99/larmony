# 08 — Relatórios (M8)

## Escopo

- Toggle mensal/anual.
- **Mensal**: bar chart rolling de 6 meses + pie chart por categoria + gasto por pessoa.
- **Anual**: bar chart dos 12 meses + cards de totais + navegação de ano.

## Regras

- Gasto por pessoa usa `person_id` (não `created_by`); empty state explica como
  atribuir pessoa às transações.
- Agregações no backend (use-cases de relatório), Recharts no frontend.
