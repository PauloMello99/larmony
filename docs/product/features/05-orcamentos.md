# 05 — Orçamentos (M5) — Superseded

> **Superseded pelo M10 (2026-07-10)**: o modelo linha-por-mês abaixo foi
> substituído por séries versionadas com herança automática entre meses — ver
> [`11-orcamentos-recorrentes.md`](11-orcamentos-recorrentes.md) e
> [ADR-0022](../../../.memory/adr/0022-budget-series-versions.md). Conteúdo
> original preservado abaixo por histórico.

---

> **Entregue (2026-07-06)**: CRUD via `households/:householdId/budgets?month=&year=`
> (RLS via `DRIZZLE`, guard `HouseholdMembershipGuard`). **Spending derivado em
> runtime** no `list`: join correlacionado budgets→transactions por
> categoria+household no range do mês, somando só `type='expense'` — nunca
> persistido (replica o padrão do overview `budgetsProgress`, sem acoplar).
> `update` só altera o limite (categoria e período imutáveis — mover = deletar+
> criar); `create` retorna 409 (`BudgetAlreadyExistsException`) na violação da
> unique. Frontend: grid de cards com progress bar (badge "Excedido" e
> "disponível/acima do limite"), navegação por mês/ano, e o Select de categoria
> filtra `expense`/`both` e exclui as já orçadas no período. O card de
> Orçamentos do overview (M3) mostra o mesmo dado derivado, sem alteração.

## Escopo

- CRUD de budget: categoria + mês/ano + `amount_cents` (limite).
- Navegação por mês/ano; barra de progresso gasto vs limite.

## Regras

- Unique `(household_id, category_id, month, year)`.
- Spending calculado em tempo real via query de transactions (nunca persistido).
- Categoria imutável após criação (trocar = deletar + criar).
