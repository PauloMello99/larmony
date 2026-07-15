# 10 — Lançamentos programados (ADR-0020)

> **Entregue (2026-07-09)**: unifica `07-contas-a-pagar.md` (M7) e
> `09-recorrencia.md` (M9) numa feature só. Rota `/scheduled-transactions`,
> tabela `scheduled_transaction_entries`, módulo backend
> `scheduled-transactions`. Ver ADR-0020 para a decisão completa e
> `domain-rules.md` §Lançamentos programados para as regras vivas.

## Escopo

- CRUD de lançamento programado: `type` (receita/despesa), `amountCents`,
  `description`, cadência (`frequency` weekly/monthly/yearly + `interval`),
  `startDate`, `endDate?`, categoria opcional, `isActive`.
- **Toggle `postingMode` (`auto`/`manual`)** — o eixo que substitui a antiga
  separação bills/recurrences:
  - `auto`: o Larmony gera a transação sozinho na data de cada ocorrência
    (engine no tick do cron). Sem lembrete.
  - `manual`: o usuário recebe um lembrete por e-mail e lança quando quiser
    ("Lançar como transação"). A entrada nunca é consumida — permanece na
    lista e pode ser relançada.
- Listagem separada Ativas / Inativas; alerta amber para entradas `manual`
  com vencimento em ≤7 dias.
- Dois jobs no tick do `internal-cron`: `scheduled-transactions-engine`
  (gera ocorrências `auto` vencidas) e `scheduled-transactions-reminders`
  (dispara lembrete das entradas `manual` na janela).

## Regras

- **`type` é sempre explícito** — diferente de bills (só despesa), o
  lançamento programado é type-neutral. Uma recorrência de receita (salário)
  e uma despesa fixa (aluguel) são a mesma entidade, só o `type` muda.
- **`postingMode` decide auto vs manual**, não o `type`.
- CHECK físico garante `next_run_date` presente ⟺ `posting_mode = 'auto'`.
- Modo `auto`: `startDate` deve ser hoje ou futuro (sem backfill); idempotência
  via avançar-cursor-antes-de-inserir; transação gerada carrega
  `scheduled_transaction_entry_id` e ganha badge "Recorrente".
- Modo `manual`: lembrete dispara quando `dias_até_próxima_ocorrência ==
  reminder_days_before` e ainda não enviou **hoje** (dedup por dia, não por
  mês); "Lançar" cria uma transação comum via `CreateTransactionUseCase` e
  bloqueia entradas `auto` (409).
- Toggle `manual→auto` re-ancora o cursor na próxima ocorrência ≥ hoje;
  `auto→manual` zera o cursor. `startDate` é imutável em ambos os modos.
- Sem rateio nem parcelamento no v1 (mesmo precedente do M4/M9).

## Migração de dados (ADR-0020 / migration 0005)

- `recurrences` → entries `auto`, preservando `id` (valida o backfill de
  `transactions.recurrence_id` → `scheduled_transaction_entry_id`).
- `bills` → entries `manual`, `type='expense'`, `startDate` sintetizado a
  partir de `due_day` (ancorado em janeiro), `created_by` = owner do lar.
