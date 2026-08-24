---
name: statement-processor-docling-ocr-gotchas
description: Achados reais (instalação + docker build real) sobre Docling+EasyOCR no statement-processor — não documentados na ADR-0033/0034 original
metadata:
  type: project
---

Achados da Fase 3 (import de PDF via OCR), confirmados com instalação real
e `docker build` de ponta a ponta — não estavam na ADR-0033/0034 original,
que foi escrita a partir de investigação/documentação, sem shell real.

**`easyocr` não vem com o pacote base `docling`.** `docling` (2.121.0)
traz RapidOCR como dependência, mas `EasyOcrOptions()` falha em runtime
com `ImportError` sem o pacote `easyocr` explícito. Se o motor de OCR
escolhido for EasyOCR (decisão do ADR-0033, apesar do RapidOCR ser mais
leve), `easyocr` precisa estar em `pyproject.toml` como dependência
própria.

**`docling-tools models download` sem argumentos NÃO baixa o EasyOCR.**
O conjunto default (`docling/cli/models.py`, `_default_models`) é
`layout + tableformer + code_formula + picture_classifier + RAPIDOCR` —
nunca EasyOCR, mesmo que o pipeline use `EasyOcrOptions`. Combinado com
`DOCLING_ARTIFACTS_PATH` setado (que força `download_enabled=False` dentro
de `EasyOcrModel.__init__`, ver `easyocr_model.py`), isso faz o modelo
real NUNCA ser baixado nem em runtime — falha silenciosa só na primeira
página real processada em produção. Fix: listar os modelos explicitamente
no Dockerfile (`docling-tools models download layout tableformer easyocr
--output-dir ...`).

**`python:3.12-slim` não tem as libs gráficas que `opencv-python` precisa.**
`rapidocr` é dependência HARD do `docling-slim[standard]` (independente de
qual OCR o pipeline realmente usa), e puxa `opencv-python` (não
headless) — que falha com `ImportError: libxcb.so.1: cannot open shared
object file` numa imagem slim. `easyocr` também traz seu próprio
`opencv-python-headless`, mas o `opencv_python` (não-headless) do rapidocr
já basta pra quebrar o import de `cv2`. Fix: `apt-get install -y
--no-install-recommends libgl1 libglib2.0-0 libsm6 libxext6 libxrender1
libxcb1 libgomp1` antes do `pip install`.

**`BackgroundTasks` do FastAPI roda no mesmo event loop do uvicorn.**
Como o processor usa 1 worker uvicorn e `background_tasks.add_task(run_job,
request)`, uma chamada síncrona e pesada (OCR real, medido 6-8min pra um
PDF de 6 páginas) dentro de `run_job` bloqueia o processo inteiro — nenhum
outro job, nem `/health`, responde durante o OCR. csv/ofx nunca expôs isso
(parse em ms). Fix: `asyncio.to_thread(parse, ...)` em
`job_runner.py`.

**Timeout de PDF do ADR-0034 estava errado por má leitura da PoC.** Os
"14-40s" medidos na investigação eram POR PÁGINA, não por documento. Timeout
original de 5min; medido de verdade (Docling+EasyOCR, CPU, sem GPU) contra
um PDF de 6 páginas: ~6-8min ponta a ponta — e cachear o
`DocumentConverter` entre jobs (evitar recarregar o modelo a cada request)
NÃO reduz isso, porque quase todo o tempo é OCR por página, não
carregamento de modelo (esse é ~segundos). Corrigido pra 20min
(`sweep-statement-import-timeouts.use-case.ts`) — ver addendum na
[[recent-decisions]] / ADR-0034. Risco residual: extratos com muito mais
de 6 páginas ainda podem estourar; correção definitiva seria
heartbeat/progresso do processor, não tentado nesta fase.

**Imagem Docker final: 11.2GB.** `torch` (dependência do docling) puxa o
build CUDA completo do PyPI (`nvidia-cublas`, `nvidia-cudnn`, `triton`,
etc. — ~2.5GB só de pacotes NVIDIA) mesmo o serviço sendo CPU-only
(decisão explícita do ADR-0033). Não corrigido nesta sessão: trocar pra
`torch`/`torchvision` do índice CPU-only do PyTorch
(`download.pytorch.org/whl/cpu`) exigiria confirmar que a versão exata
pinada (2.13.0) existe nesse índice, e um build real pra validar — risco
de quebrar o build sem essa validação. Reportado como follow-up de
otimização, não bloqueante pro merge da Fase 3.
