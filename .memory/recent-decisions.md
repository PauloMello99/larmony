# Decisões Recentes

Índice rápido — ver `.memory/adr/` para detalhe completo.

| # | Decisão | Data | Status |
|---|---|---|---|
| ADR-0001 | Turborepo como estrutura de monorepo | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0002 | RAG local com Qdrant + Ollama + MCP Server | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0003 | Drizzle ORM com migrator customizado (suporte a rollback) | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0004 | Arquitetura NestJS com use-cases por operação | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0005 | Multi-tenancy: DB único + tenant_id + RLS | 2026-06-06 | Aceito (re-ratificado Larmony 2026-07; tenant = household, ver ADR-0015) |
| ADR-0006 | Clean Architecture + SOLID no backend NestJS | 2026-06-08 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0007 | Feature-Based Architecture no frontend Next.js | 2026-06-08 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0008 | RAG/memória obrigatória com servidor MCP `larmony-memory` | 2026-06-13 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0009 | Feature Flags para liberação controlada de recursos | 2026-06-13 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0010 | Caixa: livro append-only com erratas + saldo por agregação | 2026-06-16 | **Superseded** — domínio de estúdio; transações do Larmony são editáveis |
| ADR-0011 | Topologia de deploy (staging/prod) + caching in-memory sem Redis | 2026-06-27 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0012 | E-mail transacional: React Email + módulo `mail` dedicado | 2026-06-28 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0013 | super_admin age como owner de qualquer tenant | 2026-06-29 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0014 | Error tracking com Better Stack | 2026-07-01 | Aceito (re-ratificado Larmony 2026-07) |
| ADR-0015 | Household como unidade de tenancy (adaptação do padrão org) | 2026-07-04 | Aceito |
| ADR-0016 | Evolução do RAG: bge-m3 + hybrid search + parent-document | 2026-07-04 | Aceito |
| ADR-0017 | Dinheiro em centavos inteiros em todo o stack | 2026-07-04 | Aceito |
| ADR-0018 | i18n pt-BR/en com locale no perfil do usuário | 2026-07-04 | Aceito |

## Decisões/registros recentes (sem ADR)

- **2026-07-04 — Bootstrap do Larmony**: repo nasceu como cópia da carcaça ink-ops;
  domínio de estúdio removido (Fase 1); old-larmony é a fonte do domínio, esta
  arquitetura é a fonte do *como*. Ver `project-overview.md` e `roadmap.md`.
- **2026-07-04 — Sem permissões por módulo no v1**: households têm 2–4 pessoas;
  roles `owner`/`member` bastam. `member-permissions.ts` (back) e `MODULE_KEYS`
  (front) ficam vazios até existir necessidade real.
- **2026-07-04 — Recorrência fora do v1**: campos e engine só no M9, com design próprio.
- **TDD obrigatório por module**: regra em `domain-rules.md` (test-first;
  unitário + integração por module). Herdada da carcaça.
- **2026-07-07 — M8 Relatórios entregue**: módulo `reports` (backend) +
  `features/reports` (frontend Recharts). Endpoints `GET
  /households/:id/reports/monthly` e `/annual?year=`. Agregação read-only sem
  schema novo; gasto por pessoa via `person_id`. Validado no browser com dados
  reais (bar 6m, donut categoria, lista pessoa, vista anual com cards + nav ano).
- **2026-07-07 — Dev Turbopack cache corrompido**: se `/dashboard/household/[slug]`
  retorna 404 no dev, o `404.tsx` manda de volta para `/dashboard/households`.
  Fix: `pnpm --filter frontend dev:reset`. Build de produção não é afetado.
