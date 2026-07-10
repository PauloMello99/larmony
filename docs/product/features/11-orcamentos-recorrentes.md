# 11 — Orçamentos recorrentes e versionados (M10)

> **Entregue (2026-07-10)**: refatora a feature de Orçamentos (M5,
> `05-orcamentos.md`) — o limite mensal por categoria agora é **contínuo e
> versionado**, sem exigir criação manual todo mês. Ver
> [ADR-0022](../../../.memory/adr/0022-budget-series-versions.md) para a
> decisão completa e `domain-rules.md` §Orçamentos para as regras vivas.

## Problema

O modelo anterior era uma linha por `(household, category, month, year)`.
Virou o mês, o usuário precisava recriar todos os orçamentos — atrito alto e
perda do principal valor da feature (acompanhamento contínuo).

## Comportamento

- Defini R$ 1.000 para uma categoria em julho → agosto, setembro, … herdam
  R$ 1.000 automaticamente, sem nenhuma ação.
- Em outubro, edito para R$ 1.400 → julho–setembro continuam exibindo
  R$ 1.000 (histórico imutável); outubro em diante exibe R$ 1.400.
- **Só o mês corrente é editável.** Meses passados são somente-leitura
  (histórico); meses futuros são somente-leitura (**projeção** do limite
  vigente — sem scheduling futuro no v1).

## Modelo: série + versões, resolução on-read

Duas tabelas substituem a linha-por-mês:

- **`budgets` (série)** — uma por `(household_id, category_id)`: identidade
  do orçamento da categoria. Campos: `id`, `household_id`, `category_id`,
  `ended_from` (date/nullable — 1º mês NÃO coberto, exclusivo). Índice único
  parcial garante só uma série **aberta** (`ended_from IS NULL`) por
  categoria — séries encerradas não conflitam, permitindo recriar.
- **`budget_versions`** — histórico de limites: `budget_id`, `amount_cents`,
  `effective_from` (date, dia 1 do mês). Unique `(budget_id, effective_from)`.

**Resolução do limite para um período (on-read, nunca materializado):**
versão de maior `effective_from ≤ início do período`, desde que a série ainda
cobrisse o período (`ended_from IS NULL OR período < ended_from`). Nenhum
cron cria/clona budgets — mesmo princípio do spending derivado (nunca
persistir o que se resolve em query).

## Regras

- **Editar = upsert da versão do mês corrente**
  (`INSERT ... ON CONFLICT (budget_id, effective_from) DO UPDATE`) — nunca
  altera uma versão passada. Reeditar no mesmo mês sobrescreve a mesma
  versão, não cria duas. Essa é a regra que entrega imutabilidade do passado
  e idempotência da reedição num único caminho.
- **Sem parâmetro de período no create/edit** — sempre ancoram no mês
  corrente (`currentPeriodStart()`, `common/finance/due-date.ts`). Editar uma
  série que não é mais a aberta (`ended_from` preenchido) → **422**
  (`BUDGET_PERIOD_NOT_EDITABLE`).
- **Sem versões futuras/scheduling** — qualquer período à frente do corrente
  é sempre projeção do limite vigente (nunca há versão com `effective_from`
  futuro).
- Categoria continua imutável (trocar = encerrar série + criar outra).
- Spending continua **derivado em runtime** (inalterado desde o M5).

## Remoção — encerrar a série sempre (caminho único)

- **Remover = encerrar a série a partir do mês corrente** (`ended_from = mês
  corrente`): meses passados seguem mostrando o limite histórico; do mês
  corrente em diante a categoria aparece "sem orçamento". Nunca há hard
  delete — inclusive uma série criada e removida no mesmo mês só ganha
  `ended_from` (tombstone invisível que não bloqueia recriar).
- **Recriar** orçamento para categoria com série encerrada → cria uma
  série nova com `effective_from = mês corrente` (a encerrada permanece como
  histórico, sem conflito com o índice único parcial).
- Remover uma série já encerrada → 404 (idempotente).

## API

- `GET /households/:id/budgets?month=&year=` — devolve o limite **resolvido**
  para o período + spending derivado + flags `isEditable` (período é o mês
  corrente) e `isProjected` (período é futuro). O `id` retornado é o da série
  ativa naquele período — a mesma categoria pode ter ids diferentes em meses
  diferentes (segmento encerrado vs. aberto); o front usa o id da linha
  renderizada, nunca um id cacheado entre navegações de período.
- `POST` — `{ categoryId, amountCents }` (sem `month`/`year`): cria série +
  primeira versão no mês corrente.
- `PATCH /:budgetId` — `{ amountCents }`: upsert da versão do mês corrente.
- `DELETE /:budgetId` — encerra a série.

## Migração (0006) — sem backfill de valores

Decisão do kickoff: produção está intocada e staging é dado de teste
descartável. A migration só remodela as tabelas (dropa `amount_cents`/
`month`/`year` de `budgets`, cria `budget_versions`) — sem `INSERT ...
SELECT` de histórico. Usuários reconfiguram os orçamentos após o deploy. Isso
eliminou a peça mais arriscada da migração (colapsar linhas-por-mês em
versões preservando buracos).

## Impactos cruzados

- Overview M3 (`budgetsProgress`) replica a mesma resolução on-read para o
  mês corrente — não acoplada ao módulo `budgets`.
- Notificação de "orçamento estourado" (M11, `12-notificacoes-multicanal.md`)
  depende deste modelo para saber o limite vigente do mês.
- `currentPeriodStart()`/`currentMonthYear()` centralizam "mês corrente" —
  M12 troca a implementação (UTC → timezone do household) numa função só.
