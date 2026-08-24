# Camada 6 (Fase 4) — fallback LLM pra sobra residual que as camadas 1-5
# não resolveram (ADR-0033). Groq com schema compacto (índice curto +
# category_code, nunca UUID/nome completo) — achado de engenharia da PoC
# que reduz custo/latência sensivelmente. `confidence` da resposta NUNCA é
# lida do modelo: achado real da PoC, um modelo pequeno reportou alta
# confiança numa categorização errada ("Salário" fantasma pra Pix de pessoa
# física) — toda resolução desta camada é hardcoded "low".

import asyncio
import json
import logging
import random
import time

import httpx

from ..config import settings
from ..schemas import CategoryRef
from . import RuleHit

logger = logging.getLogger("statement_processor.rules.llm_fallback")

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_MODEL = "openai/gpt-oss-120b"
_BATCH_SIZE = 20
_MAX_RETRIES = 3
_BASE_BACKOFF_SECONDS = 1.0

# Serializa TODA chamada à Groq do processo inteiro: o rate limit do free
# tier (8.000 tokens/min, achado da PoC) é POR ORGANIZAÇÃO, não por job —
# vários jobs em paralelo estourando o limite ao mesmo tempo desperdiça as
# tentativas de retry de todos eles. Mesmo raciocínio do _PDF_OCR_LOCK em
# job_runner.py, aplicado a um recurso externo compartilhado em vez de um
# modelo em memória.
_GROQ_CALL_LOCK = asyncio.Semaphore(1)


async def _call_groq_with_retry(
    client: httpx.AsyncClient,
    chunk_items: list[tuple[int, str, str]],
    category_codes_by_type: dict[str, list[str]],
    deadline: float,
) -> list[dict] | None:
    api_key = settings.groq_api_key
    if not api_key:
        return None

    vocabulary = "\n".join(
        f"{txn_type}: {', '.join(codes)}"
        for txn_type, codes in category_codes_by_type.items()
        if codes
    )
    items_payload = [
        {"index": position, "description": description, "type": txn_type}
        for position, (_, description, txn_type) in enumerate(chunk_items)
    ]
    system_prompt = (
        "Você categoriza transações de extrato bancário brasileiro. Para "
        "cada item da lista, escolha o categoryCode mais adequado dentre o "
        "vocabulário fornecido para o type daquele item específico (nunca "
        "um código de outro type). Se nenhum código do vocabulário se "
        "encaixar, omita o item da resposta. Responda apenas em JSON no "
        'formato {"items": [{"index": <int>, "categoryCode": "<code>"}]}.'
    )
    user_prompt = (
        f"Vocabulário de categorias por type:\n{vocabulary}\n\n"
        f"Itens:\n{json.dumps(items_payload, ensure_ascii=False)}"
    )
    body = {
        "model": _MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "reasoning_effort": "low",
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    # O semáforo é global de processo (rate limit é por organização), então
    # esperar por ele pode consumir o deadline inteiro sem que o job jamais
    # chegue a fazer uma requisição -- limita a espera ao tempo restante em
    # vez de um `async with` sem timeout, senão o orçamento por source
    # (_LLM_BUDGET_SECONDS) vira decorativo sempre que dois households
    # competem pela Groq ao mesmo tempo.
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return None
    try:
        await asyncio.wait_for(_GROQ_CALL_LOCK.acquire(), timeout=remaining)
    except TimeoutError:
        logger.warning("Deadline do job estourou esperando o lock da Groq")
        return None

    try:
        for attempt in range(_MAX_RETRIES):
            # Recalculado a cada tentativa -- limita tanto o timeout da
            # requisição quanto o sleep de backoff abaixo, senão um único
            # attempt (request de até 10s + sleep de um Retry-After grande)
            # pode segurar o _GROQ_CALL_LOCK bem além do deadline, repetindo
            # com o request/sleep o mesmo bug já corrigido na espera do lock.
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                logger.warning("Deadline do job estourou durante retry da Groq")
                return None

            backoff = _BASE_BACKOFF_SECONDS * (2**attempt) + random.uniform(
                0, _BASE_BACKOFF_SECONDS
            )
            try:
                response = await client.post(
                    _GROQ_URL,
                    json=body,
                    headers=headers,
                    timeout=min(10.0, remaining),
                )
            except httpx.HTTPError as exc:
                logger.warning(
                    "Groq request falhou (tentativa %d/%d): %s",
                    attempt + 1,
                    _MAX_RETRIES,
                    exc,
                )
                if attempt < _MAX_RETRIES - 1:
                    sleep_for = min(backoff, deadline - time.monotonic())
                    if sleep_for > 0:
                        await asyncio.sleep(sleep_for)
                continue

            if response.status_code == 200:
                try:
                    content = response.json()["choices"][0]["message"]["content"]
                    items = json.loads(content)["items"]
                    if not isinstance(items, list):
                        raise ValueError("campo items não é uma lista")
                    return items
                except (
                    httpx.HTTPError,
                    LookupError,  # cobre KeyError e IndexError (ex. choices=[])
                    TypeError,  # ex. json.loads devolve lista/None em vez de dict
                    ValueError,  # cobre json.JSONDecodeError
                ) as exc:
                    logger.warning("Resposta da Groq malformada: %s", exc)
                    return None

            retryable = response.status_code == 429 or response.status_code >= 500
            if not retryable or attempt == _MAX_RETRIES - 1:
                logger.warning(
                    "Groq retornou status %d (sem novas tentativas)",
                    response.status_code,
                )
                return None

            retry_after = response.headers.get("Retry-After")
            if retry_after is not None:
                try:
                    backoff = float(retry_after)
                except ValueError:
                    pass
            sleep_for = min(backoff, deadline - time.monotonic())
            if sleep_for > 0:
                await asyncio.sleep(sleep_for)

        return None
    finally:
        _GROQ_CALL_LOCK.release()


async def resolve_llm_fallback(
    client: httpx.AsyncClient,
    unresolved: list[tuple[int, str, str]],
    categories: list[CategoryRef],
    deadline: float,
) -> dict[int, RuleHit]:
    category_codes_by_type: dict[str, list[str]] = {}
    for category in categories:
        if category.code is None:
            continue
        codes = category_codes_by_type.setdefault(category.type, [])
        if category.code not in codes:
            codes.append(category.code)

    if not category_codes_by_type:
        # Household sem nenhuma categoria de código fechado -- qualquer
        # resposta do modelo falharia a checagem de vocabulário permitido;
        # evita queimar chamada/retry pra um resultado que nunca vai passar.
        return {}

    results: dict[int, RuleHit] = {}
    # Cache só desta chamada, nunca de módulo/global: category_code é por
    # household, e um cache compartilhado entre chamadas vazaria resolução
    # de um household pra outro — quebraria o processor ser stateless
    # (ADR-0033).
    seen: dict[str, RuleHit | None] = {}

    cursor = 0
    while cursor < len(unresolved):
        if time.monotonic() >= deadline:
            break

        batch_positions: list[int] = []
        batch_items: list[tuple[int, str, str]] = []
        batch_descriptions: set[str] = set()

        while cursor < len(unresolved) and len(batch_items) < _BATCH_SIZE:
            original_index, description, txn_type = unresolved[cursor]
            if description in seen:
                hit = seen[description]
                if hit is not None:
                    results[original_index] = hit
                cursor += 1
                continue
            batch_positions.append(cursor)
            if description not in batch_descriptions:
                batch_descriptions.add(description)
                batch_items.append((original_index, description, txn_type))
            cursor += 1

        if not batch_items:
            continue

        response_items = await _call_groq_with_retry(
            client, batch_items, category_codes_by_type, deadline
        )
        if response_items is not None:
            for raw_item in response_items:
                try:
                    item_index = int(raw_item["index"])
                    category_code = str(raw_item["categoryCode"])
                except (KeyError, TypeError, ValueError):
                    continue
                if item_index < 0 or item_index >= len(batch_items):
                    continue
                _, description, txn_type = batch_items[item_index]
                if category_code not in category_codes_by_type.get(txn_type, []):
                    continue
                seen[description] = RuleHit(
                    category_code=category_code,
                    confidence="low",
                    resolved_by="llm_fallback",
                )

        for position in batch_positions:
            original_index, description, _ = unresolved[position]
            if description not in seen:
                seen[description] = None
                continue
            hit = seen[description]
            if hit is not None:
                results[original_index] = hit

    return results
