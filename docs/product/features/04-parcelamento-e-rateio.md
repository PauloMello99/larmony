# 04 — Parcelamento + Rateio (M4)

> **Entregue (2026-07-06)**: estende `transactions` (aditivo). Parcelamento via
> `POST /transactions` com `installmentCount>1` (valor = total, `splitEqually`
> com 1ª parcela absorvendo a sobra — ADR-0017; datas mês a mês via
> `addMonthsISO`; grupo + N transações atômicas). Rateio via `members[]` no
> create/update (`share` null = igual, valor = específico que soma ao total);
> `GET /:id/members` devolve `effectiveShareCents`. `DELETE
> /installment-groups/:id` exclui a série (cascade). **Combinar parcela + rateio
> é permitido só com rateio igual** (específico + parcela → 422). Frontend:
> toggles Parcelar/Dividir no Sheet, `RateioField` inline (igual/específico com
> somatório), badges N/M + Rateio na lista, delete "esta parcela vs série".

## Escopo

- **Parcelamento**: criar N transactions (uma por parcela) ligadas a um
  `installment_group` (descrição + total), com `installment_number`/`installment_count`.
  Exibição agrupável na listagem.
- **Rateio**: `transaction_members` (`share_amount_cents` NULL = divisão igual);
  UI de seleção de membros na criação/edição da transação.

## Regras

- Excluir 1 parcela remove só aquela transaction; excluir a série (`DELETE
  installment-groups/:id`) remove todas as parcelas + rateios (cascade). Sem
  "editar série" nem converter única↔parcelada no v1.
- Sobras de arredondamento em split igual: primeira fatia absorve o resto (ADR-0017).
- Unique `(transaction_id, user_id)` no rateio; rateio específico deve somar ao total (senão 422).
- Combinado parcela+rateio só aceita rateio **igual** (específico+parcela → 422).
