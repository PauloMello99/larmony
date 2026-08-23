from statement_processor.rules.merchant_key import normalize_merchant


def test_normalizes_pix_shared_balance_memo():
    key = normalize_merchant(
        "Transferência enviada pelo Pix (saldo compartilhado) - FULANO DE TAL "
        "- CPF ***.111.222-** - Conta 1000-0"
    )
    assert key == "FULANO DE TAL"


def test_normalizes_pix_sent_memo():
    key = normalize_merchant(
        "Transferência enviada pelo Pix - JOAO DA SILVA - ***.333.444-** - "
        "BCO TESTE (0001) Agência: 1 Conta: 111-1"
    )
    assert key == "JOAO DA SILVA"


def test_normalizes_pix_with_cnpj():
    key = normalize_merchant(
        "Transferência enviada pelo Pix - EMPRESA TESTE ENERGIA LTDA - "
        "11.222.333/0001-44 - BCO TESTE"
    )
    assert key == "EMPRESA TESTE ENERGIA LTDA"


def test_normalizes_pix_received_memo():
    assert normalize_merchant("Transferência recebida pelo Pix - JOAO DA SILVA") == (
        "JOAO DA SILVA"
    )


def test_normalizes_debit_purchase_memo():
    assert normalize_merchant("Compra no débito - SUPERMERCADO EXEMPLO LTDA") == (
        "SUPERMERCADO EXEMPLO LTDA"
    )


def test_normalizes_boleto_payment_memo():
    assert normalize_merchant("Pagamento de boleto efetuado - LELLO") == "LELLO"


def test_normalizes_open_banking_pix_memo():
    key = normalize_merchant(
        "Transferência enviada pelo Pix via Open Banking - iniciada por: "
        "FULANO DE TAL - JOAO DA SILVA - BCO TESTE"
    )
    assert key == "JOAO DA SILVA"


def test_strips_transfer_suffix():
    assert normalize_merchant("JOAO DA SILVA (Transferência enviada)") == (
        "JOAO DA SILVA"
    )


def test_strips_trailing_cpf_glued_to_name():
    # achado da PoC: CPF sem formatação às vezes aparece grudado ao nome.
    assert normalize_merchant("Transferência recebida - JOAO SILVA 12345678901") == (
        "JOAO SILVA"
    )


def test_returns_empty_string_when_memo_starts_with_cnpj():
    # caso degenerado: nada sobra depois do corte no delimitador — não deve
    # virar chave "vazia mas válida" (ver bug corrigido em household_member).
    assert normalize_merchant("11.222.333/0001-44 - BCO TESTE") == ""


def test_unites_same_person_across_different_memo_templates():
    variants = [
        "Transferência enviada pelo Pix (saldo compartilhado) - JOAO DA SILVA "
        "- CPF ***.111.222-** - Conta 1000-0",
        "Transferência enviada pelo Pix - JOAO DA SILVA - 11.222.333/0001-44 "
        "- BCO TESTE",
        "JOAO DA SILVA (Transferência enviada)",
        "Transferência recebida - JOAO DA SILVA",
    ]
    keys = {normalize_merchant(v) for v in variants}
    assert keys == {"JOAO DA SILVA"}
