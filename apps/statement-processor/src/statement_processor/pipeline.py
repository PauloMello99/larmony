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

from .config import settings
from .parsers import ParsedTransaction, deterministic_external_id
from .rules import RuleHit
from .rules.cnpj_cnae import match_cnpj_cnae
from .rules.household_member import match_household_member
from .rules.keyword import match_keyword
from .rules.llm_fallback import resolve_llm_fallback
from .rules.merchant_key import normalize_merchant
from .rules.structural import match_structural
from .schemas import (
    CandidateTransaction,
    JobContext,
    JobStats,
    MerchantMemoryEntry,
    Source,
)

# Orçamento de tempo da FASE de fallback LLM em si, medido a PARTIR do
# início desta fase (não do job inteiro, e não descontado do tempo já
# gasto nas camadas 1-4 antes dela) -- na prática soma com o que as
# camadas 1-4 (parsing + CNPJ→CNAE) já consumiram, então CSV_OFX_TIMEOUT
# (backend, sweep-statement-import-timeouts.use-case.ts) foi subido de
# 30s -> 60s na Fase 4 pra dar folga real a essa soma.
#
# Auditoria de tempo real (2026-08-24, chamadas reais a BrasilAPI e Groq,
# fora de carga concorrente -- ver [[domain-rules]]): CNPJ→CNAE (5 CNPJs
# distintos reais, sem cache) levou 31-157ms por chamada (~0,3s somado,
# bem abaixo do timeout de 10s por chamada); Groq (`reasoning_effort:
# "low"`) resolveu um batch de 20 itens em ~1,3s e um de 5 itens em
# ~0,8s -- ordens de grandeza abaixo dos 15s deste orçamento no caminho
# feliz (sem 429/retry). O risco real não é o cálculo em si ser lento --
# é o retry+backoff em cascata quando o rate limit da Groq (8000
# tokens/min por organização) é estourado por múltiplos jobs/households
# concorrentes competindo pelo `_GROQ_CALL_LOCK` (semáforo processo-
# inteiro) ao mesmo tempo; esse cenário não foi medido aqui (precisaria de
# carga concorrente real) e seria o próximo passo se a telemetria de
# TIMEOUT em produção justificar.
_LLM_BUDGET_SECONDS: dict[str, float] = {"csv": 15.0, "ofx": 15.0, "pdf": 60.0}


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
    transactions: list[ParsedTransaction], context: JobContext, source: Source
) -> tuple[list[CandidateTransaction], JobStats]:
    start = time.monotonic()
    async with httpx.AsyncClient() as client:
        candidates = [
            await categorize_one(client, txn, context) for txn in transactions
        ]

        resolved_by_rules = sum(1 for c in candidates if c.category_code is not None)

        # Índice POSICIONAL na lista `candidates` (nunca external_id, que
        # pode colidir) -- é a chave usada tanto pra montar o batch quanto
        # pra reaplicar os hits abaixo.
        unresolved_items = [
            (i, c.description, c.type)
            for i, c in enumerate(candidates)
            if c.resolved_by == "unresolved"
        ]
        if unresolved_items and settings.groq_api_key is not None:
            deadline = time.monotonic() + _LLM_BUDGET_SECONDS[source]
            llm_hits = await resolve_llm_fallback(
                client, unresolved_items, context.categories, deadline
            )
            for index, hit in llm_hits.items():
                # merchant_key do hit da LLM é sempre None por design --
                # nunca sobrescreve um merchant_key já computado por uma
                # camada anterior nesse mesmo candidate.
                candidates[index] = candidates[index].model_copy(
                    update={
                        "category_code": hit.category_code,
                        "category_confidence": hit.confidence,
                        "resolved_by": hit.resolved_by,
                    }
                )

    unresolved = sum(1 for c in candidates if c.resolved_by == "unresolved")
    resolved_by_llm = sum(1 for c in candidates if c.resolved_by == "llm_fallback")
    stats = JobStats(
        total=len(candidates),
        resolvedByRules=resolved_by_rules,
        resolvedByLlm=resolved_by_llm,
        unresolved=unresolved,
        processingMs=round((time.monotonic() - start) * 1000),
    )
    return candidates, stats
