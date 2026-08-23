# Camada 1 — padrões que indicam "não é uma compra categorizável", não um
# comerciante específico. 100% precisa nas 5 PoCs validadas (0 falso
# positivo encontrado) — maior fonte de cobertura isolada (63,8% em
# jul/2026), mas achado importante da investigação: essa cobertura NÃO é
# constante — a regra de movimentação compartilhada tinha zero ocorrência
# em extratos de 2024/2025 do mesmo lar (comportamento surgiu depois).

import re

from . import RuleHit

_SHARED_MOVEMENT = re.compile(r"transa[cç][aã]o compartilhada|saldo compartilhado", re.I)
_CARD_BILL = re.compile(r"pagamento de fatura", re.I)


def match_structural(description: str) -> RuleHit | None:
    # category_code fica None nos dois casos — "IND"/"FAT" da PoC eram
    # sentinelas internas, não categorias reais do household (ADR-0034: o
    # vocabulário fechado é só as 13 categorias default). O que importa pro
    # backend é resolved_by="structural": diferencia "reconhecido como não
    # categorizável" de "unresolved" (nunca visto por nenhuma regra) —
    # ambos chegam sem categoria, mas com motivo diferente na revisão.
    if _SHARED_MOVEMENT.search(description):
        return RuleHit(category_code=None, confidence="low", resolved_by="structural")
    if _CARD_BILL.search(description):
        # fatura de cartão soma N compras — nunca uma categoria única
        # (achado: LLM errou exatamente aqui, tratando como categoria só).
        return RuleHit(category_code=None, confidence="high", resolved_by="structural")
    return None
