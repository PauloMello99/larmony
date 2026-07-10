# 11 — Orçamentos recorrentes e versionados (M10)

> **Proposta (2026-07-10)**: refatora a feature de Orçamentos (M5,
> `05-orcamentos.md`) para que o limite mensal por categoria seja **contínuo e
> versionado**, em vez de exigir criação manual todo mês. Decisão de modelo a
> formalizar em ADR no kickoff do milestone (reservar ADR-0021).

## Problema

Hoje um budget é uma linha por `(household, category, month, year)`. Virou o
mês, o usuário precisa recriar todos os orçamentos — atrito alto e perda do
principal valor da feature (acompanhamento contínuo).

## Comportamento desejado

- Defini R$ 1.000 para uma categoria em julho → agosto, setembro, … herdam
  R$ 1.000 automaticamente, sem nenhuma ação.
- Em outubro, edito para R$ 1.400 → julho–setembro continuam exibindo
  R$ 1.000 (histórico imutável); outubro em diante exibe R$ 1.400.
- **Meses passados nunca são editáveis** — só o mês corrente (e futuros, ver
  Regras).

## Modelo proposto: série + versões, resolução on-read

Substituir a linha-por-mês por duas entidades:

- **`budgets` (série)** — uma por `(household_id, category_id)` ativa:
  identidade do orçamento da categoria. Campos: `id`, `household_id`,
  `category_id`, `ended_from` (mês/nullable — ver remoção abaixo).
  Unique parcial: uma série **aberta** (`ended_from IS NULL`) por categoria.
- **`budget_versions`** — histórico de limites: `budget_id`, `amount_cents`,
  `effective_from` (date ancorada no dia 1 do mês). Unique
  `(budget_id, effective_from)`.

**Resolução do limite para um mês M (on-read, nunca materializado):**
`versão com MAX(effective_from) ≤ M`, desde que `M < ended_from` (se houver) e
`M ≥ effective_from` da primeira versão. Nenhum cron cria/clona budgets —
mesmo princípio do spending derivado (nunca persistir o que se resolve em
query). Meses futuros exibem a versão vigente como **projeção**.

## Regras

- **Editar** limite no mês corrente = upsert de versão com
  `effective_from = mês corrente` (editar de novo no mesmo mês sobrescreve a
  mesma versão, não cria duas).
- **Meses passados são imutáveis** — API rejeita (422) qualquer escrita cujo
  efeito seria alterar um mês < corrente.
- **Versões futuras são permitidas**: criar/editar com
  `effective_from > mês corrente` é válido (planejamento antecipado) e
  editável/deletável até o mês chegar.
- Categoria continua imutável (trocar = encerrar série + criar outra).
- Spending continua **derivado em runtime** (inalterado).

## Remoção (sugestão adotada: encerrar, não apagar)

- **Remover um orçamento = encerrar a série a partir do mês corrente**
  (`ended_from = mês corrente`): julho–setembro seguem mostrando o limite
  histórico; do mês corrente em diante a categoria aparece "sem orçamento".
  Hard delete apagaria o histórico e quebraria relatórios/navegação passada —
  descartado.
- **Exceção**: série criada e removida dentro do mesmo mês, sem nenhum mês
  passado coberto → hard delete real (não há histórico a preservar).
- **Recriar** orçamento para categoria com série encerrada → reabre com nova
  versão `effective_from = mês corrente` (nova série; a encerrada permanece
  como histórico).

## API (contrato-alvo)

- `GET /households/:id/budgets?month=&year=` — inalterado para o consumidor:
  devolve o limite **resolvido** para o período + spending derivado + flags
  `isEditable` (mês ≥ corrente) e `isProjected` (mês futuro sem versão própria).
- `PUT`/`DELETE` operam sobre a série; o backend traduz para versão/encerramento
  conforme as regras acima. `POST` cria série + primeira versão.

## Migração de dados

- Cada linha atual vira uma versão: agrupar por `(household, category)`,
  ordenar por período e **colapsar meses consecutivos com o mesmo valor** numa
  versão só. Buracos na sequência (meses sem budget) viram
  encerramento+reabertura de série, preservando exatamente o que o usuário via.
- Migration com `.down.sql` (ADR-0003); validar contra o overview
  `budgetsProgress` (M3), que deve passar a usar a mesma resolução.

## Impactos cruzados (verificar no plano)

- Overview M3 (`budgetsProgress`) e Relatórios M8 — passam a resolver limite
  via versões.
- Notificação de "orçamento estourado" (M11 / `12-notificacoes-multicanal.md`)
  depende deste modelo para saber o limite vigente do mês.
- E2E de budgets (backend + Playwright) — reescrever asserções de
  criação-por-mês para herança automática.
