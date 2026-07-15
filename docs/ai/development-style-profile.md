# Development Style Profile — larmony

> Perfil do estilo de desenvolvimento do autor principal (Paulo Mello), mapeado a partir
> de evidências do repositório em 2026-07-14. Fonte para as regras operacionais dos
> agentes em `.claude/agents/` e do protocolo em `docs/ai/agentic-workflow.md`.
>
> Metodologia: análise da estrutura do código, histórico Git (195 commits), configs de
> tooling, testes, `.memory/` (28 ADRs + domain-rules) e CI. Uma convenção só foi
> considerada confirmada com evidência em pelo menos duas fontes independentes.

## Identidade do autor

- `git config user.name` = **Paulo Mello** · `user.email` = **paulovmello.99@outlook.com.br**
- Distribuição de autoria (195 commits): 167 "Paulo Mello", 26 "Paulo Vinicius Pachiani de Mello"
  (mesmo e-mail), 2 com `pmello@upstart13.com`. **Projeto solo** — não há distinção
  time vs autor; as convenções do projeto SÃO as convenções do autor.
- O e-mail `paulovmello99@gmail.com` (hipótese externa) **não aparece** no histórico.
- 130 commits co-autorados com Claude (Fable 5, Opus 4.8, Sonnet 5) — desenvolvimento
  assistido por Claude Code é a norma, não exceção.

## 1. Arquitetura

**Backend — Clean Architecture de 4 camadas, replicada de forma idêntica em 19 módulos**
(`apps/backend/src/modules/<feature>/`), formalizada em ADR-0004 e ADR-0006 e na tabela
camada→pasta de `.memory/domain-rules.md`:

| Camada | Pasta | Conteúdo | Evidência |
|---|---|---|---|
| Domínio | `domain/` | `*.entity.ts`, `*.repository.interface.ts`, `exceptions/*.exception.ts`, lógica pura (ex.: `split-validation.ts`) — zero imports de framework | `modules/transactions/domain/` |
| Aplicação | `application/use-cases/` | **um arquivo por operação** (`create-transaction.use-case.ts`); às vezes `application/ports/` e `application/jobs/` | `modules/auth/application/ports/auth-provider.interface.ts` |
| Infraestrutura | `infrastructure/persistence/` | `drizzle-<feature>.repository.ts` + `<feature>.mapper.ts` + `<feature>-infrastructure.module.ts` | `modules/transactions/infrastructure/persistence/` |
| Interface | `interface/` | `*.controller.ts`, `dto/*.dto.ts`, `guards/`, `decorators/` | `modules/transactions/interface/` |

- DI de repositório por **Symbol token**: `export const TRANSACTION_REPOSITORY = Symbol(...)` + `@Inject(...)`.
- **Use-cases nunca importam DRIZZLE** (regra 1 de domain-rules); dependem só da interface do repositório.
- Cross-cutting em `src/common/` (auth, cache, exceptions, filters, guards, household, i18n, interceptors, telemetry, time); persistência em `src/database/` (schema/, migrator.ts).
- Receita passo-a-passo de módulo novo em `.memory/domain-rules.md` e no slash command `/new-module` (referência: `modules/health/`).

**Frontend — feature-based** (ADR-0007): `apps/frontend/src/features/<feature>/{components,hooks,schemas,types,lib,index.ts}` (17 features), `pages/` fino (pages router com `[householdSlug]`), `infrastructure/` (api/client.ts, query/), `shared/` (components/ui shadcn, hooks, lib, styles), `providers/`.

**Tendência geral**: implementações diretas dentro de um esqueleto arquitetural rígido. Abstração só onde o padrão exige (interfaces de repositório, ports); nenhuma abstração especulativa observada. Arquivos pequenos e de responsabilidade única (média ~9,6 arquivos por commit com ~389 inserções — mudanças fatiadas).

## 2. Convenções de código

- **Arquivos**: kebab-case com **sufixo semântico obrigatório**: `.use-case.ts`, `.repository.interface.ts`, `.repository.ts`, `.entity.ts`, `.mapper.ts`, `.exception.ts`, `.dto.ts`, `.controller.ts`, `.module.ts`, `.guard.ts`, `.interceptor.ts`, `.filter.ts`, `.job.ts`, `.spec.ts`, `.e2e-spec.ts`. Frontend: hooks `use-*.ts`, schemas `*.schemas.ts`, componentes `*.tsx` kebab-case.
- **Exports nomeados apenas** — zero `export default` no backend e nas features (única exceção documentada: cena R3F com `next/dynamic`).
- **`function` para funções exportadas** (`export function useTransactions(...)`); arrow functions só para callbacks/consts locais.
- Retornos antecipados e validação no topo dos use-cases; imutabilidade preferida (sem mutação de entidades fora dos mappers).
- Unions em `type` (`type TransactionType = "income" | "expense"`); contratos de objeto em `interface`.
- Comentários esparsos, em português, apenas para restrições não óbvias (ex.: aviso de hash no migrator). Sem JSDoc sistemático.

## 3. TypeScript

- **Strict máximo**: `strict: true`, `noUncheckedIndexedAccess: true`, `isolatedModules: true` (`@repo/typescript-config`), decorators habilitados no backend.
- **`any` é efetivamente banido**: 0 ocorrências de `: any`/`as any` no backend; 2 tokens residuais no frontend.
- `unknown` usado deliberadamente (`catch (exception: unknown)` no filter global).
- Cast sancionado para mocks em testes: `as unknown as T`.
- Tipos de retorno explícitos em use-cases (`Promise<TransactionEntity>`); DTOs class-validator com definite-assignment `!`.
- Tipos derivados de schema: `$inferSelect`/`$inferInsert` no Drizzle; `z.infer` no frontend; tipos Supabase gerados em `@repo/types`.

## 4. Frontend

- **React Query** com key factory única em `src/infrastructure/query/query-keys.ts`, shape `[domain, ...scope, operation?, params?]`, desenhada para invalidação ampla por prefixo. Nunca criar keys inline.
- Hooks retornam shapes de domínio normalizados: `{ transactions, total, loading, error }`; erros traduzidos via `translateApiError`.
- **Formulários**: zod + react-hook-form + `@hookform/resolvers`; schemas via factory i18n (`makeTransactionSchema(t)`).
- **UI**: shadcn/Radix em `shared/components/ui/` (25 componentes); `cn()` (`shared/lib/utils.ts`) obrigatório para merge de classes — nunca template string.
- **Estados explícitos**: `Skeleton` durante loading, componente `EmptyState`/bloco dashed com CTA quando vazio, erro tratado — padrão consistente (ex.: `transactions-page.tsx`).
- **Mobile-first, dark-only, glass** (ADR-0021 + 29 regras numeradas em `.memory/domain-rules.md`): base ~375px com `sm:`/`md:` progressivos, tokens OKLCH — nunca cores Tailwind hardcoded, Sheet para create/edit, Dialog para confirmação.
- **i18n**: 7 locales (pt-BR default), `useTranslation("namespace")`, gate de drift `pnpm check-locales` no CI. Moeda fixa BRL (`formatCentsToBRL`).

## 5. Backend

- Um controller por módulo em `interface/`, delegando a use-cases; **use-cases nunca lançam exceções HTTP** — apenas subclasses de `DomainException`.
- Validação de entrada com **class-validator + class-transformer** nos DTOs (`@IsIn`, `@IsInt`, `@Min`, `@ValidateNested`, `@Type`).
- Auth: `AuthGuard` (Supabase) + `HouseholdMembershipGuard` compostos em todo controller escopado por household; `super_admin` bypass (ADR-0013); `CronSecretGuard` no tick interno.
- Cron unificado: decorator + `DiscoveryService`, jobs em `application/jobs/`, tick a cada 5min via Railway (ADR-0019→0020/0024).
- Integrações externas isoladas em módulos próprios (mail/Resend + React Email ADR-0012, subscriptions/Stripe ADR-0026 com verificação de assinatura de webhook via `rawBody`).
- `helmet` + `@nestjs/throttler` habilitados.

## 6. Banco de dados

- **Drizzle ORM** com schema em `src/database/schema/` (subpasta `finance/`), agregado em `schema/index.ts`.
- Convenções: propriedade camelCase → coluna **snake_case explícita** (`uuid("household_id")`); PK uuid `.defaultRandom()`; timestamps `withTimezone: true` + `.defaultNow()`; FKs com `onDelete` explícito; `index()`/`unique()` no terceiro argumento; `relations()` declaradas.
- **Dinheiro sempre em centavos inteiros** (`amount_cents: integer`) — ADR-0017, sem exceção.
- **Migrator custom** (ADR-0003): `pnpm --filter backend db:generate|db:migrate|db:rollback|db:status`; hash sha256 do SQL bruto ⇒ **nunca editar um `.sql` gerado**; todo `.sql` tem companheiro `.down.sql` (regras no `/new-migration`). Baseline squashada em `0000_baseline`.
- **Multi-tenancy: single DB + RLS por household** (ADR-0005/0015): token `DRIZZLE` (role `app_user`, NOBYPASSRLS, claims por request via `AsyncLocalStorage` + `set_config` transacional) vs `DRIZZLE_ADMIN` (BYPASSRLS, só bootstrap/cron/guards). Gotcha documentado: leituras "read-what-I-just-wrote" precisam usar a MESMA conexão `DRIZZLE` da transação aberta — daí métodos duplicados `...`/`...Admin` em alguns repositórios.
- `household_id` **nunca vem do cliente** em inserts — derivado da sessão.

## 7. Testes

- **Backend**: Jest + ts-jest. Unit `*.spec.ts` **colocado junto do código** (21 arquivos, foco em use-cases e domínio); e2e `apps/backend/test/*.e2e-spec.ts` (21 arquivos), `--runInBand`, sobem o AppModule real contra Supabase local (ex.: `rls-isolation.e2e-spec.ts`).
- Mocks: objetos tipados à mão + `jest.Mocked<IRepo>` + `as unknown as`; factories de dados por helper (`dueEntry(partial)`); helpers e2e em `test/helpers.ts`.
- **Frontend**: Playwright em `apps/frontend/e2e/`.
- **TDD obrigatório por módulo** (`.memory/domain-rules.md` §Qualidade): unit para use-cases/domínio + integração controller+repo contra DB local.
- Preferência clara por **testar comportamento** (entrada→saída dos use-cases, respostas HTTP nos e2e), não implementação.
- Comandos reais: `pnpm --filter backend test`, `pnpm --filter backend test:e2e`, `pnpm --filter frontend test:e2e`. Filtro direcionado: `pnpm --filter backend test -- <pattern>`.

## 8. Tratamento de erros

- Base abstrata `DomainException` (`common/exceptions/domain.exception.ts`) com `readonly code` SCREAMING_SNAKE (`TRANSACTION_NOT_FOUND`).
- Mapa central `DOMAIN_CODE_TO_STATUS` (`common/exceptions/domain-status.map.ts`, ~60 códigos) → status HTTP; código novo **deve** ser registrado lá (regra 5 de domain-rules); não mapeado cai em 500 e é reportado.
- `AllExceptionsFilter` global único: DomainException → `{ statusCode, code, message, path, timestamp }`; erro desconhecido → 500 genérico (nunca vaza internals); só ≥500 vai para Better Stack.
- Frontend espelha com `ApiError` tipado (`status`/`code`/`path`) em `infrastructure/api/client.ts`.
- **Não é Result pattern** — é exceção de domínio + mapa de códigos. Não introduzir Either/Result.

## 9. Segurança

- Defesa em profundidade: guards na aplicação + RLS no banco (helpers `is_household_member`/`is_household_owner`/`is_super_admin` sobre `auth.uid()`).
- Segredos só via env (`turbo.json globalEnv` enumera todos); `.env` gitignored; nunca logar tokens/segredos.
- Households suspensos bloqueados no guard; rate limiting via throttler; webhooks Stripe com verificação de assinatura; sessão endurecida (ADR-0027).

## 10. Git e processo de entrega

- **Conventional Commits em português, sem acentos**, escopo sempre presente: `feat(support): ... (M15 PR3 1/5)`. Distribuição: feat 88 · docs 26 · fix 16 · chore 16 · ci 10 · test 8.
- Breaking changes com `!`: `refactor(admin)!: ...`.
- **Milestone/fatia no título**: `(M15 PR3 4/5)`, códigos de tarefa `(P-5)`, `(I-8)`.
- Corpos longos explicando o **porquê** e decisões de escopo.
- **100% via PR** contra `development` (PRs #1–#30); `main` = produção, `staging` = ambiente; branches `feature/*`, `fix/*`, `docs/*`, `chore/*`, `ci/*`. Sem tags.
- Workflow registrado na memória do usuário: **1 branch/PR por fase (milestone); subtarefas = commits revisados+testados na branch da fase; CI na PR; dev→staging→main**.
- CI (`.github/workflows/ci.yml`): job `verify` (check-types → lint → check-locales → build) + job `test` (unit → supabase start → db:migrate → e2e serial). Ambos com `--max-warnings 0`.
- Critério implícito de conclusão: check-types + lint + testes relevantes verdes antes do commit; `docs(memory)` fechando cada milestone (roadmap + recent-decisions + ADR quando aplicável).

## 11. Preferências inferidas do autor

| Preferência inferida | Evidência | Confiança | Aplicação nos agentes |
|---|---|---|---|
| Um use-case por operação, nunca DRIZZLE no use-case | 19 módulos idênticos + domain-rules regra 1 + ADR-0004/0006 | Alta | Implementer segue a receita de módulo; Reviewer rejeita violação de camada |
| Dinheiro em centavos inteiros `_cents` | ADR-0017 + todo o schema + frontend `formatCentsToBRL` | Alta | Database-guardian e Reviewer bloqueiam float/decimal para dinheiro |
| Kebab-case + sufixos semânticos de arquivo | Todos os módulos + features | Alta | Implementer nomeia arquivos por sufixo |
| Named exports + `function` para exportadas | Grep no backend/features; exceção única documentada | Alta | Implementer; Reviewer aponta `export default` novo |
| Zero `any`; `as unknown as` só em mocks de teste | 0 ocorrências backend; specs existentes | Alta | Implementer/Reviewer |
| Exceção de domínio + código no mapa central (sem Result pattern) | `common/exceptions/` + domain-rules regra 2 e 5 | Alta | Implementer registra código novo no mapa; Reviewer confere |
| Query keys só via factory central | `infrastructure/query/query-keys.ts` + hooks | Alta | Implementer nunca cria key inline |
| Mobile-first dark-only, tokens OKLCH, `cn()` | 29 regras em domain-rules + ADR-0021 + shared/lib/utils.ts | Alta | Implementer (frontend) segue as regras numeradas |
| TDD: unit colocado + e2e por feature | domain-rules §Qualidade + 42 arquivos de teste + job `test` no CI | Alta | Tester exige teste para use-case novo; Reviewer avalia suficiência |
| Nunca editar `.sql` gerado; sempre `.down.sql` | migrator.ts (hash) + /new-migration + ADR-0003 | Alta | Database-guardian bloqueia edição de migration gerada |
| Conventional Commits pt-BR sem acentos + escopo + milestone | 195 commits consistentes | Alta | Mensagens de commit (quando solicitadas) seguem o padrão |
| Entregas fatiadas "PR X de N", corpos com o porquê | Histórico M10–M15 + memória do usuário | Alta | Planner fatia planos em passos pequenos e coerentes |
| RAG recall antes de ler código | CLAUDE.md (obrigatório) + hooks UserPromptSubmit + ADR-0008 | Alta | Locator/Planner chamam `memory_search` primeiro |
| Documentar decisões em ADR/`.memory` ao fim | 28 ADRs + commits `docs(memory)` fechando milestones | Alta | Coordinator lembra de propor `/adr` quando decisão durável surge |
| i18n completo nos 7 locales a cada string nova | `check-locales` no CI + commit `feat(i18n)` (I-8) | Alta | Implementer atualiza os 7 locales; Tester roda check-locales quando toca i18n |
| Prettier com estilos por app (backend com `;`, frontend sem) | Arquivos reais divergem por app | Média | Implementer imita o arquivo vizinho, não impõe estilo próprio |
| Sem tags/releases semânticas | `git tag` vazio | Média | Agentes não propõem versionamento por tag |

## 12. Antipadrões observados (proteções, não críticas)

- **`.memory/MEMORY.md` desatualizado** (indexa ADRs até 0024; existem 28) → agentes não devem confiar cegamente no índice; usar `memory_search` ou ler `recent-decisions.md`.
- **Contexto triplicado** (`.claude/CLAUDE.md` ≈ `.codex/AGENTS.md` ≈ `.memory/`) → mudanças de convenção devem ser replicadas nos espelhos; agentes referenciam em vez de duplicar.
- **`@repo/ui` citado na memória mas inexistente em disco** (componentes vivem em `apps/frontend/src/shared/components/ui/`) → Locator valida paths em disco antes de repassar.
- **Gotcha RLS read-what-I-just-wrote** (métodos duplicados `.../Admin` nos repositórios) → fonte recorrente de bug silencioso; Database-guardian e Reviewer verificam qual conexão é usada.
- **2 `any` residuais no frontend** → não replicar; corrigir apenas se o arquivo já estiver em escopo.
- **e2e serial e dependente de Supabase local** → Tester nunca roda e2e por padrão; só quando o risco justifica e o ambiente está de pé.

## 13. Author Development Rules

### MUST
1. Usar **pnpm** exclusivamente (nunca npm/yarn); dep em package específico via `pnpm add <pkg> --filter <nome>`.
2. Representar dinheiro como **centavos inteiros** (`*_cents`) em todo o stack.
3. Backend: um use-case por operação; use-cases dependem apenas de interfaces de repositório (Symbol token) — **nunca** importar DRIZZLE/infra na camada de aplicação.
4. Erros de negócio: lançar subclasse de `DomainException` com `code` SCREAMING_SNAKE **e registrar o código em `domain-status.map.ts`**.
5. Arquivos em kebab-case com sufixo semântico correto (`.use-case.ts`, `.dto.ts`, etc.).
6. Exports nomeados; `function` para funções exportadas.
7. TS strict sem `any`; `as unknown as` apenas para mocks em specs.
8. Frontend: query keys só via `infrastructure/query/query-keys.ts`; classes Tailwind só via `cn()`; tokens de design (nunca cores hardcoded); mobile-first.
9. Toda string de UI nova em **todos os 7 locales** (gate `pnpm check-locales`).
10. Migrations: gerar via `pnpm --filter backend db:generate`, nunca editar o `.sql` gerado, sempre criar o `.down.sql` companheiro.
11. Novo use-case ou lógica de domínio acompanha teste unitário colocado (`*.spec.ts`).
12. `household_id` derivado da sessão — nunca aceito do cliente.
13. Chamar `memory_search` (MCP `larmony-memory`) antes de varrer código para perguntas de "onde/como funciona X".
14. Validar com os scripts reais: `pnpm check-types`, `pnpm lint` (`--max-warnings 0`), `pnpm --filter backend test`.

### SHOULD
1. Seguir a receita de `/new-module` (referência `modules/health/`) para módulos novos e `/new-migration` para migrations.
2. Reutilizar componentes de `shared/components/ui/` e padrões de feature existentes antes de criar novos.
3. Commits em Conventional Commits pt-BR sem acentos, com escopo e referência de milestone/fatia; corpo explicando o porquê.
4. Fatiar entregas grandes em passos pequenos revisáveis ("PR X de N").
5. Registrar decisões duráveis em ADR (`/adr`) e atualizar `recent-decisions.md`/`roadmap.md` ao fechar milestone.
6. Preferir retornos antecipados e validação no topo; espelhar o estilo do arquivo vizinho (semicolons diferem por app).
7. Usar `EmptyState`/`Skeleton` e tratamento de erro explícito em toda tela nova.

### MAY
1. Usar `unknown` + narrowing quando o tipo é genuinamente desconhecido.
2. Criar `application/ports/` quando o use-case depende de serviço externo (padrão do módulo auth).
3. Adicionar helpers puros no domínio (`split-validation.ts`) quando a regra é reutilizada.
4. Rodar a suíte e2e completa localmente quando a mudança toca RLS, billing ou cron.

### MUST NOT
1. Executar `git push`, deploy, publish, migrations em banco remoto ou alterar secrets/ambientes.
2. Criar commits sem solicitação explícita do usuário.
3. Usar `git reset --hard`, `git clean -fd` ou apagar branches.
4. Editar arquivos `.sql` de migration já gerados (quebra o hash do migrator).
5. Introduzir Result/Either pattern, `export default`, `any`, cores Tailwind hardcoded ou query keys inline.
6. Usar `DRIZZLE_ADMIN` fora de bootstrap/cron/guards — e nunca para contornar RLS em fluxo de usuário.
7. Refatorar, renomear ou "melhorar" código fora do escopo solicitado; adicionar dependência sem provar que o existente não resolve.
8. Criar migrations novas sobre schema sem passar pelo fluxo `db:generate` + `.down.sql`.
9. Logar dados sensíveis (tokens, segredos, dados financeiros identificáveis).
