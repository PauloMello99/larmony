# Ponto de entrada FastAPI. Contrato completo em
# .memory/adr/0034-contrato-api-backend-statement-processor.md — qualquer
# mudança de request/response aqui exige atualizar a ADR e a porta
# IStatementProcessor no backend junto.

from fastapi import BackgroundTasks, Depends, FastAPI

from .auth import require_processor_secret
from .job_runner import run_job
from .schemas import CreateJobAccepted, CreateJobRequest

app = FastAPI(title="Larmony statement-processor", version="0.1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/jobs",
    status_code=202,
    response_model=CreateJobAccepted,
    dependencies=[Depends(require_processor_secret)],
)
async def create_job(
    request: CreateJobRequest, background_tasks: BackgroundTasks
) -> CreateJobAccepted:
    # Sempre assíncrono — nenhum caminho síncrono mesmo pra CSV/OFX
    # pequeno (decisão explícita do ADR-0034: um único contrato, sem
    # duplicar cliente HTTP no backend pra um ganho de latência marginal).
    background_tasks.add_task(run_job, request)
    return CreateJobAccepted(jobId=request.job_id)
