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

## Escopo atual (Fases 1–4)

Esqueleto do serviço + parsing CSV (adapter Nubank)/OFX (padrão)/PDF (OCR
via Docling, motor EasyOCR, parser genérico por heurística de cabeçalho de
coluna — sem adapter por banco) + camadas 1–4 de categorização (estrutural,
keyword, CNPJ→CNAE via BrasilAPI, cross-referência de membro do lar da Fase
2) + fallback LLM via Groq (Fase 4) pra sobra residual. Sem ML (Fase 5).

Import de PDF é CPU-only e self-hospedado (sem serviço externo de OCR). O
modelo do EasyOCR deve estar pré-baixado no build da imagem Docker (nunca
em runtime — cold-start repetiria o download a cada instância fria); a env
`DOCLING_ARTIFACTS_PATH` aponta pro diretório onde o modelo foi baixado
(setada no `Dockerfile`). Em dev local sem esse pre-cache, o Docling cai no
comportamento default (baixa on-demand, mais lento só na primeira chamada
do processo).

OCR real é caro (medido: ~6-8min pra um PDF de 6 páginas, CPU-only) e o
`DocumentConverter`/EasyOCR Reader é cacheado por processo (evita
recarregar o modelo a cada job) — por isso jobs de PDF são serializados
(`_PDF_OCR_LOCK` em `job_runner.py`): rodar OCR concorrente contra o mesmo
modelo cacheado não é documentado como seguro pelo Docling, e em CPU-only
não ganharia throughput mesmo se fosse. csv/ofx (rápido, sem modelo
compartilhado) não passa por esse lock.

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
pytest -q          # suíte rápida, pula o teste de OCR real (marker `slow`)
pytest -m slow -q  # só o teste de OCR real (Docling+EasyOCR), 1-4min
```

O teste de OCR real (`tests/test_pdf_ocr_slow.py`, marcado `@pytest.mark.slow`)
processa o PDF escaneado de verdade (14-40s/página) — isolado via
`addopts = "-m 'not slow'"` em `pyproject.toml` pra não pesar o `pytest -q`
padrão.

Fixtures em `tests/fixtures/` são **dados sintéticos** (nomes/CPFs/CNPJs
fake) — nunca os extratos reais usados durante a investigação de
viabilidade (`_poc_templates/` na raiz do repo principal, que contêm dados
financeiros pessoais reais e não devem ir pro controle de versão).

`pdf_bank_statement_digital.pdf`, `pdf_bank_statement_scanned.pdf` e
`pdf_bank_statement_ground_truth.json` (Fase 3, OCR) vêm do dataset público
[AgamiAI/Indian-Bank-Statements](https://huggingface.co/datasets/AgamiAI/Indian-Bank-Statements)
(Apache 2.0, "Fully synthetic — no real customer information") — mesmo
extrato sintético em duas variantes (PDF com camada de texto e PDF
escaneado, exigindo OCR de verdade). O ground truth foi truncado às 20
primeiras transações do arquivo original (150+); suficiente para validar a
heurística de parsing sem inflar o fixture.

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
    pdf.py          — parser de PDF via OCR (Docling/EasyOCR), heurística
                      genérica de cabeçalho de coluna (Fase 3)
    registry.py     — escolhe o adapter certo por source + conteúdo
  rules/
    structural.py   — camada 1 (movimentação interna, fatura de cartão)
    household_member.py — camada 3 (cross-referência de membro do lar;
                       camada 2, memória de comerciante, resolvida inline em
                       pipeline.py)
    keyword.py      — camada 4 (dicionário de comerciante)
    cnpj_cnae.py     — camada 5 (CNPJ -> CNAE via BrasilAPI -> categoria)
    llm_fallback.py  — camada 6 (Groq, Fase 4), sobra residual das camadas
                       1-5
```

## Próximas fases (não implementadas aqui)

- **Fase 5**: classificador de ML embutido (gatilho por volume de dado, não
  por data).
