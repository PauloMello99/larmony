import httpx
import pytest

from statement_processor.parsers import ParsedTransaction
from statement_processor.pipeline import categorize_one
from statement_processor.schemas import HouseholdMember, JobContext, MerchantMemoryEntry


def _txn(description: str, amount_cents: int = -1000) -> ParsedTransaction:
    return ParsedTransaction(
        external_id="fx-1", date="2026-03-01", amount_cents=amount_cents, description=description
    )


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
