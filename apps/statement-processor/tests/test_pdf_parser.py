# Suíte rápida do parser de PDF (Fase 3). O fixture "digital" tem camada de
# texto real -- Docling não aciona OCR nele, processa em segundos. O
# fixture "scanned" (OCR de verdade, 14-40s/página) fica isolado em
# test_pdf_ocr_slow.py (marker `slow`, não roda no `pytest -q` default).

import json
from pathlib import Path

import pytest

from statement_processor.parsers.pdf import (
    _find_column,
    _parse_amount_cents,
    _to_iso_date,
    parse_pdf,
)
from statement_processor.parsers.registry import OcrError

FIXTURES = Path(__file__).parent / "fixtures"


def _ground_truth() -> list[dict]:
    data = json.loads(
        (FIXTURES / "pdf_bank_statement_ground_truth.json").read_text(encoding="utf-8")
    )
    return data["transactions"]


def test_parse_pdf_digital_matches_ground_truth():
    raw = (FIXTURES / "pdf_bank_statement_digital.pdf").read_bytes()
    ground_truth = _ground_truth()

    transactions = parse_pdf(raw)

    # Documento real tem 153 transações (medido) através de 6 tabelas; o
    # ground truth do fixture está truncado nas primeiras 20 (nota
    # _larmony_note no JSON). Baseline real com pequena margem -- não
    # `len(ground_truth) - 2` (== 18), que deixava passar até uma queda de
    # 85% na extração ou troca de coluna sem quebrar o teste.
    assert len(transactions) >= 145

    first = transactions[0]
    first_gt = ground_truth[0]
    assert first.date == "2024-01-01"
    assert first.amount_cents == round(first_gt["credit"] * 100)  # crédito, sinal positivo
    assert "CLOTHING INDUSTRIES" in first.description.upper()

    second = transactions[1]
    second_gt = ground_truth[1]
    assert second.date == "2024-01-02"
    assert second.amount_cents == -round(second_gt["debit"] * 100)  # débito, sinal negativo
    assert "MICR" in second.description.upper() or "HDFC" in second.description.upper()

    # Índice 15 cai na SEGUNDA tabela de transações do PDF (tabelas 2-6 têm
    # cabeçalho "Value Date Cheque No." duplicado -- achado real via
    # inspeção; _find_column pega o primeiro match e funciona, mas só um
    # teste em tabela != a primeira garante isso de fato).
    fifteenth = transactions[15]
    fifteenth_gt = ground_truth[15]
    assert fifteenth.date == "2024-01-08"
    assert fifteenth.amount_cents == round(fifteenth_gt["credit"] * 100)
    assert "SOFTWAVE" in fifteenth.description.upper()


def test_parse_pdf_raises_ocr_error_for_invalid_pdf_bytes():
    with pytest.raises(OcrError):
        parse_pdf(b"isto nao e um pdf valido, so bytes aleatorios de teste")


class TestParseAmountCents:
    def test_plain_value(self):
        assert _parse_amount_cents("6086.63") == 608663

    def test_br_decimal_comma(self):
        assert _parse_amount_cents("6086,63") == 608663

    def test_br_thousands_and_decimal(self):
        assert _parse_amount_cents("1.234,56") == 123456

    def test_us_thousands_and_decimal(self):
        assert _parse_amount_cents("1,234.56") == 123456

    def test_debit_suffix(self):
        assert _parse_amount_cents("1.234,56 D") == -123456
        assert _parse_amount_cents("1234.56D") == -123456

    def test_credit_suffix(self):
        assert _parse_amount_cents("1.234,56 C") == 123456
        assert _parse_amount_cents("1234.56C") == 123456

    def test_currency_prefix(self):
        # achado real (fixture indiano): "Rs. 6,086.63" -- moeda antes do
        # número, sem sufixo D/C.
        assert _parse_amount_cents("Rs. 6,086.63") == 608663

    def test_negative_sign_before_currency_symbol(self):
        # decisão deliberada: "-" em QUALQUER posição da célula é negativo,
        # não só colado ao dígito -- cobre os dois jeitos de escrever sinal
        # negativo com prefixo de moeda, que o layout genérico não pode
        # distinguir sem conhecer o banco específico.
        assert _parse_amount_cents("-R$ 500,00") == -50000

    def test_negative_sign_between_currency_symbol_and_digits(self):
        assert _parse_amount_cents("R$ -500,00") == -50000

    def test_empty_and_nan_return_none(self):
        assert _parse_amount_cents("") is None
        assert _parse_amount_cents("nan") is None
        assert _parse_amount_cents("NaN") is None
        assert _parse_amount_cents("-") is None

    def test_garbage_returns_none(self):
        assert _parse_amount_cents("not a number") is None


class TestFindColumn:
    def test_finds_by_exact_synonym(self):
        headers = ["Date", "Description", "Debit", "Credit", "Balance"]
        assert _find_column(headers, ("date", "data")) == 0
        assert _find_column(headers, ("debit", "débito", "debito", "dr")) == 2
        assert _find_column(headers, ("credit", "crédito", "credito", "cr")) == 3

    def test_case_insensitive_and_partial_match(self):
        headers = ["DATA MOVIMENTO", "HISTÓRICO", "VALOR"]
        assert _find_column(headers, ("date", "data")) == 0
        assert _find_column(headers, ("descrição", "descricao", "histórico", "historico")) == 1

    def test_returns_none_when_no_match(self):
        assert _find_column(["Foo", "Bar"], ("date", "data")) is None


class TestToIsoDate:
    def test_datetime_with_time_component(self):
        assert _to_iso_date("2024-01-01 11:30:55") == "2024-01-01"

    def test_plain_iso_date(self):
        assert _to_iso_date("2024-01-01") == "2024-01-01"

    def test_br_slash_format(self):
        assert _to_iso_date("01/02/2024") == "2024-02-01"

    def test_br_dash_format(self):
        assert _to_iso_date("01-02-2024") == "2024-02-01"

    def test_invalid_returns_none(self):
        assert _to_iso_date("not a date") is None
        assert _to_iso_date("") is None
