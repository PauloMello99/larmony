from statement_processor.rules.household_member import match_household_member
from statement_processor.schemas import HouseholdMember


def test_matches_member_by_exact_name():
    members = [HouseholdMember(name="Joao Da Silva", userId="user-1")]
    hit = match_household_member("JOAO DA SILVA", members)
    assert hit is not None
    assert hit.category_code is None
    assert hit.resolved_by == "household_member"
    assert hit.merchant_key == "JOAO DA SILVA"


def test_matches_member_by_partial_name_inclusion():
    # tolera nome parcial/completo em qualquer direção — achado da PoC
    # (match por inclusão, não igualdade estrita).
    members = [HouseholdMember(name="Joao Da Silva", userId="user-1")]
    assert match_household_member("JOAO DA SILVA SANTOS", members) is not None
    assert match_household_member("JOAO", members) is not None


def test_returns_none_when_no_member_matches():
    members = [HouseholdMember(name="Maria Souza", userId="user-1")]
    assert match_household_member("FULANO DE TAL", members) is None


def test_returns_none_with_no_members():
    assert match_household_member("FULANO DE TAL", []) is None


def test_returns_none_for_empty_merchant_key():
    # achado da revisão: "" in "qualquer nome" é sempre True — sem essa
    # guarda, um memo sem nome extraível (ex. começa com CNPJ) casaria com
    # QUALQUER membro do lar por acidente.
    members = [HouseholdMember(name="Joao Da Silva", userId="user-1")]
    assert match_household_member("", members) is None
