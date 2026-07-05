# 04 — Parcelamento + Rateio (M4)

## Escopo

- **Parcelamento**: criar N transactions (uma por parcela) ligadas a um
  `installment_group` (descrição + total), com `installment_number`/`installment_count`.
  Exibição agrupável na listagem.
- **Rateio**: `transaction_members` (`share_amount_cents` NULL = divisão igual);
  UI de seleção de membros na criação/edição da transação.

## Regras

- Excluir grupo ↔ excluir parcelas: definir no plano (proposta: deletar grupo
  oferece deletar parcelas futuras).
- Sobras de arredondamento em split igual: primeira fatia absorve o resto (ADR-0017).
- Unique `(transaction_id, user_id)` no rateio.
