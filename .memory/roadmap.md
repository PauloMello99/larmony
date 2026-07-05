---
name: roadmap
description: Roadmap do Larmony — fases do bootstrap e milestones de features (M1–M9), cada um vira um plano próprio
metadata:
  type: project
---

# Roadmap — Larmony

> Snapshot de **2026-07-04** (bootstrap do projeto). Cada milestone de feature (M1–M9)
> vira um plano de implementação próprio antes de começar.

## Bootstrap (em andamento)

| Fase | Escopo | Status |
|---|---|---|
| 0 — Preparação | branch `bootstrap/larmony`, baseline verde | ✅ |
| 1 — Cleanup | remover domínio ink-ops, manter shell de infra; renames RAG/branding | ✅ |
| 2 — Redocumentação | `.memory/`, ADRs re-ratificados, `docs/`, `CLAUDE.md` | em andamento |
| 3 — Evolução do RAG | bge-m3, chunking token-aware, parent-document, hybrid search, indexar código, hook SessionStart | pendente |
| 4 — Fundação do produto | rename org→household, schema `finance/`, squash de migrations + RLS, i18n base | pendente |

## Milestones de features (cada um = plano próprio)

| M | Feature | Escopo resumido |
|---|---|---|
| M1 | **Households core** | rename org→household ponta a ponta, signup→setup de lar, convites, switcher multi-lar, i18n base, landing com copy do Larmony |
| M2 | **Categories + Transactions simples** | CRUD de categorias (13 defaults por use-case) e transações (income/expense, filtros mês/tipo/categoria, Sheet lateral) |
| M3 | **Dashboard** | resumo mensal (receitas/despesas/saldo), últimas 5 transações, contas ≤7 dias, atalhos |
| M4 | **Parcelamento + rateio** | installment_groups (N parcelas), transaction_members (split igual/específico), coluna Pessoa |
| M5 | **Budgets** | limite mensal por categoria, spending derivado, navegação mês/ano |
| M6 | **Goals** | metas + contribuições, progresso derivado por SUM, badge concluída |
| M7 | **Bills + lembretes** | CRUD de contas, use-case `send-bill-reminders` plugado no tick do internal-cron, guarda mensal via `reminder_last_sent_at` |
| M8 | **Relatórios** | vista mensal (6 meses + pie + por pessoa via `person_id`) e anual (12 meses) |
| M9 | **Recorrência** | schema + engine de transações recorrentes — a lacuna eterna do old-larmony; design próprio |

## Fora de escopo do v1

- Permissões por módulo (roles owner/member bastam).
- Billing/assinatura (módulo `subscriptions` fica como shell).
- OAuth Google/Apple (old-larmony tinha; reavaliar após M1 — auth atual é e-mail/senha).
- Ledger append-only de transações (ADR-0010 superseded).

## Infra pendente

- Reset do banco staging quando o baseline novo de migrations existir (Fase 4) —
  **destrutivo, confirmar antes**.
- Railway MCP sem autorização local (`railway login`) — snapshot de env vars manual
  antes do reset.
