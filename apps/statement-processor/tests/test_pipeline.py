import json

import httpx
import pytest

from statement_processor.config import settings
from statement_processor.parsers import ParsedTransaction
from statement_processor.pipeline import categorize_one, run_pipeline
from statement_processor.rules import llm_fallback
from statement_processor.rules.llm_fallback import _GROQ_CALL_LOCK, _GROQ_URL, _MAX_RETRIES
from statement_processor.schemas import (
    CategoryRef,
    HouseholdMember,
    JobContext,
    MerchantMemoryEntry,
)


def _txn(description: str, amount_cents: int = -1000) -> ParsedTransaction:
    return ParsedTransaction(
        external_id="fx-1", date="2026-03-01", amount_cents=amount_cents, description=description
    )


# Descrição de pix pra pessoa física genérica, sem CNPJ, sem keyword de
# comerciante e sem membro do lar cadastrado -- fica "unresolved" nas
# camadas 1-4, exatamente o cenário que a camada 6 (LLM) deve tentar cobrir.
def _unresolved_txn(amount_cents: int = -5000) -> ParsedTransaction:
    return _txn("Transferência recebida pelo Pix - PESSOA DESCONHECIDA", amount_cents)


def _groq_envelope(items: list[dict]) -> dict:
    return {"choices": [{"message": {"content": json.dumps({"items": items})}}]}


@pytest.fixture(autouse=True)
def _reset_groq_lock():
    # Mesmo padrão de tests/test_llm_fallback.py -- _GROQ_CALL_LOCK é global
    # de processo; um teste que falhe segurando o lock travaria qualquer
    # teste seguinte que dependa dele.
    _GROQ_CALL_LOCK._value = 1
    yield
    _GROQ_CALL_LOCK._value = 1


def _set_groq_key(monkeypatch: pytest.MonkeyPatch, value: str | None) -> None:
    monkeypatch.setattr(type(settings), "groq_api_key", property(lambda self: value))


@pytest.mark.asyncio
async def test_merchant_memory_resolves_before_keyword():
    context = JobContext(
        merchantMemory=[
            MerchantMemoryEntry(merchantKey="SUPERMERCADO EXEMPLO LTDA", categoryCode="OUT")
        ],
        householdMembers=[],
    )
    async with httpx.AsyncClient() as client:
        candidate = await categorize_one(
            client, _txn("Compra no débito - SUPERMERCADO EXEMPLO LTDA"), context
        )
    # memória do lar venceria a keyword genérica (ALI) se não tivesse
    # prioridade — comerciante já corrigido pelo usuário deve vencer.
    assert candidate.category_code == "OUT"
    assert candidate.resolved_by == "merchant_memory"
    assert candidate.merchant_key == "SUPERMERCADO EXEMPLO LTDA"


@pytest.mark.asyncio
async def test_household_member_resolves_before_keyword():
    context = JobContext(
        merchantMemory=[],
        householdMembers=[HouseholdMember(name="Joao Da Silva", userId="user-1")],
    )
    async with httpx.AsyncClient() as client:
        candidate = await categorize_one(
            client, _txn("Transferência recebida pelo Pix - JOAO DA SILVA"), context
        )
    assert candidate.category_code is None
    assert candidate.resolved_by == "household_member"
    assert candidate.merchant_key == "JOAO DA SILVA"


@pytest.mark.asyncio
async def test_keyword_still_resolves_when_no_memory_or_member_match():
    context = JobContext(merchantMemory=[], householdMembers=[])
    async with httpx.AsyncClient() as client:
        candidate = await categorize_one(
            client, _txn("Compra no débito - SUPERMERCADO EXEMPLO LTDA"), context
        )
    assert candidate.category_code == "ALI"
    assert candidate.resolved_by == "keyword"
    # merchant_key computado mesmo quando resolvido por outra camada —
    # necessário pro fluxo de confirmação gravar em merchant_category_memory.
    assert candidate.merchant_key == "SUPERMERCADO EXEMPLO LTDA"


@pytest.mark.asyncio
async def test_empty_merchant_key_does_not_false_match_member_or_memory(httpx_mock):
    # memo que começa direto no CNPJ deixa merchant_key vazio ("") — sem a
    # guarda em match_household_member/match_merchant_memory isso casaria
    # com qualquer membro/entrada de memória por acidente.
    httpx_mock.add_response(
        url="https://brasilapi.com.br/api/cnpj/v1/11222333000144", status_code=403
    )
    context = JobContext(
        merchantMemory=[
            MerchantMemoryEntry(merchantKey="", categoryCode="OUT")
        ],
        householdMembers=[HouseholdMember(name="Joao Da Silva", userId="user-1")],
    )
    async with httpx.AsyncClient() as client:
        candidate = await categorize_one(
            client, _txn("11.222.333/0001-44 - BCO TESTE"), context
        )
    assert candidate.merchant_key == ""
    assert candidate.resolved_by not in ("household_member", "merchant_memory")


@pytest.mark.asyncio
async def test_amount_cents_always_positive_direction_only_in_type():
    # ADR-0034: amountCents cruza a fronteira sempre positivo — achado da
    # revisão final, o backend soma amount_cents por tipo pro cálculo de
    # orçamento; um valor negativo aqui inverteria o gasto silenciosamente.
    context = JobContext(merchantMemory=[], householdMembers=[])
    async with httpx.AsyncClient() as client:
        expense = await categorize_one(client, _txn("Qualquer coisa", amount_cents=-8990), context)
        income = await categorize_one(client, _txn("Qualquer coisa", amount_cents=250000), context)
    assert expense.amount_cents == 8990
    assert expense.type == "expense"
    assert income.amount_cents == 250000
    assert income.type == "income"


@pytest.mark.asyncio
async def test_structural_wins_over_household_member_and_memory():
    context = JobContext(
        merchantMemory=[
            MerchantMemoryEntry(merchantKey="FULANO DE TAL", categoryCode="OUT")
        ],
        householdMembers=[HouseholdMember(name="Fulano De Tal", userId="user-1")],
    )
    async with httpx.AsyncClient() as client:
        candidate = await categorize_one(
            client,
            _txn(
                "Movimento automático para realização de transação compartilhada - FULANO DE TAL"
            ),
            context,
        )
    assert candidate.resolved_by == "structural"
    assert candidate.category_code is None


@pytest.mark.asyncio
async def test_run_pipeline_resolves_residual_via_groq_fallback(monkeypatch, httpx_mock):
    _set_groq_key(monkeypatch, "test-groq-key")
    context = JobContext(
        categories=[CategoryRef(code="ALI", id="cat-ali", name="Alimentação", type="expense")],
        merchantMemory=[],
        householdMembers=[],
    )
    transactions = [_unresolved_txn()]
    httpx_mock.add_response(
        url=_GROQ_URL,
        json=_groq_envelope([{"index": 0, "categoryCode": "ALI"}]),
    )

    candidates, stats = await run_pipeline(transactions, context, "csv")

    assert candidates[0].resolved_by == "llm_fallback"
    assert candidates[0].category_confidence == "low"
    assert candidates[0].category_code == "ALI"
    assert stats.resolved_by_llm >= 1
    assert stats.unresolved == 0


@pytest.mark.asyncio
async def test_run_pipeline_skips_groq_entirely_without_api_key(monkeypatch, httpx_mock):
    _set_groq_key(monkeypatch, None)
    context = JobContext(
        categories=[CategoryRef(code="ALI", id="cat-ali", name="Alimentação", type="expense")],
        merchantMemory=[],
        householdMembers=[],
    )
    transactions = [_unresolved_txn()]

    candidates, stats = await run_pipeline(transactions, context, "csv")

    assert httpx_mock.get_requests(url=_GROQ_URL) == []
    assert candidates[0].resolved_by == "unresolved"
    assert stats.resolved_by_llm == 0


@pytest.mark.asyncio
async def test_run_pipeline_survives_groq_retry_exhaustion(monkeypatch, httpx_mock):
    _set_groq_key(monkeypatch, "test-groq-key")

    async def _fake_sleep(seconds: float) -> None:
        return None

    monkeypatch.setattr(llm_fallback.asyncio, "sleep", _fake_sleep)

    for _ in range(_MAX_RETRIES):
        httpx_mock.add_response(url=_GROQ_URL, status_code=429)

    context = JobContext(
        categories=[CategoryRef(code="ALI", id="cat-ali", name="Alimentação", type="expense")],
        merchantMemory=[],
        householdMembers=[],
    )
    transactions = [_unresolved_txn()]

    candidates, stats = await run_pipeline(transactions, context, "csv")

    assert candidates[0].resolved_by == "unresolved"
    assert stats.resolved_by_llm == 0
    assert len(httpx_mock.get_requests(url=_GROQ_URL)) == _MAX_RETRIES


@pytest.mark.asyncio
async def test_run_pipeline_resolved_by_rules_stable_regardless_of_llm(
    monkeypatch, httpx_mock
):
    # stats.resolved_by_rules é um snapshot tirado ANTES da fase LLM em
    # pipeline.py -- nunca deveria variar por causa da camada 6 rodar ou
    # não. Roda o MESMO conjunto de transações duas vezes: uma com a Groq
    # resolvendo tudo, outra com a chave ausente.
    context = JobContext(
        categories=[CategoryRef(code="ALI", id="cat-ali", name="Alimentação", type="expense")],
        merchantMemory=[],
        householdMembers=[],
    )
    transactions = [
        _txn("Compra no débito - SUPERMERCADO EXEMPLO LTDA", amount_cents=-8990),
        _unresolved_txn(),
    ]

    _set_groq_key(monkeypatch, "test-groq-key")
    httpx_mock.add_response(
        url=_GROQ_URL,
        json=_groq_envelope([{"index": 0, "categoryCode": "ALI"}]),
    )
    _, stats_with_llm = await run_pipeline(transactions, context, "csv")

    _set_groq_key(monkeypatch, None)
    _, stats_without_llm = await run_pipeline(transactions, context, "csv")

    assert stats_with_llm.resolved_by_rules == stats_without_llm.resolved_by_rules
