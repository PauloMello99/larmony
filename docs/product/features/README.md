# Features do Larmony — catálogo (v1)

Uma spec-esqueleto por milestone do roadmap (`.memory/roadmap.md`). Cada spec define
**escopo e regras** — o *plano de implementação* é feito por milestone, quando ele começa.

| # | Feature | Milestone | Status |
|---|---|---|---|
| [01](01-households-core.md) | Households core (tenancy, convites, switcher, i18n) | M1 | ✅ 100% (idioma no Account, onboarding, landing com copy de finanças) |
| [02](02-categorias-e-transacoes.md) | Categorias + Transações | M2 | ✅ entregue (CRUD completo, backend + frontend) |
| [03](03-dashboard.md) | Dashboard | M3 | ✅ entregue (endpoint overview + KPIs reais no frontend) |
| [04](04-parcelamento-e-rateio.md) | Parcelamento + Rateio | M4 | ✅ entregue (N parcelas + rateio igual/específico, combinado) |
| [05](05-orcamentos.md) | Orçamentos (budgets) | M5 | ✅ entregue (CRUD + spending derivado, grid com progress) |
| [06](06-metas.md) | Metas (goals) | M6 | ✅ entregue (CRUD + aportes com histórico + progresso derivado) |
| [07](07-contas-a-pagar.md) | Contas a pagar (bills) + lembretes | M7 | ⛔ superseded pelo ADR-0020 → [10](10-lancamentos-programados.md) |
| [08](08-relatorios.md) | Relatórios | M8 | ✅ entregue (mensal 6m + pizza/pessoa, anual 12m + totais) |
| [09](09-recorrencia.md) | Recorrência | M9 | ⛔ superseded pelo ADR-0020 → [10](10-lancamentos-programados.md) |
| [10](10-lancamentos-programados.md) | Lançamentos programados (unifica 07+09) | ADR-0020 | ✅ entregue (CRUD unificado, toggle auto/manual, launch, engine + lembrete) |

Legenda: 🔲 não iniciado · 🚧 em desenvolvimento · ✅ entregue · ⛔ superseded
