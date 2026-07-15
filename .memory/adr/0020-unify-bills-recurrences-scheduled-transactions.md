# ADR-0020 — Unificar bills + recurrences em "lançamentos programados" (scheduled_transaction_entries)

**Status:** Aceito — supersede o ADR-0019
**Data:** 2026-07-09

## Contexto

Bills (M7: definição estática + lembrete + lançamento manual) e recurrences (M9:
transação gerada automaticamente pelo cron) foram construídas como features
distintas e coexistentes (ver ADR-0019, §3 da decisão: "bills e recurrences
permanecem conceitos distintos"). Na prática são quase espelhadas: ambas têm
`amountCents`/`categoryId`/cadência/`isActive`, e o único eixo que de fato as
separa é o **modo de postagem** — `auto` (engine gera) vs `manual` (lembrete +
botão "lançar", valor confirmado pelo usuário).

O gatilho para revisitar foi notar que o conceito unificado precisa ser
**type-neutral** (receita **ou** despesa): bills modelava só despesa
("conta a pagar"), mas uma recorrência de receita (salário mensal) é o mesmo
tipo de lançamento programado, só que automático. Forçar "conta a pagar" nesse
caso é um vocabulário errado, não uma limitação técnica.

## Decisão

1. **Uma feature única, "Lançamentos"** (rota `/scheduled-transactions`, tabela
   `scheduled_transaction_entries`, módulo backend `scheduled-transactions`),
   substituindo `bills` e `recurrences` por completo (módulos e features
   deletados, não deprecados).
2. **Nova tabela, não extensão de nenhuma das duas** — colunas de ambas
   convergem numa só: `posting_mode ('auto'|'manual')`, `type` (agora
   presente sempre, não só em recurrences), `frequency`/`interval` (cadência
   simples, herdada do ADR-0019 — segue sem RRULE), `next_run_date` (cursor,
   só `auto`), `reminder_days_before`/`reminder_last_sent_at` (só `manual`).
3. **CHECK físico amarra o invariante ao schema, não à disciplina do código**:
   `CHECK ((posting_mode = 'auto') = (next_run_date IS NOT NULL))`. Um filtro
   esquecido no engine (`WHERE posting_mode = 'auto'`) não consegue gerar de
   uma linha manual — `next_run_date IS NULL` já a exclui de `next_run_date <=
   hoje`.
4. **Cadência subsume `due_day`**: uma conta mensal no dia 5 é
   `frequency=monthly, interval=1`, com o dia-do-mês carregado por
   `start_date` — não é um campo próprio.
5. **Dois helpers de "próxima data", não um** (a decisão técnica mais sutil
   desta migração):
   - `advanceScheduledEntryDate`/`nextRunOnOrAfter` (cursor-based, em
     `scheduled-entry-schedule.ts`) — usado **só** pelo engine `auto`, que já
     tem um cursor persistido e sempre clampado corretamente.
   - `nextManualOccurrence` (stateless, em `common/finance/due-date.ts`) —
     usado pelo lembrete e pelo card "Próximos lançamentos" do modo `manual`,
     que **não tem cursor**. Reusar o helper cursor-based aqui causaria drift:
     um dia-de-origem 31 clamparia para 28/fev e, iterando a partir do
     resultado clampado, ficaria colado em 28 para sempre. `nextManualOccurrence`
     deriva cada ocorrência do zero a partir do dia-de-origem em `start_date`,
     igual ao antigo `nextDueDate(dueDay, today)` de bills — sem o drift.
   - Consequência: **dedup do lembrete muda de ano+mês para ano+mês+dia.** O
     gatilho `daysUntil === reminderDaysBefore` cai em exatamente 1 dia por
     ocorrência, para qualquer cadência — dedup por mês era correto só por
     acidente para `monthly` (1 ocorrência/mês) e **quebrado** para
     `weekly`/`yearly` (uma 2ª ocorrência no mesmo mês nunca disparava).
     Dedup por dia é byte-idêntico ao comportamento antigo no caso mensal e
     agora correto nos demais.
6. **Toggle de modo re-ancora o cursor**: `manual→auto` seta `next_run_date =
   nextRunOnOrAfter(startDate, hoje, ...)` (pula para a próxima ocorrência
   futura, não gera de uma vez o histórico parado); `auto→manual` zera
   `next_run_date` para `NULL` (satisfaz o CHECK).
7. **Launch (ex-`LaunchBillAsTransactionUseCase`) generalizado**: `type` vem
   da entrada (não mais hardcoded `expense`), reusa `CreateTransactionUseCase`
   igual antes. Bloqueado por entrada `auto` (`SCHEDULED_ENTRY_NOT_MANUAL`,
   409) — o engine já posta essa sozinho; permitir o launch manual duplicaria.
8. **Migração de dados preserva `id`**: recurrences → entries copia o `id`
   (valida o backfill de `transactions.recurrence_id` →
   `scheduled_transaction_entry_id` no mesmo passo da migration); bills →
   entries sintetiza `start_date` a partir de `due_day` (ancorado em janeiro,
   mês de 31 dias, preserva 29/30/31) e `created_by` a partir do owner do
   household (bills não tinha esse campo).
9. **Escopo v1 inalterado**: sem rateio/parcelamento no lançamento programado
   (mesmo precedente do M4/M9). Sem RRULE.

## Consequências

- Bills e recurrences deixam de existir como conceitos de produto e como
  código — não há período de coexistência ou deprecation.
- **Dois cron jobs, não um**: `scheduled-transactions-engine` (scan `auto`) e
  `scheduled-transactions-reminders` (scan `manual`) — falha isolada no
  `Promise.all` do tick, mesmo padrão do ADR-0019.
- A regra do ADR-0019 sobre escrita via `DRIZZLE_ADMIN` fora de request
  context permanece — o engine ainda grava por
  `CreateGeneratedTransactionUseCase` (sem auditoria, evento de sistema).
- `docs/product/features/07-contas-a-pagar.md` e `09-recorrencia.md` marcados
  como superseded, substituídos por `10-lancamentos-programados.md`.
- Índice único parcial `(scheduled_transaction_entry_id, date)` para
  concorrência de cron multi-réplica continua **deliberadamente adiado**
  (mesmo raciocínio do ADR-0019 — não se aplica à topologia atual).
