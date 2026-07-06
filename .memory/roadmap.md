---
name: roadmap
description: Roadmap do Larmony — bootstrap concluído, auditoria de milestones M1–M9 com estado real, esforço e estimativas (snapshot 2026-07-06)
metadata:
  type: project
---

# Roadmap — Larmony

> Snapshot de **2026-07-06** (auditoria pós-bootstrap). Cada milestone vira um
> plano de implementação próprio antes de começar. Esforço em dias-de-dev
> aproximados (dev sênior + agente).

## Bootstrap — CONCLUÍDO ✅

| Fase | Escopo | Status |
|---|---|---|
| 0 — Preparação | branch, baseline verde | ✅ |
| 1 — Cleanup | domínio ink-ops removido, shell de infra mantido | ✅ |
| 2 — Redocumentação | `.memory/`, ADRs 0001–0018, `docs/`, `CLAUDE.md` | ✅ |
| 3 — Evolução do RAG | bge-m3, parent-document, hybrid, código indexado, SessionStart | ✅ |
| 4 — Fundação | org→household, schema `finance/`, baseline 0000+0001 RLS, i18n base | ✅ |
| Extras | cron registry (@CronJobName + DiscoveryService), GuestGuard, shell teal + IA completa do sidebar, placeholders M2–M8 | ✅ (2026-07-05) |

## Auditoria de milestones (2026-07-06)

| M | Feature | Estado real | O que falta | Esforço |
|---|---|---|---|---|
| M1 | Households core | **~85%** — rename ponta a ponta, convites funcionais, switcher, GuestGuard, i18n base, shell teal | seletor de idioma no Account, onboarding signup→criar lar guiado, landing com copy Larmony | **S** (0,5–1d) |
| M2 | Categories + Transactions | schema pronto + 13 defaults semeadas; **0% módulo/UI** | módulos backend (CRUD use-cases) + telas (lista, filtros mês/tipo/categoria, Sheet lateral) | **L** (3–5d) |
| M3 | Dashboard | **✅ entregue (2026-07-06)** — `GET /households/:id/overview` (mês corrente+anterior, metas, contas ≤7d, orçamentos, 5 transações recentes) + overview do frontend com trends, progress bars e skeletons | nada — evolui sozinho conforme M2/M4-M7 populam as tabelas | — |
| M4 | Parcelamento + rateio | schema pronto (installment_groups, transaction_members); 0% lógica | use-cases (criar N parcelas, split igual/específico com sobra determinística ADR-0017) + UI no Sheet | **M** (2–3d) |
| M5 | Budgets | schema pronto (unique household+categoria+mês+ano); 0% | módulo + tela (grid com progress, spending derivado em tempo real) | **M** (1,5–2d) |
| M6 | Goals | schema pronto; 0% | módulo + tela (cards, aportes via dialog, progresso derivado por SUM) | **M** (1,5–2d) |
| M7 | Bills + lembretes | schema pronto; **fatia cron em entrega** (job send-bill-reminders + dedup bill×mês, sessão 2026-07-06) | CRUD/telas de bills, "lançar como transação", config de lembrete na UI | **S/M** (1–1,5d pós-fatia) |
| M8 | Relatórios | 0% (Recharts já é dependência) | use-cases de agregação (mensal 6m, anual 12m, por pessoa via person_id) + telas bar/pie | **M/L** (2–4d) |
| M9 | Recorrência | fora do schema **por design** (nunca existiu no old-larmony) | design próprio: modelo de regra, engine no tick do cron, edição de série vs ocorrência, relação com bills | **L** (3–5d) |

**Ordem sugerida de execução:** M1 (fechar) → M2 → M3 (fechar) → M5 → M7 (fechar) → M6 → M4 → M8 → M9.
Racional: M2 destrava dados reais para tudo; budgets/bills têm mais valor doméstico imediato que parcelamento.

## Qualidade — testes (sessão 2026-07-06)

- Backend: Jest + supertest — unit (use-cases com fakes) + integração por
  funcionalidade contra Supabase local (auth, households, invitations,
  isolamento RLS, cron/dedup).
- Frontend: Playwright — fluxo principal (signup→lar→overview→nav) + convite.
- Regra: **toda feature nova de milestone entrega seus specs junto** (test-first
  por módulo, ver domain-rules).

## Fora de escopo do v1

- Permissões por módulo (roles owner/member bastam).
- Billing/assinatura (módulo `subscriptions` fica como shell).
- OAuth Google/Apple (reavaliar após M1 — auth atual é e-mail/senha).
- Ledger append-only de transações (ADR-0010 superseded).

## Infra — estado 2026-07-06

- **Git**: origin → PauloMello99/larmony, `main` com histórico limpo; v1 em `legacy/v1`.
- **Staging VERDE**: Railway (Backend backend-staging-f229 + Frontend
  frontend-staging-5b93 + Cron) × Supabase `larmony-staging`
  (ubpcmccdvldspoyfoark). Baseline de migrations aplicado, RLS on, health/tick ok.
- **v1 produção**: intocada (decisão 2026-07-05); services trackeiam `main`,
  builds futuros falham sem derrubar o deploy servido.
