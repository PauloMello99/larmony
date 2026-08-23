# Orquestra as camadas 1-4 (Fase 2 — ML/LLM entram nas fases seguintes do
# plano, docs/product/features/16-import-extrato.md). Ordem importa:
# estrutural PRIMEIRO — achado da PoC mostrou que rodar keyword antes de
# estrutural deixa nome de comerciante incidental (dentro de um memo de
# movimentação interna) vencer a checagem de "isso nem é uma compra".
# Memória de comerciante e membro do lar rodam entre estrutural e keyword —
# comerciante já corrigido pelo usuário, ou reconhecido como pessoa
# conhecida, devem vencer antes da keyword genérica tentar adivinhar.

import time

import httpx

from .parsers import ParsedTransaction, deterministic_external_id
from .rules import RuleHit
from .rules.cnpj_cnae import match_cnpj_cnae
from .rules.household_member import match_household_member
from .rules.keyword import match_keyword
from .rules.merchant_key import normalize_merchant
from .rules.structural import match_structural
from .schemas import CandidateTransaction, JobContext, JobStats, MerchantMemoryEntry


def match_merchant_memory(
    merchant_key: str, memory: list[MerchantMemoryEntry]
) -> RuleHit | None:
    if not merchant_key:
        return None
    for entry in memory:
        if entry.merchant_key == merchant_key:
            return RuleHit(
                category_code=entry.category_code,
                confidence="high",
                resolved_by="merchant_memory",
                merchant_key=merchant_key,
            )
    return None


async def categorize_one(
    client: httpx.AsyncClient, txn: ParsedTransaction, context: JobContext
) -> CandidateTransaction:
    hit = match_structural(txn.description)

    merchant_key: str | None = None
    if hit is None:
        merchant_key = normalize_merchant(txn.description)
        hit = match_merchant_memory(merchant_key, context.merchant_memory)
    if hit is None:
        hit = match_household_member(merchant_key, context.household_members)
    if hit is None:
        hit = match_keyword(txn.description)
    if hit is None:
        hit = await match_cnpj_cnae(client, txn.description)

    external_id = txn.external_id or deterministic_external_id(
        txn.date, txn.amount_cents, txn.description
    )

    # ADR-0034: amountCents cruza a fronteira sempre positivo — a direção
    # vive só em `type`, nunca duplicada no sinal (achado da revisão: o
    # backend soma amount_cents por tipo pra orçamento; um valor negativo
    # aqui subtrairia gasto em vez de somar, silenciosamente).
    txn_type = "income" if txn.amount_cents > 0 else "expense"
    amount_cents = abs(txn.amount_cents)

    if hit is None:
        return CandidateTransaction(
            externalId=external_id,
            date=txn.date,
            amountCents=amount_cents,
            type=txn_type,
            description=txn.description[:200],
            categoryCode=None,
            categoryConfidence=None,
            resolvedBy="unresolved",
            merchantKey=merchant_key,
        )

    return CandidateTransaction(
        externalId=external_id,
        date=txn.date,
        amountCents=amount_cents,
        type=txn_type,
        description=txn.description[:200],
        categoryCode=hit.category_code,
        categoryConfidence=hit.confidence,
        resolvedBy=hit.resolved_by,
        merchantKey=hit.merchant_key or merchant_key,
    )


async def run_pipeline(
    transactions: list[ParsedTransaction], context: JobContext
) -> tuple[list[CandidateTransaction], JobStats]:
    start = time.monotonic()
    async with httpx.AsyncClient() as client:
        candidates = [
            await categorize_one(client, txn, context) for txn in transactions
        ]

    resolved_by_rules = sum(1 for c in candidates if c.category_code is not None)
    unresolved = sum(1 for c in candidates if c.resolved_by == "unresolved")
    stats = JobStats(
        total=len(candidates),
        resolvedByRules=resolved_by_rules,
        resolvedByLlm=0,  # LLM fallback entra na Fase 4
        unresolved=unresolved,
        processingMs=round((time.monotonic() - start) * 1000),
    )
    return candidates, stats
