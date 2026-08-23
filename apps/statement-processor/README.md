# statement-processor

Serviço Python de processamento de extratos (CSV/OFX/PDF) do Larmony —
computação sem estado, **nunca acessa Postgres/RLS diretamente**. Decisão de
arquitetura completa em `.memory/adr/0033-import-categorizacao-regras-ml-llm-fallback.md`
(+ adendo) e o contrato de API em
`.memory/adr/0034-contrato-api-backend-statement-processor.md`. Plano de
implementação em `docs/product/features/16-import-extrato.md`.

**Fora do grafo do Turborepo** — sem `package.json`, não entra em
`pnpm build`/`turbo.json`. Deploy como serviço Railway próprio (Dockerfile
dedicado), mesma plataforma de `apps/backend`/`apps/frontend`.

## Escopo desta Fase 1

Esqueleto do serviço + parsing CSV (adapter Nubank)/OFX (padrão) + camadas
1–3 de categorização (estrutural, keyword, CNPJ→CNAE via BrasilAPI). Sem
PDF/OCR (Fase 3), sem cross-referência de membro do lar/memória por lar
(Fase 2), sem ML (Fase 5), sem LLM fallback (Fase 4).

## Rodando local

```bash
cd apps/statement-processor
python -m venv .venv
source .venv/bin/activate   # ou .venv\Scripts\activate no Windows
pip install -e ".[dev]"
cp .env.example .env        # preencher PROCESSOR_SHARED_SECRET
uvicorn statement_processor.main:app --reload
```

## Testes

```bash
pytest -q
```

Fixtures em `tests/fixtures/` são **dados sintéticos** (nomes/CPFs/CNPJs
fake) — nunca os extratos reais usados durante a investigação de
viabilidade (`_poc_templates/` na raiz do repo principal, que contêm dados
financeiros pessoais reais e não devem ir pro controle de versão).

## Estrutura

```
src/statement_processor/
  main.py          — FastAPI app, POST /jobs (contrato ADR-0034)
  auth.py          — guard de segredo compartilhado (mesmo padrão do
                      CronSecretGuard do backend)
  schemas.py       — Pydantic models = contrato de API, espelha a ADR
  config.py        — leitura de env
  job_runner.py    — orquestra parse -> pipeline -> callback (com
                      tratamento de erro por etapa)
  callback.py      — POST do resultado de volta pro backend
  pipeline.py       — roda as camadas de categorização em ordem
  parsers/
    ofx.py          — parser OFX (formato padrão, não depende de banco)
    csv_nubank.py   — adapter de CSV específico do Nubank
    registry.py     — escolhe o adapter certo por source + conteúdo
  rules/
    structural.py   — camada 1 (movimentação interna, fatura de cartão)
    keyword.py      — camada 2 (dicionário de comerciante)
    cnpj_cnae.py     — camada 3 (CNPJ -> CNAE via BrasilAPI -> categoria)
```

## Próximas fases (não implementadas aqui)

- **Fase 2**: cross-referência de membro do lar + memória por comerciante
  (tabela `merchant_category_memory`, gerenciada pelo backend — o processor
  só recebe a memória já resolvida via `context.merchantMemory` no request).
- **Fase 3**: OCR de PDF (Docling, modelo pré-baked na imagem Docker —
  nunca baixado em runtime, achado da PoC).
- **Fase 4**: LLM fallback (Groq) pra sobra residual.
- **Fase 5**: classificador de ML embutido (gatilho por volume de dado, não
  por data).
