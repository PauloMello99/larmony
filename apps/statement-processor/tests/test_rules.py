import httpx
import pytest

from statement_processor.rules.cnpj_cnae import extract_cnpj, match_cnpj_cnae
from statement_processor.rules.keyword import match_keyword
from statement_processor.rules.structural import match_structural


def test_structural_matches_shared_movement_as_unresolved_with_low_confidence():
    hit = match_structural(
        "Movimento automático para realização de transação compartilhada - X"
    )
    assert hit is not None
    assert hit.category_code is None
    assert hit.confidence == "low"
    assert hit.resolved_by == "structural"


def test_structural_matches_card_bill_as_unresolved_with_high_confidence():
    hit = match_structural("Pagamento de fatura")
    assert hit is not None
    assert hit.category_code is None
    assert hit.resolved_by == "structural"


def test_structural_does_not_match_regular_purchase():
    assert match_structural("Compra no débito - SUPERMERCADO EXEMPLO") is None


def test_keyword_matches_supermarket_as_alimentacao():
    hit = match_keyword("Compra no débito - SUPERMERCADO EXEMPLO LTDA")
    assert hit is not None
    assert hit.category_code == "ALI"


def test_keyword_regression_mercado_pago_is_not_alimentacao():
    # achado da PoC: "mercado" sozinho casava com "MERCADO PAGO" (instituição
    # de pagamento), classificando Pix pessoa-a-pessoa como Alimentação.
    hit = match_keyword(
        "Transferência recebida pelo Pix - FULANO DE TAL - MERCADO PAGO IP LTDA."
    )
    assert hit is None


def test_keyword_regression_lello_matches_with_word_boundary():
    # achado da PoC: "^lello$" com âncoras de string inteira nunca batia.
    hit = match_keyword("Pagamento de boleto efetuado - LELLO")
    assert hit is not None
    assert hit.category_code == "MOR"


def test_extract_cnpj_finds_formatted_cnpj():
    assert (
        extract_cnpj("Transferência - EMPRESA - 11.222.333/0001-44 - BCO TESTE")
        == "11222333000144"
    )
    assert extract_cnpj("Transferência recebida pelo Pix - JOAO DA SILVA") is None


@pytest.mark.asyncio
async def test_cnpj_cnae_maps_energy_company_to_moradia(httpx_mock):
    httpx_mock.add_response(
        url="https://brasilapi.com.br/api/cnpj/v1/11222333000144",
        json={
            "cnae_fiscal_descricao": "Distribuição de energia elétrica",
            "razao_social": "EMPRESA TESTE ENERGIA LTDA",
        },
    )
    async with httpx.AsyncClient() as client:
        hit = await match_cnpj_cnae(
            client,
            "Transferência enviada pelo Pix - EMPRESA TESTE ENERGIA LTDA - 11.222.333/0001-44 - BCO TESTE",
        )
    assert hit is not None
    assert hit.category_code == "MOR"
    assert hit.resolved_by == "cnpj_cnae"


@pytest.mark.asyncio
async def test_cnpj_cnae_returns_none_on_403(httpx_mock):
    # achado da PoC: BrasilAPI bloqueia (403) request sem User-Agent de
    # navegador — o client já manda o header, este teste garante que uma
    # falha de API (qualquer que seja a causa) degrada pra "sem match",
    # nunca derruba o job inteiro.
    httpx_mock.add_response(
        url="https://brasilapi.com.br/api/cnpj/v1/11222333000144", status_code=403
    )
    async with httpx.AsyncClient() as client:
        hit = await match_cnpj_cnae(
            client, "Transferência - EMPRESA - 11.222.333/0001-44 - BCO TESTE"
        )
    assert hit is None
