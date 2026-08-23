# Camada 2 — dicionário de substring de comerciante. Dois bugs reais
# encontrados na PoC e já corrigidos aqui:
#   1. "mercado" sozinho casava com "MERCADO PAGO" (instituição de
#      pagamento no memo de QUALQUER Pix roteado por ela, mesmo
#      pessoa-a-pessoa) — exige "super"/"hiper" explícito.
#   2. "^lello$" com âncoras de string inteira nunca batia (a descrição
#      real nunca é só "lello") — trocado por \blello\b (borda de palavra).

import re

from . import RuleHit

_RULES: list[tuple[re.Pattern, str]] = [
    (
        re.compile(
            r"supermercado|hipermercado|padaria|a[cç]ougue|hortifruti|ifood|restaurante|lanchonete",
            re.I,
        ),
        "ALI",
    ),
    (re.compile(r"posto |combust[ií]vel|auto posto", re.I), "TRA"),
    (re.compile(r"drogasil|drogaria|farm[aá]cia|veterin[aá]ri", re.I), "SAU"),
    # taxonomia não tem "cuidados pessoais"; melhor encaixe disponível
    (re.compile(r"barbearia|sal[aã]o de beleza", re.I), "VES"),
    (
        re.compile(
            r"cpfl|energia el[eé]trica|semae|companhia de [aá]gua|saneamento", re.I
        ),
        "MOR",
    ),
    (re.compile(r"\blello\b|condom[ií]nio|imobili[aá]ria", re.I), "MOR"),
]


def match_keyword(description: str) -> RuleHit | None:
    for pattern, code in _RULES:
        if pattern.search(description):
            return RuleHit(category_code=code, confidence="high", resolved_by="keyword")
    return None
