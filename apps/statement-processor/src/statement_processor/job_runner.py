import base64
import logging

from .callback import send_callback
from .parsers.registry import ParseError, parse
from .pipeline import run_pipeline
from .schemas import CallbackFailure, CallbackSuccess, CreateJobRequest

logger = logging.getLogger("statement_processor.job_runner")


async def run_job(request: CreateJobRequest) -> None:
    try:
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
        transactions = parse(request.source, raw)
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
        candidates, stats = await run_pipeline(transactions, request.context)
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
