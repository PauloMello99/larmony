import asyncio
import json
import math
import time

import httpx
import pytest

from statement_processor.config import settings
from statement_processor.rules import RuleHit, llm_fallback
from statement_processor.rules.llm_fallback import (
    _BATCH_SIZE,
    _GROQ_CALL_LOCK,
    _GROQ_URL,
    _MAX_RETRIES,
    _call_groq_with_retry,
    resolve_llm_fallback,
)
from statement_processor.schemas import CategoryRef


@pytest.fixture(autouse=True)
def _reset_groq_lock():
    # _GROQ_CALL_LOCK é global de processo (serializa todas as chamadas
    # Groq) — se um teste falhar no meio segurando o lock, todo teste
    # seguinte que dependa dele trava. Reseta pra livre antes/depois de
    # cada teste, mesmo padrão do _reset_cnae_cache em conftest.py.
    llm_fallback._GROQ_CALL_LOCK._value = 1
    yield
    llm_fallback._GROQ_CALL_LOCK._value = 1


def _set_groq_key(monkeypatch: pytest.MonkeyPatch, value: str | None) -> None:
    # groq_api_key é uma @property em Settings (sem setter) -- não dá pra
    # monkeypatch.setattr direto na instância `settings`. Patcheia a
    # property na classe, que o monkeypatch desfaz sozinho no teardown.
    monkeypatch.setattr(type(settings), "groq_api_key", property(lambda self: value))


def _category(code: str | None, txn_type: str, category_id: str = "c1") -> CategoryRef:
    return CategoryRef(id=category_id, name="Categoria", type=txn_type, code=code)


def _groq_envelope(items: list[dict]) -> dict:
    content = json.dumps({"items": items})
    return {"choices": [{"message": {"content": content}}]}


def _items_sent(request: httpx.Request) -> list[dict]:
    body = json.loads(request.content)
    user_content = body["messages"][1]["content"]
    items_json = user_content.split("Itens:\n", 1)[1]
    return json.loads(items_json)


@pytest.mark.asyncio
async def test_single_batch_success_resolves_all_indices(monkeypatch, httpx_mock):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense"), _category("SAL", "income", "c2")]
    unresolved = [
        (0, "PADARIA CENTRAL", "expense"),
        (1, "SALARIO EMPRESA X", "income"),
    ]
    httpx_mock.add_response(
        url=_GROQ_URL,
        json=_groq_envelope(
            [
                {"index": 0, "categoryCode": "ALI"},
                {"index": 1, "categoryCode": "SAL"},
            ]
        ),
    )

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result[0] == RuleHit(
        category_code="ALI", confidence="low", resolved_by="llm_fallback"
    )
    assert result[1] == RuleHit(
        category_code="SAL", confidence="low", resolved_by="llm_fallback"
    )
    assert len(httpx_mock.get_requests(url=_GROQ_URL)) == 1


@pytest.mark.asyncio
async def test_batches_45_unique_items_into_three_requests_of_20_20_5(
    monkeypatch, httpx_mock
):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(i, f"DESCRICAO {i}", "expense") for i in range(45)]

    def _echo_all_as_ali(request: httpx.Request) -> httpx.Response:
        items = _items_sent(request)
        resolved = [{"index": item["index"], "categoryCode": "ALI"} for item in items]
        return httpx.Response(200, json=_groq_envelope(resolved))

    httpx_mock.add_callback(_echo_all_as_ali, url=_GROQ_URL, is_reusable=True)

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert len(result) == 45
    requests = httpx_mock.get_requests(url=_GROQ_URL)
    assert len(requests) == math.ceil(45 / _BATCH_SIZE)
    sizes = [len(_items_sent(request)) for request in requests]
    assert sizes == [20, 20, 5]


@pytest.mark.asyncio
async def test_retry_after_429_then_success_respects_retry_after_header(
    monkeypatch, httpx_mock
):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]

    sleep_calls: list[float] = []

    async def _fake_sleep(seconds: float) -> None:
        sleep_calls.append(seconds)

    monkeypatch.setattr(llm_fallback.asyncio, "sleep", _fake_sleep)

    httpx_mock.add_response(
        url=_GROQ_URL, status_code=429, headers={"Retry-After": "3"}
    )
    httpx_mock.add_response(
        url=_GROQ_URL,
        json=_groq_envelope([{"index": 0, "categoryCode": "ALI"}]),
    )

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result[0].category_code == "ALI"
    assert result[0].confidence == "low"
    assert result[0].resolved_by == "llm_fallback"
    assert len(httpx_mock.get_requests(url=_GROQ_URL)) == 2
    # o backoff deve ter sido sobrescrito pelo valor do header Retry-After,
    # não pelo cálculo exponencial padrão.
    assert sleep_calls == [3.0]


@pytest.mark.asyncio
async def test_retry_after_larger_than_remaining_deadline_is_clamped(
    monkeypatch, httpx_mock
):
    # Bug real corrigido: o sleep de backoff (inclusive quando sobrescrito
    # por um Retry-After grande) dormia o valor cheio mesmo quando isso
    # ultrapassava o deadline -- segurando o _GROQ_CALL_LOCK (semáforo
    # processo-inteiro) muito além do orçamento por source. Agora o sleep é
    # clampado ao tempo restante até o deadline.
    _set_groq_key(monkeypatch, "test-groq-key")

    sleep_calls: list[float] = []
    real_sleep = asyncio.sleep

    async def _fake_sleep(seconds: float) -> None:
        # dorme de verdade o valor (já clampado, ~0.2s no máx) pra que
        # time.monotonic() avance de fato até o deadline -- se só
        # registrasse a chamada sem dormir, o relógio nunca chegaria no
        # deadline e o teste não provaria o clamp (o código tentaria de
        # novo em vez de desistir no topo do loop).
        sleep_calls.append(seconds)
        await real_sleep(seconds)

    monkeypatch.setattr(llm_fallback.asyncio, "sleep", _fake_sleep)

    httpx_mock.add_response(
        url=_GROQ_URL, status_code=429, headers={"Retry-After": "60"}
    )

    deadline = time.monotonic() + 0.2
    async with httpx.AsyncClient() as client:
        result = await _call_groq_with_retry(
            client,
            [(0, "PADARIA CENTRAL", "expense")],
            {"expense": ["ALI"]},
            deadline,
        )

    assert result is None
    assert sleep_calls
    # clampado ao tempo restante (~0.2s) -- nunca aos 60s cheios do header.
    assert sleep_calls[0] < 1.0
    # só 1 requisição: a 2ª tentativa nunca aconteceu porque o deadline já
    # tinha estourado no topo do loop, antes de tentar de novo.
    assert len(httpx_mock.get_requests(url=_GROQ_URL)) == 1


@pytest.mark.asyncio
async def test_retry_exhaustion_leaves_batch_unresolved_without_raising(
    monkeypatch, httpx_mock
):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]

    async def _fake_sleep(seconds: float) -> None:
        return None

    monkeypatch.setattr(llm_fallback.asyncio, "sleep", _fake_sleep)

    for _ in range(_MAX_RETRIES):
        httpx_mock.add_response(url=_GROQ_URL, status_code=503)

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result == {}
    assert len(httpx_mock.get_requests(url=_GROQ_URL)) == _MAX_RETRIES


@pytest.mark.asyncio
async def test_deadline_already_past_makes_zero_requests(monkeypatch, httpx_mock):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]

    deadline = time.monotonic() - 1
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result == {}
    assert httpx_mock.get_requests() == []


@pytest.mark.asyncio
async def test_deadline_expires_while_waiting_for_the_process_wide_lock(
    monkeypatch, httpx_mock
):
    # Bug real corrigido: antes, `async with _GROQ_CALL_LOCK` esperava o
    # semáforo sem limite -- um job ficava preso atrás de outro job que já
    # estava rodando seu retry+backoff completo, e o orçamento de tempo por
    # source virava decorativo. O fix limita a espera ao tempo restante até
    # o deadline via asyncio.wait_for. Sem o fix, este teste trava até o
    # timeout do wait_for abaixo estourar (falhando o teste).
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]

    async with httpx.AsyncClient() as client:
        await _GROQ_CALL_LOCK.acquire()
        try:
            deadline = time.monotonic() + 0.05
            task = asyncio.create_task(
                resolve_llm_fallback(client, unresolved, categories, deadline)
            )
            # margem generosa (10x o deadline): com o fix, a função desiste
            # de esperar o lock assim que o deadline vence -- não precisa do
            # lock ser liberado pra retornar.
            result = await asyncio.wait_for(task, timeout=0.5)
        finally:
            _GROQ_CALL_LOCK.release()

    assert result == {}
    # nenhuma chamada HTTP deveria ter sido feita: o lock nunca foi
    # adquirido pela chamada da Groq antes do deadline vencer.
    assert httpx_mock.get_requests() == []


@pytest.mark.asyncio
async def test_hallucinated_or_wrong_type_category_code_discarded(
    monkeypatch, httpx_mock
):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense"), _category("SAL", "income", "c2")]
    unresolved = [
        (0, "ITEM COM CODIGO DE OUTRO TYPE", "expense"),
        (1, "ITEM COM CODIGO INEXISTENTE", "expense"),
    ]
    httpx_mock.add_response(
        url=_GROQ_URL,
        json=_groq_envelope(
            [
                # SAL existe no vocabulário, mas só para "income" -- o item é
                # "expense".
                {"index": 0, "categoryCode": "SAL"},
                # código que não existe em nenhum type.
                {"index": 1, "categoryCode": "ZZZ"},
            ]
        ),
    )

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result == {}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "content",
    [
        pytest.param("isto não é JSON válido", id="content_not_json"),
        pytest.param(json.dumps({"items": {"0": "ALI"}}), id="items_not_a_list"),
        pytest.param(json.dumps({"nope": []}), id="items_key_missing"),
    ],
)
async def test_malformed_groq_response_does_not_raise(
    monkeypatch, httpx_mock, content
):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]

    httpx_mock.add_response(
        url=_GROQ_URL,
        json={"choices": [{"message": {"content": content}}]},
    )

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result == {}


@pytest.mark.asyncio
async def test_malformed_groq_response_empty_choices_does_not_raise(
    monkeypatch, httpx_mock
):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]

    httpx_mock.add_response(url=_GROQ_URL, json={"choices": []})

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result == {}


@pytest.mark.asyncio
async def test_duplicate_descriptions_dedup_single_request_all_indices_resolved(
    monkeypatch, httpx_mock
):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [
        (0, "PIX FULANO DE TAL", "expense"),
        (1, "PIX FULANO DE TAL", "expense"),
        (2, "PIX FULANO DE TAL", "expense"),
    ]

    def _assert_single_item_then_resolve(request: httpx.Request) -> httpx.Response:
        items = _items_sent(request)
        assert len(items) == 1, "descrições duplicadas deveriam colapsar em 1 item"
        return httpx.Response(
            200, json=_groq_envelope([{"index": 0, "categoryCode": "ALI"}])
        )

    httpx_mock.add_callback(_assert_single_item_then_resolve, url=_GROQ_URL)

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    expected_hit = RuleHit(category_code="ALI", confidence="low", resolved_by="llm_fallback")
    assert result == {0: expected_hit, 1: expected_hit, 2: expected_hit}
    assert len(httpx_mock.get_requests(url=_GROQ_URL)) == 1


@pytest.mark.asyncio
async def test_confidence_from_response_is_always_ignored_and_forced_low(
    monkeypatch, httpx_mock
):
    # achado da PoC (ver comentário no topo de llm_fallback.py): a
    # confidence NUNCA deve vir do modelo, mesmo se a resposta incluir um
    # campo extra de confiança.
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]
    httpx_mock.add_response(
        url=_GROQ_URL,
        json=_groq_envelope(
            [{"index": 0, "categoryCode": "ALI", "confidence": "high"}]
        ),
    )

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result[0].confidence == "low"


@pytest.mark.asyncio
async def test_merchant_key_is_never_populated_by_llm_fallback(monkeypatch, httpx_mock):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category("ALI", "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]
    httpx_mock.add_response(
        url=_GROQ_URL,
        json=_groq_envelope([{"index": 0, "categoryCode": "ALI"}]),
    )

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result[0].merchant_key is None


@pytest.mark.asyncio
async def test_household_without_any_coded_category_returns_empty_without_request(
    monkeypatch, httpx_mock
):
    _set_groq_key(monkeypatch, "test-groq-key")
    categories = [_category(None, "expense")]
    unresolved = [(0, "PADARIA CENTRAL", "expense")]

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await resolve_llm_fallback(client, unresolved, categories, deadline)

    assert result == {}
    assert httpx_mock.get_requests() == []


@pytest.mark.asyncio
async def test_call_groq_with_retry_returns_none_without_api_key(
    monkeypatch, httpx_mock
):
    _set_groq_key(monkeypatch, None)

    deadline = time.monotonic() + 30
    async with httpx.AsyncClient() as client:
        result = await _call_groq_with_retry(
            client,
            [(0, "PADARIA CENTRAL", "expense")],
            {"expense": ["ALI"]},
            deadline,
        )

    assert result is None
    assert httpx_mock.get_requests() == []
