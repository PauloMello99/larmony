# ADR-0019 — Recorrência: modelo simples + engine no cron gravando via DRIZZLE_ADMIN

**Status:** Superseded pelo ADR-0020 (2026-07-09) — bills e recurrences foram
unificados em "lançamentos programados" (`scheduled_transaction_entries`); o
ponto 3 abaixo ("bills e recurrences permanecem conceitos distintos") não é
mais válido. O modelo de cadência (sem RRULE), o engine no cron via
`DRIZZLE_ADMIN`/`CreateGeneratedTransactionUseCase` e o princípio de
idempotência (avançar cursor antes de inserir) sobrevivem inalterados no
módulo `scheduled-transactions`.
**Data:** 2026-07-08

## Contexto

M9 (Recorrência) precisava de transações recorrentes automáticas (salário mensal,
assinatura, mesada semanal). O old-larmony tinha campos natimortos (`is_recurring`,
`recurrence_rule`, `parent_id`) sem lógica — design próprio. Duas decisões abertas:
(1) o **modelo** da regra (RRULE vs periodicidade simples) e (2) **como/onde** as
transações são geradas, dado que o engine roda no tick do cron **sem request
context**.

Restrição decisiva: `CreateTransactionUseCase` grava por `DrizzleTransactionRepository`,
que injeta **só `DRIZZLE`** (proxy RLS request-scoped). Fora de um request o proxy
cai no pool `app_user` sem claims → o RLS **nega tudo**. Logo o caminho de escrita
request-scoped **não funciona no cron** — o mesmo motivo pelo qual o job de
lembretes de bills usa métodos `DRIZZLE_ADMIN`.

## Decisão

1. **Modelo de regra simples, sem RRULE**: `frequency ∈ {weekly, monthly, yearly}`
   + `interval` inteiro ("a cada N"). Cobre quinzenal (weekly×2), trimestral/
   semestral (monthly×N). Reusa `addMonthsISO` (+ novo `addDaysISO`) de
   `common/finance/due-date`. Tabela `recurrences` com `startDate`, `endDate?`,
   `nextRunDate` (cursor), `isActive`.
2. **Geração na data da ocorrência, no tick do cron** (`recurrence-engine`), não
   pré-materialização de futuro. Loop de catch-up **bounded** por regra cobre
   ticks perdidos; ao atingir o teto, loga (não silencia).
3. **Escrita via `DRIZZLE_ADMIN`, não reuso do use-case request-scoped.**
   `DrizzleTransactionRepository` ganhou `DRIZZLE_ADMIN` + `createGenerated`
   (split `this.db`/`this.admin` idêntico ao de bills), exposto por
   `CreateGeneratedTransactionUseCase` (**sem auditoria** — evento de sistema,
   sem authId). O `TransactionsModule` exporta esse use-case; o módulo
   `recurrences` o injeta. Isso honra a intenção "M9 → transactions" da memória
   **sem** furar o RLS.
4. **Idempotência (sob ticks SEQUENCIAIS) sem transação cross-repo: avançar
   `next_run_date` ANTES de inserir** (espelha o mark-before-send de bills).
   Crash no meio → PULA uma ocorrência (gap visível e corrigível) em vez de
   DUPLICAR (corrupção silenciosa de relatórios/orçamentos). **Escopo da garantia:**
   protege contra re-tick sequencial (o caso real — 1 único serviço Cron no
   Railway, `*/15`, tick em ms), **não** contra dois ticks concorrentes (ambos
   leriam o mesmo `next_run_date` → duplicariam). Se a topologia do cron mudar
   (múltiplas réplicas/execuções sobrepostas), o guard à prova de bala é um
   **índice único parcial** `(recurrence_id, date) WHERE recurrence_id IS NOT
   NULL` — considerado e **deliberadamente adiado** por ser desnecessário na
   topologia atual e adicionar machinery sem ganho hoje.
5. **Escopo v1 enxuto**: sem rateio nem parcelamento na recorrência (precedente
   do M4 sobre explosão 2D). `startDate >= hoje` (sem backfill). Reativação
   re-ancora `nextRunDate` para a próxima ocorrência >= hoje. Transação gerada
   guarda `recurrence_id` (FK `ON DELETE SET NULL` → histórico sobrevive à
   exclusão da regra).

## Consequências

- Regra geral reforçada: **toda escrita disparada por cron usa `DRIZZLE_ADMIN`**;
  reuso de use-case cross-módulo só vale para consumidores em request context
  (ex.: `LaunchBillAsTransactionUseCase`).
- Bills (definição estática + lembrete manual) e recurrences (lançamento
  automático) permanecem conceitos distintos e coexistentes.
- Sem RRULE, casos como "última sexta do mês" ficam fora — reavaliar só se houver
  demanda real. Rateio/parcelamento recorrentes são extensões futuras.
- Gotcha de teste: o driver `pg` devolve coluna `date` como `Date` (não string);
  comparar `next_run_date` em e2e exige `::text` no SELECT.
