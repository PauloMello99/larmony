# 02 — Categorias + Transações (M2)

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
