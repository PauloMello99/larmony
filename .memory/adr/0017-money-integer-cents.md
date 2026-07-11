# ADR-0017 — Dinheiro em centavos inteiros em todo o stack

**Status:** Aceito
**Data:** 2026-07-04

## Contexto

O old-larmony armazenava valores monetários como `numeric` e formatava no frontend.
A carcaça ink-ops usava **centavos inteiros** (`integer`) em todas as colunas de
dinheiro. O Larmony lida com transações, orçamentos, metas, contribuições, contas e
rateios — aritmética de dinheiro em float/numeric convertido em JS é fonte clássica
de bugs de arredondamento.

## Decisão

- Toda coluna monetária é `integer` em **centavos**, sufixo `_cents`
  (`amount_cents`, `target_amount_cents`, `share_amount_cents`, ...).
- Backend (entidades, DTOs, use-cases) trafega centavos inteiros; nenhuma camada
  interna usa float para dinheiro.
- Conversão para reais acontece **só na borda da UI** (`formatBRL`,
  `parseReaisToCents`).
- Rateio/divisões: sobras de arredondamento são resolvidas deterministicamente
  (ex.: primeira fatia absorve o resto) — regra detalhada no plano do M4.

## Consequências

- Somas/relatórios são exatos por construção; comparações são de inteiros.
- Limite prático de `integer` (±21 bilhões de centavos ≈ R$ 214 milhões) é mais
  que suficiente para finanças domésticas.
