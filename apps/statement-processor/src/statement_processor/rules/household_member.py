# Camada 2 (Fase 2) — cross-referência de comerciante/pessoa contra os
# membros cadastrados do lar. Achado da PoC: sozinha, mais valiosa que a
# camada de CNPJ inteira (+2,1pp vs. cobertura já com estrutural+keyword).
# Roda depois de estrutural e memória de comerciante, antes de keyword —
# nome de comerciante incidental dentro de um memo de pessoa conhecida não
# deve deixar a keyword vencer.

from ..schemas import HouseholdMember
from . import RuleHit


def match_household_member(
    merchant_key: str, members: list[HouseholdMember]
) -> RuleHit | None:
    if not merchant_key:
        # merchant_key vazio (memo sem nome extraível, ex. começa direto no
        # CNPJ) casaria com QUALQUER membro via "in" — falso positivo.
        return None
    for member in members:
        name = member.name.upper()
        if name in merchant_key or merchant_key in name:
            # reconhecido como pessoa conhecida ≠ sabemos a categoria —
            # mesmo princípio da camada estrutural (ADR-0034).
            return RuleHit(
                category_code=None,
                confidence="high",
                resolved_by="household_member",
                merchant_key=merchant_key,
            )
    return None
