# larmony — Referência para Claude Code

## O que é

**Larmony** — controle financeiro doméstico multi-usuário (households/lares como
tenant, RLS). Monorepo Turborepo: `apps/backend` (NestJS 11, Clean Architecture),
`apps/frontend` (Next.js pages router, feature-based), `packages/` com libs
compartilhadas. Redesenvolvimento do `old-larmony` (mesma pasta pai — fonte de
verdade do domínio) sobre a carcaça arquitetural herdada do ink-ops.

Visão do produto: `docs/product/visao-e-dominio-v1.md` · roadmap: `.memory/roadmap.md`.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo 2 + pnpm workspaces |
| Linguagem | TypeScript 5 strict |
| Backend | NestJS 11 + Drizzle ORM (migrator custom) + Supabase (auth/RLS) |
| Frontend | Next.js (pages router) + React 19 + Radix UI + Tailwind CSS |
| Estado servidor | TanStack React Query (keys em `infrastructure/query/query-keys.ts`) |
| E-mail | Resend + React Email (módulo `mail`; from `Larmony <team@larmony.me>`) |
| Telemetria | Better Stack (front + back) |
| Deploy | Railway (staging: Frontend + Backend + Cron tick 5min) |
| Tipos DB | Supabase CLI → `@repo/types` |

## Packages disponíveis

- `@repo/eslint-config` — configs ESLint por runtime (next, react-internal, node, base)
- `@repo/typescript-config` — tsconfigs por runtime (nextjs, nestjs, react-library, base)
- `@repo/ui` — componentes React (shadcn pattern); importar raw `.tsx`, sem build
- `@repo/utils` — `cn()` para merge seguro de classes Tailwind
- `@repo/types` — tipos Supabase compartilhados (popular via `supabase gen types`)

## Comandos

```bash
pnpm dev           # dev de todos os packages/apps
pnpm build         # build com cache Turborepo
pnpm lint          # lint com cache
pnpm check-types   # type-check com cache
pnpm format        # prettier em todo o repo
pnpm db:generate   # drizzle-kit generate
pnpm db:migrate    # aplica migrations (ver ADR-0003)
```

Supabase local: `npx supabase start` (API 54321, DB 54322, Studio 54323).

## Convenções críticas

- **NUNCA npm/yarn** — sempre pnpm
- Instalar dep em package específico: `pnpm add <pkg> --filter @repo/<nome>`
- Instalar dev dep na raiz: `pnpm add -Dw <pkg>`
- Merging de classes Tailwind: sempre `cn()`, nunca template string
- Novas Turborepo tasks devem ser declaradas em `turbo.json`
- Dinheiro: **centavos inteiros** (`_cents`) em todo o stack (ADR-0017)
- Backend: um use-case por operação; use-cases nunca importam DRIZZLE direto
  (regras completas em `.memory/domain-rules.md`)
- Frontend: mobile-first; regras de UI obrigatórias em `.memory/domain-rules.md`
- **Estado transitório**: schema/migrations ainda são os herdados do ink-ops —
  serão squashados no M1 (fundação). Não criar migrations sobre o schema velho.

## Memória semântica (RAG) — OBRIGATÓRIO

> **Recall primeiro (faça isto antes de ler código).** Para qualquer pergunta
> "onde/como funciona X", chame a MCP tool `memory_search("sua pergunta")` do servidor
> **`larmony-memory`** **antes** de varrer/ler o código-fonte — ela busca semanticamente
> o banco de memória (`.memory/`, `docs/`, READMEs dos packages, `CLAUDE.md`) e devolve
> os trechos relevantes. Só leia o código quando os trechos recuperados forem
> insuficientes. Use `memory_status()` para confirmar que o índice está populado.

**Criação (obrigatória quando relevante).** Quando um chat estabelecer algo durável —
uma decisão, convenção ou *gotcha* — registre-o no arquivo `.memory/` certo (ou um novo
ADR) **antes de encerrar**. Chats triviais estão isentos; o objetivo é capturar
conhecimento que vale recall depois, não transcrever tudo.

**Indexação (automática).** O índice é re-atualizado em background no início da
sessão (hook SessionStart) e imediatamente após qualquer escrita em `.memory/`
(hook PostToolUse). Stack: Qdrant (Docker, `:6333`, hybrid dense+BM25) + Ollama
(`:11434`, **bge-m3**), coleção `larmony_memory`, com parent-document retrieval e
código TypeScript indexado (opt-in via `include_code`/`app`/`module`/`layer`) —
ver ADR-0016. Setup inicial: `/rag-setup`.

Comandos manuais (raramente necessários — o hook cuida disso):
```powershell
docker compose -f docker-compose.rag.yml up -d          # subir Qdrant
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate   # reindex
```
Ou os slash commands `/memory-index` e `/memory-search`.

### Estrutura de `.memory/`

| Arquivo | Quando atualizar |
|---|---|
| `project-overview.md` | Mudança de escopo ou propósito |
| `architecture.md` | Nova app adicionada, decisão estrutural |
| `domain-rules.md` | Nova convenção de código ou regra de domínio |
| `roadmap.md` | Milestone concluído/replanejado |
| `recent-decisions.md` | Após criar novo ADR |
| `adr/NNNN-*.md` | Para cada decisão arquitetural relevante |
| `sessions/YYYY-MM-DD-*.md` | Resumo de sessão complexa |

ADRs em `.memory/adr/` são **versionados em git**. Notes de sessão não são.
