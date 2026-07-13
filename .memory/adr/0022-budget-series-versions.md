# ADR-0022 — Orçamentos como série + versões, resolução on-read (M10)

**Status:** Aceito
**Data:** 2026-07-10

## Contexto

O modelo de orçamentos do M5 era uma linha por `(household_id, category_id,
month, year)`. Virado o mês, o usuário precisava recriar manualmente todos os
orçamentos — atrito alto que anulava o valor da feature (acompanhamento
contínuo). O requisito de produto: definir um limite numa categoria deve valer
para todos os meses seguintes automaticamente, até ser editado; editar só
pode afetar o mês corrente em diante; meses passados são imutáveis.

## Decisão

1. **Duas tabelas**: `budgets` deixa de guardar o limite e passa a ser a
   **série** por categoria (`id`, `household_id`, `category_id`,
   `ended_from` opcional). `budget_versions` guarda o histórico de limites
   (`budget_id`, `amount_cents`, `effective_from` — dia 1 do mês). Unique
   parcial `(household_id, category_id) WHERE ended_from IS NULL` — só uma
   série **aberta** por categoria; séries encerradas não conflitam.
2. **Resolução do limite é on-read, nunca materializada**: para um período, a
   versão aplicável é a de maior `effective_from ≤ início do período`
   (`DISTINCT ON (budget_id) ORDER BY budget_id, effective_from DESC`). Nenhum
   cron clona orçamentos na virada do mês — a herança é 100% derivada, mesmo
   princípio do spending (nunca persistido, ADR implícito do M5).
3. **Invariante central: editar = upsert da versão do mês corrente.** O
   `PATCH` faz `INSERT ... ON CONFLICT (budget_id, effective_from) DO UPDATE`
   com `effective_from = mês corrente` — nunca escreve numa versão passada.
   Reeditar no mesmo mês sobrescreve a mesma versão em vez de criar outra.
   Uma única regra entrega imutabilidade do passado E idempotência da
   reedição.
4. **Imutabilidade enforçada no servidor via "é a série aberta?", não via
   parâmetro de período**: `create`/`update` nunca recebem `month`/`year` —
   sempre ancoram no mês corrente. Editar uma série com `ended_from`
   preenchido (não é mais a aberta) → 422 `BUDGET_PERIOD_NOT_EDITABLE`. Isso
   elimina a necessidade de o backend confiar em "qual período o cliente diz
   estar vendo" — o único estado que importa é se a série ainda está aberta.
5. **Remoção = encerrar a série sempre** (`ended_from = mês corrente`), nunca
   hard delete — um único caminho de código. Mesmo uma série criada e
   removida no mesmo mês apenas ganha `ended_from`, virando um tombstone
   invisível que não bloqueia recriar (a unique parcial só cobre séries
   abertas). Hard delete foi descartado por adicionar um branch extra sem
   necessidade real — decisão tomada explicitamente no kickoff para manter
   um único caminho de teste.
6. **"Mês corrente" é uma função só**: `currentPeriodStart()`/
   `currentMonthYear()` (`common/finance/due-date.ts`), usada tanto pelo
   anchor de create/edit quanto pelo cálculo de `isEditable`/`isProjected`.
   Hoje deriva de `new Date()` do processo (UTC em produção); prepara a
   troca para timezone do household no M12 sem tocar os chamadores.
7. **`isEditable`/`isProjected` são propriedades do período consultado, não
   da linha** — atribuídas uniformemente no use-case
   (`período === corrente` / `período > corrente`). Sem scheduling futuro no
   v1: qualquer período à frente do corrente é sempre projeção do limite
   vigente (nunca existe versão com `effective_from` no futuro).
8. **Migração 0006 sem backfill de valores** — decisão deliberada: produção
   está intocada e staging é dado de teste descartável. A migration só
   remodela as tabelas (dropa `amount_cents`/`month`/`year` de `budgets`,
   cria `budget_versions`); usuários reconfiguram os orçamentos. Isso elimina
   a peça mais arriscada da migração — o SQL de gaps-and-islands para
   colapsar linhas-por-mês em versões preservando exatamente o que o usuário
   via, incluindo buracos onde um mês não tinha orçamento.

## Consequências

- Overview (`budgetsProgress`, M3) replica a mesma resolução on-read para o
  mês corrente — não acoplada ao módulo `budgets` (mesmo padrão do M5).
- `CreateBudgetDto` perde `month`/`year`; `ListBudgetsQueryDto` mantém
  `month`/`year` opcionais (default = mês corrente).
- Frontend: `isEditable`/`isProjected` no response gateiam
  criar/editar/excluir na UI (somente UX — o servidor já enforça); banner de
  "somente leitura"/"projeção" quando o período navegado não é o corrente.
  `BudgetPeriodNav` ganhou +1 ano no seletor de ano (necessário para navegar
  a projeções de dezembro→janeiro).
- E2E backend reescrito para herança/imutabilidade/reabertura de série
  (seed direto de `budget_versions` via admin pool para simular histórico
  multi-mês, já que a API nunca cria versão passada).
- M11 (notificações — "orçamento estourado") e M12 (timezone dos disparos)
  dependem deste modelo para resolver o limite vigente do mês.
