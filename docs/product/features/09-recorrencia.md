# 09 — Recorrência (M9) — Superseded

> **Superseded pelo ADR-0020 (2026-07-09)**: unificado com Contas a pagar
> (`07-contas-a-pagar.md`) na feature "Lançamentos programados" — ver
> [`10-lancamentos-programados.md`](10-lancamentos-programados.md). O módulo
> `recurrences` e a rota `/recurrences` não existem mais; recorrências antigas
> foram migradas para `scheduled_transaction_entries` com `posting_mode='auto'`
> (preservando `id`).
>
> Conteúdo original (skeleton pré-implementação) preservado abaixo por histórico.

---

## Escopo

- Transações recorrentes (ex.: salário mensal, assinatura) com geração automática.
- Schema novo (migration própria): campos/tabela de regra de recorrência — **não
  existem no baseline** de propósito (nunca foram implementados no old-larmony).

## A definir no plano (design próprio)

- Modelo: regra RRULE-like vs periodicidade simples (mensal/semanal/anual).
- Geração: no tick do cron (materializa próximas N ocorrências) vs on-read.
- Edição de série vs ocorrência única; fim de série; pausa.
- Relação com bills (evitar sobreposição conceitual: bill = definição estática +
  lembrete; recorrência = lançamento automático).
