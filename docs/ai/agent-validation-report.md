# Agent Validation Report — workflow agentic do larmony

Data: 2026-07-14 · Sessão de criação do workflow role-based (Claude Code / Fable 5).

## Arquivos criados

| Arquivo | Papel |
|---|---|
| `docs/ai/development-style-profile.md` | Perfil do estilo do autor com evidências, preferências, antipadrões e Author Development Rules |
| `docs/ai/agentic-workflow.md` | Arquitetura do workflow adaptativo (fluxos, risco, handoffs, modelos) |
| `docs/ai/agent-validation-report.md` | Este relatório |
| `.claude/agents/coordinator.md` | Classificador de roteamento (sonnet) |
| `.claude/agents/locator.md` | Localização de contexto, RAG-first (haiku) |
| `.claude/agents/planner.md` | Plano executável para tarefas complexas (herda modelo) |
| `.claude/agents/implementer.md` | Único agente que edita código (sonnet) |
| `.claude/agents/tester.md` | Menor validação suficiente (sonnet) |
| `.claude/agents/reviewer.md` | Revisão de diff orientada a risco (herda modelo) |
| `.claude/agents/database-guardian.md` | Guardião de schema/migrations/RLS (herda modelo) |
| `.claude/skills/development-workflow/SKILL.md` | Protocolo de coordenação do thread principal |

## Arquivos atualizados (incrementais)

- `.claude/CLAUDE.md` — nova seção "Workflow de agentes" (referencia docs/ai/, não duplica).
- `.codex/AGENTS.md` — mesma seção espelhada, adaptada (Codex não executa subagentes; segue as regras de processo).

Nada foi sobrescrito ou removido: os 7 slash commands de `.claude/commands/`, hooks,
`settings*.json` e todo o código de aplicação permanecem intactos (`git status` mostra
apenas `M .claude/CLAUDE.md`, `M .codex/AGENTS.md` e os novos `docs/ai/`,
`.claude/agents/`, `.claude/skills/`).

## Evidências utilizadas

1. **Estrutura do código**: 19 módulos backend de 4 camadas idênticas; 17 features frontend; `common/exceptions/` (DomainException + `domain-status.map.ts`); `database/` (migrator custom, schema snake_case, `_cents`); grep de `any` (0 no backend).
2. **Histórico Git** (195 commits, 2026-07-04→07-14): autoria (Paulo Mello, `paulovmello.99@outlook.com.br` — projeto solo), Conventional Commits pt-BR com escopo + milestone (`M15 PR3 4/5`), 100% via PR contra `development`, 130 commits co-autorados com Claude, ~9,6 arquivos/commit.
3. **Tooling**: `turbo.json`, `@repo/eslint-config` (`--max-warnings 0`), `@repo/typescript-config` (strict + `noUncheckedIndexedAccess`), CI (`verify` + `test`).
4. **Testes**: 21 `*.spec.ts` colocados + 21 e2e backend + Playwright; padrões de mock (`jest.Mocked` + `as unknown as`).
5. **`.memory/`**: `domain-rules.md` (tabela de camadas, 29 regras de UI, gotchas RLS), `architecture.md`, 28 ADRs (0003 migrator, 0005/0015 RLS, 0017 centavos, 0021 design system, 0026 billing).
6. **Config de IA existente**: `.claude/commands/*.md` (markdown puro), hooks RAG em `settings.json`, espelho `.codex/AGENTS.md`.

Critério aplicado: convenção só declarada como confirmada com ≥2 fontes independentes;
confiança registrada por item na tabela da seção 11 do style profile.

## Decisões arquiteturais

1. **Coordinator = protocolo do thread principal.** Subagentes do Claude Code não spawnam subagentes; a coordenação real é a skill `development-workflow`. O agente `coordinator` existe como classificador opcional (devolve YAML de roteamento; o thread principal executa).
2. **Localização documental**: `docs/ai/` (novo) — `docs/` é indexado pelo RAG, então profile e workflow entram no recall (`memory_search`) a partir da próxima reindexação (SessionStart).
3. **Frontmatter mínimo**: apenas `name`, `description`, `tools`, `model` (campos suportados por subagentes na instalação atual). Não havia precedente local de frontmatter — padrão introduzido conscientemente e restrito ao suportado.
4. **Política de modelos**: `haiku` (locator), `sonnet` (coordinator, implementer, tester), herança do modelo principal (planner, reviewer, database-guardian). Modelo mais forte reservado a planejamento/revisão de alto risco, conforme a política de custo.
5. **Fontes de verdade**: os agentes referenciam `docs/ai/*.md` e `.memory/*` em vez de duplicar regras; `.claude/CLAUDE.md` ganhou só um resumo com ponteiros. O espelhamento `.claude/CLAUDE.md` ⇄ `.codex/AGENTS.md` foi mantido por decisão do usuário.
6. **Idioma**: prompts e docs em português (consistente com o repo); chaves dos YAMLs de handoff em inglês.

## Agentes opcionais — criados e descartados

- **Criado: `database-guardian`** — justificado por: migrator custom com hash (editar `.sql` gerado quebra o sistema), RLS multi-tenant por household (vazamento entre tenants = risco crítico), dinheiro em centavos, gotcha `DRIZZLE` vs `DRIZZLE_ADMIN`, billing Stripe persistido. Acionamento objetivo: diff toca `database/schema/`, migrations, backfill ou troca de conexão.
- **Descartados (com justificativa)**:
  - `security-reviewer` — o reviewer já tem checklist de auth/tenancy/segredos; separá-lo duplicaria papel sem critério de acionamento distinto.
  - `frontend-specialist`/`backend-specialist` — o implementer + as regras do style profile cobrem ambos os lados; a divisão criaria dois agentes com a mesma função (implementar).
  - `migration-reviewer`/`api-contract-reviewer` — subsumidos por database-guardian e reviewer respectivamente.
  - `documentation` — o fluxo existente (`/adr` + `docs(memory)` ao fechar milestone) já cobre; a skill lembra de propor `/adr`.
  - `infrastructure` — deploy/Railway está fora do escopo dos agentes (proibição de deploy).
  - `shell-policy` — as proibições estão no corpo de cada agente e há allowlist real em `.claude/settings.local.json`; um agente de política criaria falsa sensação de sandbox.

## Checklist de validação (Fase 11)

| # | Verificação | Resultado |
|---|---|---|
| 1 | Responsabilidade única por agente | OK — papéis disjuntos (classificar/localizar/planejar/implementar/testar/revisar/guardar dados) |
| 2 | Sem dois agentes com a mesma função | OK — especialistas duplicados foram descartados |
| 3 | Coordinator com critérios objetivos | OK — gatilhos de risco enumerados + fail-safe "na dúvida, eleve" |
| 4 | Simples não aciona Planner/Reviewer | OK — fluxo simples = implementer + check-types/lint |
| 5 | Complexas passam por planejamento | OK |
| 6 | Alto risco passa por revisão | OK — elevação por risco força reviewer (+ db-guardian quando dados) |
| 7 | Nenhum agente pode push/deploy | OK — proibição explícita em todos + na skill + implementer sem Bash |
| 8 | Handoffs compatíveis | OK — cadeia coordinator→locator→planner→implementer→tester→reviewer/db-guardian com campos encadeados (`validation_requested`→`commands`, `focus`, findings→correção) |
| 9 | Regras refletem o estilo detectado | OK — cada agente carrega o subconjunto pertinente das Author Development Rules |
| 10 | Sem dependência de ferramenta inexistente | OK — tools restritos a Read/Edit/Write/Grep/Glob/Bash + MCP `larmony-memory` (configurado em `.mcp.json`) |
| 11 | Frontmatter suportado | OK — apenas `name`/`description`/`tools`/`model` |
| 12 | Nada sobrescrito indevidamente | OK — `git status` só mostra adições + 2 edições incrementais |
| 13 | Sem placeholders TODO/TBD | OK — grep em `docs/ai/` e `.claude/agents/` sem matches |
| 14 | Sem contradições CLAUDE.md/.claude/.codex | OK — novos arquivos referenciam (não duplicam) as fontes; espelhos atualizados juntos |
| 15 | Comandos = scripts reais | OK — conferido contra `package.json` raiz/backend/frontend (`check-types`, `lint`, `check-locales`, `build`, `--filter backend test/test:e2e/db:generate/db:migrate/db:status`, `--filter frontend test:e2e`, `db:start`) |

## Simulações de roteamento (Fase 12 — dry-run documentado)

> Nota: subagentes definidos durante a sessão só são carregados no próximo start do
> Claude Code (tentativa de invocação ao vivo retornou "Agent type 'coordinator' not
> found" — comportamento esperado). As simulações abaixo são traces de roteamento
> aplicando o protocolo da skill; um smoke test ao vivo pode ser repetido na próxima sessão.

### Simulação 1 — simples
**Tarefa**: corrigir typo na mensagem de validação de `amountCents` em
`apps/backend/src/modules/transactions/interface/dto/create-transaction.dto.ts`.

- **Classificação**: simples — arquivo conhecido, string apenas, sem gatilho de risco
  (não muda regra de validação, contrato nem dado persistido).
- **Acionados**: `implementer` (edita a string) → thread principal roda
  `pnpm check-types` + `pnpm lint`.
- **Não acionados**: coordinator (classificação óbvia), locator (arquivo dado), planner
  (nada a fatiar), tester (validação direcionada coberta pelo próprio fluxo), reviewer e
  database-guardian (sem risco).
- **Justificativa**: menor fluxo suficiente; qualquer agente extra seria desperdício.

### Simulação 2 — intermediária
**Tarefa**: adicionar validação de limite (valor máximo por lançamento) no use-case de
criação de budgets e atualizar o spec.

- **Classificação**: intermediária — um módulo, padrão e testes existentes; envolve
  regra de negócio mas sem migration/contrato novo (o erro novo entra no mapa existente).
- **Fluxo**: `locator` → `implementer` → `tester`.
- **Handoffs**:
  - locator ⇒ `relevant_files` (`create-budget.use-case.ts` + spec colocado,
    `budget.entity.ts`, exceptions do módulo, `domain-status.map.ts`),
    `existing_patterns` (validação análoga em outro use-case de budgets),
    `constraints` ("valores em `_cents`", "DomainException + código no mapa").
  - implementer ⇒ `changes` (use-case + exceção nova + código registrado no mapa + spec),
    `validation_requested: ["pnpm --filter backend test -- create-budget", "pnpm check-types", "pnpm lint"]`.
  - tester ⇒ executa exatamente essa lista, para no menor conjunto verde.
- **Não acionados**: planner (escopo pequeno e claro), reviewer/db-guardian (sem gatilho
  de risco — não toca schema, RLS nem billing).

### Simulação 3 — complexa
**Tarefa**: alterar regra persistida de `scheduled-transactions` (ex.: nova política de
vencimento) afetando API, banco e compatibilidade com registros existentes.

- **Classificação**: complexa — gatilhos: dados persistidos + migration + contrato
  público + cron (execução automática).
- **Fluxo**: `locator` → `planner` → `implementer` (passo a passo) → `tester` →
  `database-guardian` → `reviewer` → correções (findings critical/high) → `tester`
  (revalidação direcionada) → resposta.
- **Especializado**: `database-guardian` acionado porque há migration — verifica
  `.down.sql`, `.sql` gerado não editado, coluna nova compatível com dados existentes
  (nullable/default/backfill idempotente), RLS da tabela, conexão `DRIZZLE` correta.
- **Critérios de revisão**: reviewer compara diff com `acceptance_criteria` do plano;
  foco em contrato da API (código de erro novo no mapa), tenancy (guards + household da
  sessão), timezone do cron (ADR-0024) e suficiência de testes.
- **Estratégia de validação**: specs direcionados do módulo → unit completo do backend →
  `pnpm check-types` → `pnpm lint` → e2e (`pnpm --filter backend test:e2e`) justificado
  pelo risco, com Supabase local + `db:migrate` confirmados antes.

As três simulações demonstram roteamentos distintos por nível — o workflow é adaptativo.

## Limitações e pontos para revisão humana

1. **Agentes carregam na próxima sessão** — o smoke test ao vivo do `coordinator` falhou
   nesta sessão (esperado); recomendo repetir na próxima sessão do Claude Code.
2. **E-mail do autor**: a hipótese externa `paulovmello99@gmail.com` não aparece no
   histórico; o e-mail real de commit é `paulovmello.99@outlook.com.br`. Sem impacto nas
   regras, mas registrado para correção da hipótese.
3. **`.memory/MEMORY.md` desatualizado** (lista ADRs até 0024; existem 28) — fora do
   escopo desta entrega; vale sincronizar. Os agentes foram instruídos a não confiar
   cegamente no índice (usar `memory_search`).
4. **`@repo/ui` citado na memória mas inexistente em disco** (componentes em
   `apps/frontend/src/shared/components/ui/`) — `.claude/CLAUDE.md` ainda lista o
   package; não corrigi por ser conteúdo preexistente fora do escopo. Vale revisar.
5. **Seção "Estado transitório" do CLAUDE.md** ("schema será squashado no M1") parece
   defasada — a baseline já foi squashada (`0000_baseline`) e o v1 está concluído.
   Preservada por ser conteúdo preexistente; revisão humana recomendada.
6. **Modelos fixados** (`haiku`/`sonnet` no frontmatter) — se a instalação mudar os
   aliases disponíveis, remover o campo `model` faz o agente herdar o principal.
7. **Nenhum ADR foi criado** para o workflow em si — se o usuário considerar a adoção do
   workflow uma decisão arquitetural durável, registrar via `/adr` (sugestão: "Workflow
   agentic role-based com roteamento adaptativo").
8. **Código da aplicação**: não alterado (verificado via `git status`). Nenhum commit criado.
