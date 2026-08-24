import asyncio
import base64
import logging

from .callback import send_callback
from .parsers.registry import OcrError, ParseError, parse
from .pipeline import run_pipeline
from .schemas import CallbackFailure, CallbackSuccess, CreateJobRequest

logger = logging.getLogger("statement_processor.job_runner")

# Serializa OCR de PDF: asyncio.to_thread usa o executor default (até
# ~32 threads), então sem isso N PDFs enviados juntos rodariam OCR real
# em paralelo -- múltiplas threads chamando converter.convert() no mesmo
# DocumentConverter/EasyOCR Reader cacheado (ver _build_converter em
# parsers/pdf.py), algo que o Docling não documenta como thread-safe. Em
# CPU-only isso também não ganha throughput (núcleos limitados), só
# risco de corromper o modelo compartilhado. csv/ofx (rápido, sem modelo
# compartilhado) não passa por aqui.
_PDF_OCR_LOCK = asyncio.Semaphore(1)


async def run_job(request: CreateJobRequest) -> None:
    try:
        # PDF é binário -- decodificar como UTF-8 sempre lança
        # UnicodeDecodeError (bug real corrigido na Fase 3), fazendo todo
        # upload de PDF virar erroneamente INVALID_FILE antes de tentar
        # processar. csv/ofx continuam texto (utf-8), sem mudança.
        if request.source == "pdf":
            raw: str | bytes = base64.b64decode(request.file.data)
        else:
            raw = base64.b64decode(request.file.data).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        await send_callback(
            request.callback_url,
            CallbackFailure(
                jobId=request.job_id,
                errorCode="INVALID_FILE",
                errorMessage="Não foi possível decodificar o arquivo (base64/utf-8)",
            ),
        )
        return

    try:
        # asyncio.to_thread -- parse() é síncrono e, pra source=pdf, aciona
        # OCR real (Docling+EasyOCR, medido: minutos em CPU). BackgroundTasks
        # roda a coroutine no MESMO event loop do FastAPI (uvicorn com 1
        # worker); sem isso, uma única importação de PDF travaria o processo
        # inteiro (health check e qualquer outro job em paralelo) pela
        # duração completa do OCR -- quebra a premissa "sempre assíncrono"
        # do ADR-0034, que existia sem problema com CSV/OFX (parse em ms)
        # mas se torna crítica com PDF. _PDF_OCR_LOCK serializa só o
        # caminho pdf (ver comentário acima); csv/ofx nunca espera nele.
        if request.source == "pdf":
            async with _PDF_OCR_LOCK:
                transactions = await asyncio.to_thread(parse, request.source, raw)
        else:
            transactions = await asyncio.to_thread(parse, request.source, raw)
    except OcrError as exc:
        await send_callback(
            request.callback_url,
            CallbackFailure(
                jobId=request.job_id, errorCode="OCR_FAILED", errorMessage=str(exc)
            ),
        )
        return
    except ParseError as exc:
        await send_callback(
            request.callback_url,
            CallbackFailure(
                jobId=request.job_id, errorCode="PARSE_ERROR", errorMessage=str(exc)
            ),
        )
        return
    except Exception:
        logger.exception("Erro inesperado parseando job %s", request.job_id)
        await send_callback(
            request.callback_url,
            CallbackFailure(
                jobId=request.job_id,
                errorCode="INTERNAL_ERROR",
                errorMessage="Erro inesperado no parsing",
            ),
        )
        return

    try:
        candidates, stats = await run_pipeline(
            transactions, request.context, request.source
        )
    except Exception:
        logger.exception("Erro inesperado categorizando job %s", request.job_id)
        await send_callback(
            request.callback_url,
            CallbackFailure(
                jobId=request.job_id,
                errorCode="INTERNAL_ERROR",
                errorMessage="Erro inesperado na categorização",
            ),
        )
        return

    await send_callback(
        request.callback_url,
        CallbackSuccess(jobId=request.job_id, transactions=candidates, stats=stats),
    )
