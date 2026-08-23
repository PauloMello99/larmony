# Mesmo padrão do CronSecretGuard do backend
# (apps/backend/src/common/guards/cron-secret.guard.ts): header fixo
# comparado a uma env, relação de confiança 1:1 entre dois serviços
# internos (ADR-0034 — decisão explícita de não usar HMAC aqui).

from fastapi import Header, HTTPException

from .config import settings


def require_processor_secret(x_processor_secret: str | None = Header(default=None)) -> None:
    if not x_processor_secret or x_processor_secret != settings.processor_shared_secret:
        raise HTTPException(status_code=401, detail="Invalid processor secret")
