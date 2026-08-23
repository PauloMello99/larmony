# larmony — Memory Index

- [Project Overview](project-overview.md) — O que é o Larmony, origem (old-larmony + carcaça ink-ops), estado atual do monorepo
- [Architecture](architecture.md) — Estrutura de pastas, NestJS Clean Architecture, Drizzle migrations, cron unificado, Supabase local, Turborepo
- [Domain Rules](domain-rules.md) — Households, transações (parcelamento/rateio), metas, orçamentos, bills, recorrência (M9) + convenções obrigatórias de backend/frontend
- [Roadmap](roadmap.md) — Fases do bootstrap + milestones M1–M9 (cada um vira plano próprio)
- [Recent Decisions](recent-decisions.md) — Índice rápido de todos os ADRs
- [Supabase Coupling](supabase-coupling.md) — Mapa de acoplamento ao Supabase (auth/storage/RLS) e sign-up atômico
- [Jest e2e testMatch em worktree Windows](jest-e2e-testmatch-worktree-windows.md) — "No tests found" sob `.claude/worktrees`, workaround com `--testMatch`
- [Supabase local multi-worktree](larmony-supabase-local-multi-worktree.md) — portas +1000 pra rodar em paralelo, `db reset` quando o volume compartilhado tem migrations divergentes
- [amountCents sinal no statement-import](statement-import-amount-cents-sign-gotcha.md) — bug real de sinal negativo cruzando a fronteira processor↔backend, corrigido na revisão final da Fase 2

## ADRs

- [ADR-0001: Turborepo monorepo](adr/0001-turborepo-monorepo-starter.md) — pnpm workspaces + Turborepo 2 como estrutura base
- [ADR-0002: RAG local Qdrant + Ollama](adr/0002-rag-local-qdrant-ollama-mcp.md) — memória semântica do Claude Code via MCP
- [ADR-0003: Drizzle ORM + migrator customizado](adr/0003-drizzle-orm-custom-migrator.md) — rollback via .down.sql, hash computation rule
- [ADR-0004: NestJS use-case architecture](adr/0004-nestjs-use-case-module-architecture.md) — um use-case por operação, sem service layer
- [ADR-0005: Multi-tenancy single DB + RLS](adr/0005-multitenant-single-db-rls.md) — tenant_id em toda tabela de domínio + RLS
- [ADR-0006: Clean Architecture + SOLID](adr/0006-clean-architecture-solid.md) — quatro camadas por módulo
- [ADR-0007: Frontend feature-based](adr/0007-frontend-feature-based-architecture.md) — features/ + pages finas
- [ADR-0008: RAG obrigatório](adr/0008-mandatory-rag-memory.md) — recall antes de ler código
- [ADR-0009: Feature flags](adr/0009-feature-flags.md) — liberação controlada de recursos
- [ADR-0010: Ledger caixa append-only](adr/0010-caixa-append-only-erratas-saldo-agregado.md) — **superseded** (domínio de estúdio)
- [ADR-0011: Deploy + caching](adr/0011-deploy-topology-e-caching.md) — Railway staging/prod, cache in-memory
- [ADR-0012: E-mail transacional](adr/0012-transactional-email-react-email.md) — Resend + React Email, módulo mail
- [ADR-0013: super_admin acts as owner](adr/0013-super-admin-acts-as-owner.md) — bypass com banner + audit
- [ADR-0014: Better Stack](adr/0014-error-tracking-better-stack.md) — telemetria/error tracking
- [ADR-0015: Household como tenancy](adr/0015-household-tenancy.md) — org → household no Larmony
- [ADR-0016: Evolução do RAG](adr/0016-rag-evolution-bge-m3-hybrid-parent.md) — bge-m3, hybrid, parent-document, código
- [ADR-0017: Centavos inteiros](adr/0017-money-integer-cents.md) — dinheiro sem float em todo o stack
- [ADR-0018: i18n pt-BR/en](adr/0018-i18n-locale-no-perfil.md) — locale persistido no perfil
- [ADR-0019: Recorrência (engine no cron via DRIZZLE_ADMIN)](adr/0019-recurrence-engine-cron-admin-write.md) — modelo simples sem RRULE, geração no tick, sem reuso do use-case request-scoped
- [ADR-0020: Unificar bills+recurrences](adr/0020-unify-bills-recurrences-scheduled-transactions.md) — scheduled_transaction_entries, posting_mode auto/manual
- [ADR-0021: Design System Claude Design](adr/0021-design-system-claude-design.md) — logo, landing, glass app-wide
- [ADR-0022: Orçamentos série + versões](adr/0022-budget-series-versions.md) — resolução on-read, upsert no mês corrente, remoção sempre encerra
- [ADR-0023: Dispatcher multicanal de notificações](adr/0023-notification-dispatcher-multicanal.md) — in-app+e-mail+SMS/WhatsApp stub, dedup por evento em tabela dedicada
- [ADR-0024: Timezone + hora dos disparos por lar](adr/0024-cron-timezone-household.md) — cron resolve "agora" no fuso do lar (date-fns-tz), hora preferida por lar, currentPeriodStart migrado
- [ADR-0033: Import/categorização regras+ML](adr/0033-import-categorizacao-regras-ml-llm-fallback.md) — pipeline em camadas (regras/CNPJ/membro do lar/memória/ML/LLM fallback); adendo: serviço Python dedicado (`statement-processor`), nunca toca Postgres/RLS direto
- [ADR-0034: Contrato de API backend↔statement-processor](adr/0034-contrato-api-backend-statement-processor.md) — POST /jobs + callback, categoryCode fechado de 13 códigos, staging em `statement_import_candidates` (não em `transactions`)
