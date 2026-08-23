# Camada 3 — CNPJ (regex, formato nacional fixo) -> CNAE via BrasilAPI
# (gratuita) -> categoria via tabela de keyword sobre a descrição do CNAE.
# Achados da PoC aplicados aqui:
#   - BrasilAPI devolve 403 sem um User-Agent de navegador (bloqueio
#     anti-bot não documentado) — sem o header, toda chamada falha.
#   - Rendimento é menor do que uma demo isolada sugere: CNAE oficial de
#     empresa brasileira frequentemente não reflete a atividade percebida
#     pelo usuário (holdings, MEI com atividade secundária registrada).
#     Tratar como reforço de sinal, não fonte primária.

import re

import httpx

from . import RuleHit

_CNPJ_RE = re.compile(r"(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})")

_CNAE_RULES: list[tuple[re.Pattern, str | None]] = [
    (re.compile(r"energia el[eé]trica|[aá]gua|esgoto|g[aá]s|imobili|condom[ií]nio|aluguel", re.I), "MOR"),
    (re.compile(r"combust[ií]ve|transporte|estacionamento|ve[ií]cul", re.I), "TRA"),
    (
        re.compile(
            r"supermercado|hipermercado|padaria|a[cç]ougue|restaurante|lanchonete|bar |alimenta|hortifruti",
            re.I,
        ),
        "ALI",
    ),
    (
        re.compile(
            r"farm[aá]c|hospital|m[eé]dic|odontol[oó]g|veterin[aá]r|laborat[oó]rio|cl[ií]nica|sa[uú]de",
            re.I,
        ),
        "SAU",
    ),
    (re.compile(r"ensino|escola|educacional|curso", re.I), "EDU"),
    (re.compile(r"cinema|streaming|jogos eletr|entretenimento|esporte|academia|lazer", re.I), "LAZ"),
    (re.compile(r"vestu[aá]rio|roupa|cal[cç]ado|confec[cç][aã]o", re.I), "VES"),
    (re.compile(r"telecomunica|assinatura", re.I), "ASS"),
    # gateway/PSP - não é o comerciante final, não dá pra confiar
    (
        re.compile(
            r"pagamento.*instant[âa]neo|institui[cç][aã]o de pagamento|intermedia[cç][aã]o|meios de pagamento",
            re.I,
        ),
        None,
    ),
]

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

_cnae_cache: dict[str, dict | None] = {}


def extract_cnpj(description: str) -> str | None:
    match = _CNPJ_RE.search(description)
    if not match:
        return None
    return re.sub(r"[.\-/]", "", match.group(1))


async def _lookup_cnae(client: httpx.AsyncClient, cnpj: str) -> dict | None:
    if cnpj in _cnae_cache:
        return _cnae_cache[cnpj]
    try:
        res = await client.get(
            f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}",
            headers={"User-Agent": _USER_AGENT, "Accept": "application/json"},
            timeout=10.0,
        )
        if res.status_code != 200:
            _cnae_cache[cnpj] = None
            return None
        body = res.json()
        info = {
            "descricao": body.get("cnae_fiscal_descricao", ""),
            "razao_social": body.get("razao_social", ""),
        }
        _cnae_cache[cnpj] = info
        return info
    except httpx.HTTPError:
        _cnae_cache[cnpj] = None
        return None


async def match_cnpj_cnae(client: httpx.AsyncClient, description: str) -> RuleHit | None:
    cnpj = extract_cnpj(description)
    if not cnpj:
        return None
    info = await _lookup_cnae(client, cnpj)
    if not info:
        return None
    for pattern, code in _CNAE_RULES:
        if pattern.search(info["descricao"]):
            return RuleHit(category_code=code, confidence="medium", resolved_by="cnpj_cnae")
    return None
