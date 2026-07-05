# 03 — Dashboard (M3)

## Escopo

- Cards de resumo do mês corrente: receitas, despesas, saldo.
- Últimas 5 transações.
- Contas a pagar próximas do vencimento (≤7 dias) — depende do M7 para dados reais;
  até lá a seção pode ficar oculta.
- Atalhos rápidos para lançar transação.

## Regras

- Valores agregados calculados no backend (use-case), não no cliente.
- Substitui o placeholder atual da home do lar (`org-page-placeholder`).
