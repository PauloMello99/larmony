# 02 — Categorias + Transações (M2)

> **Entregue (2026-07-06)**: CRUD completo dos dois recursos.
> `households/:householdId/categories` e `.../transactions` (RLS via
> `DRIZZLE`, guard `HouseholdMembershipGuard` — qualquer membro ativo cria/
> edita/deleta). Delete de categoria não bloqueia por `isDefault` nem por
> ter transações vinculadas (schema já resolve via `ON DELETE SET NULL`).
> `createdBy`/`personId` resolvidos de `authId` para `users.id` no controller
> via `GetMeUseCase` (nunca dentro do use-case). Frontend: Sheet de criar/
> editar (Table desktop + cards mobile), `CurrencyInput`/`DatePicker`
> compartilhados, filtros de mês/ano/tipo/categoria na listagem de
> transações. Confirmado que o overview do dashboard (M3) para de mostrar
> zero automaticamente assim que a primeira transação é criada, sem
> nenhuma mudança no endpoint/repositório do overview.
>
> Fora desta entrega (fica para M4): `installment_group_id`/`number`/`count`
> aceitos como nulos nos DTOs; `transaction_members` não é populada — cada
> transação tem só um `personId` (default: o próprio autor).

## Escopo

- CRUD de categorias: nome, `type` (`income`/`expense`/`both`), cor; 13 defaults
  criadas com o lar (M1); proteção contra deletar categoria em uso? → `SET NULL`.
- CRUD de transações: tipo, `amount_cents`, descrição, `date` (ocorrência),
  categoria opcional, `person_id` opcional.
- Listagem com filtros: mês, tipo, categoria. Sheet lateral para criar/editar.
- Coluna "Pessoa" só aparece com >1 membro no lar.

## Regras

- `created_by` ≠ `person_id` (quem registrou vs quem gastou).
- Transações editáveis/deletáveis (sem ledger — ADR-0010 superseded).
- Centavos inteiros em todo o stack (ADR-0017).

## Fora de escopo

- Parcelamento e rateio (M4), recorrência (M9).
