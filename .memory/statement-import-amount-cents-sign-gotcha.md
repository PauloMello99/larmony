---
name: statement-import-amount-cents-sign-gotcha
description: amountCents no contrato processor↔backend (ADR-0034) deve cruzar a fronteira sempre positivo — bug real encontrado e corrigido na Fase 2
metadata:
  type: feedback
---

O contrato `.memory/adr/0034-contrato-api-backend-statement-processor.md`
já dizia explicitamente: `amountCents` cruza a fronteira **sempre positivo**
(sinal correto = magnitude, nunca negativo), com `type` carregando a
direção (income/expense) — pra não duplicar a informação de sinal em dois
lugares.

**Mesmo com a regra escrita, a implementação da Fase 2 violou ela nos dois
lados**: `apps/statement-processor/src/statement_processor/pipeline.py`
emitia `amountCents=txn.amount_cents` com o sinal nativo do extrato
(negativo pra débito/despesa), e o backend (`ProcessStatementImportCallbackUseCase`)
não validava nada — o valor negativo ia direto pra
`statement_import_candidates.amount_cents` e, na confirmação, pra
`transactions.amount_cents`. Isso inverteria silenciosamente qualquer soma
por tipo (ex.: cálculo de `spentCents` em `drizzle-budget.repository.ts`,
que assume `amount_cents` sempre positivo pra despesas).

**Achado só na revisão final** (agente `reviewer`), depois de toda a
implementação e todos os testes passando — os e2e testavam o fluxo
completo mas nunca assertavam o valor armazenado de `amount_cents`, só a
existência da linha.

**Correção**: `pipeline.py` agora deriva `type` do sinal ANTES de aplicar
`abs()` em `amountCents`. `ProcessStatementImportCallbackUseCase` ganhou
uma validação de domínio que REJEITA (não normaliza com `Math.abs()`) todo
o callback se qualquer `amountCents` não for inteiro positivo — coagir
esconderia um producer fora do contrato, que é exatamente como isso passou
despercebido.

**Lição pra futuras sessões nesta feature** (Fase 3 PDF/OCR, Fase 4 LLM
fallback, Fase 5 ML): qualquer camada nova que produza `CandidateTransaction`
no processor Python DEVE seguir o mesmo padrão (`type` do sinal, depois
`abs()`) — e qualquer teste e2e de fluude de import que confirme uma
transação deve assertar o `amount_cents` armazenado, não só a existência
da linha, senão esse bug de sinal passa despercebido de novo.

Ver [[larmony-supabase-local-multi-worktree]] e
[[jest-e2e-testmatch-worktree-windows]] pra outros gotchas da mesma
sessão (2026-08-23).
