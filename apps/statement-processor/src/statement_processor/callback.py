import logging

import httpx

from .config import settings
from .schemas import CallbackFailure, CallbackSuccess

logger = logging.getLogger("statement_processor.callback")


async def send_callback(
    callback_url: str, payload: CallbackSuccess | CallbackFailure
) -> None:
    body = payload.model_dump(by_alias=True)
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                callback_url,
                json=body,
                headers={"x-processor-secret": settings.processor_shared_secret},
                timeout=15.0,
            )
            res.raise_for_status()
    except httpx.HTTPError:
        # Callback falho não derruba o worker — o job de reconciliação do
        # cron tick do backend detecta job sem callback dentro do timeout
        # (ADR-0034) e permite retry manual. Logamos pra observabilidade,
        # não retentamos aqui pra não duplicar a responsabilidade de retry.
        logger.exception("Falha ao entregar callback pro backend: %s", callback_url)
