# Contrato de API — espelha ADR-0034 (.memory/adr/0034-contrato-api-backend-statement-processor.md).
# Qualquer mudança de campo aqui exige atualizar a ADR e o cliente HTTP do
# backend (porta IStatementProcessor) junto — não é um detalhe interno livre.

from typing import Literal

from pydantic import BaseModel, Field

Source = Literal["csv", "ofx", "pdf"]
TransactionType = Literal["income", "expense"]
CategoryConfidence = Literal["high", "medium", "low"]
ResolvedBy = Literal[
    "structural",
    "household_member",
    "keyword",
    "cnpj_cnae",
    "merchant_memory",
    "ml_classifier",
    "llm_fallback",
    "unresolved",
]
JobStatus = Literal["accepted", "completed", "failed"]
ErrorCode = Literal[
    "INVALID_FILE",
    "UNSUPPORTED_SOURCE",
    "OCR_FAILED",
    "PARSE_ERROR",
    "TIMEOUT",
    "INTERNAL_ERROR",
]


class CategoryRef(BaseModel):
    # "code" ausente = categoria customizada do household — fora do
    # vocabulário fechado que o processor sabe atribuir (ADR-0034).
    code: str | None = None
    id: str
    name: str
    type: TransactionType


class MerchantMemoryEntry(BaseModel):
    merchant_key: str = Field(alias="merchantKey")
    category_code: str = Field(alias="categoryCode")

    model_config = {"populate_by_name": True}


class HouseholdMember(BaseModel):
    name: str
    user_id: str = Field(alias="userId")

    model_config = {"populate_by_name": True}


class JobContext(BaseModel):
    categories: list[CategoryRef] = Field(default_factory=list)
    merchant_memory: list[MerchantMemoryEntry] = Field(
        default_factory=list, alias="merchantMemory"
    )
    household_members: list[HouseholdMember] = Field(
        default_factory=list, alias="householdMembers"
    )

    model_config = {"populate_by_name": True}


class FilePayload(BaseModel):
    encoding: Literal["base64"]
    data: str


class CreateJobRequest(BaseModel):
    job_id: str = Field(alias="jobId")
    household_id: str = Field(alias="householdId")
    source: Source
    file: FilePayload
    callback_url: str = Field(alias="callbackUrl")
    context: JobContext

    model_config = {"populate_by_name": True}


class CreateJobAccepted(BaseModel):
    job_id: str = Field(alias="jobId", serialization_alias="jobId")
    status: Literal["accepted"] = "accepted"

    model_config = {"populate_by_name": True}


class CandidateTransaction(BaseModel):
    external_id: str = Field(alias="externalId", serialization_alias="externalId")
    date: str  # ISO yyyy-mm-dd
    amount_cents: int = Field(alias="amountCents", serialization_alias="amountCents")
    type: TransactionType
    description: str
    category_code: str | None = Field(
        default=None, alias="categoryCode", serialization_alias="categoryCode"
    )
    category_confidence: CategoryConfidence | None = Field(
        default=None,
        alias="categoryConfidence",
        serialization_alias="categoryConfidence",
    )
    resolved_by: ResolvedBy = Field(
        alias="resolvedBy", serialization_alias="resolvedBy"
    )
    merchant_key: str | None = Field(
        default=None, alias="merchantKey", serialization_alias="merchantKey"
    )

    model_config = {"populate_by_name": True}


class JobStats(BaseModel):
    total: int
    resolved_by_rules: int = Field(alias="resolvedByRules", serialization_alias="resolvedByRules")
    resolved_by_llm: int = Field(alias="resolvedByLlm", serialization_alias="resolvedByLlm")
    unresolved: int
    processing_ms: int = Field(alias="processingMs", serialization_alias="processingMs")

    model_config = {"populate_by_name": True}


class CallbackSuccess(BaseModel):
    job_id: str = Field(alias="jobId", serialization_alias="jobId")
    status: Literal["completed"] = "completed"
    transactions: list[CandidateTransaction]
    stats: JobStats

    model_config = {"populate_by_name": True}


class CallbackFailure(BaseModel):
    job_id: str = Field(alias="jobId", serialization_alias="jobId")
    status: Literal["failed"] = "failed"
    error_code: ErrorCode = Field(
        alias="errorCode", serialization_alias="errorCode"
    )
    error_message: str = Field(
        alias="errorMessage", serialization_alias="errorMessage"
    )

    model_config = {"populate_by_name": True}


class ErrorResponse(BaseModel):
    error_code: ErrorCode = Field(serialization_alias="errorCode")
    error_message: str = Field(serialization_alias="errorMessage")
