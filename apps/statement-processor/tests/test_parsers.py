from pathlib import Path

from statement_processor.parsers.csv_nubank import matches, parse_nubank_csv
from statement_processor.parsers.ofx import parse_ofx
from statement_processor.parsers.registry import ParseError, parse

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_nubank_csv_reads_all_rows_with_correct_sign_and_date():
    raw = (FIXTURES / "sample_nubank.csv").read_text(encoding="utf-8")
    rows = parse_nubank_csv(raw)

    assert len(rows) == 5
    first = rows[0]
    assert first.external_id == "fx-0001"
    assert first.date == "2026-03-01"
    assert first.amount_cents == -12050
    assert "FULANO DE TAL" in first.description


def test_csv_nubank_matches_only_the_expected_header():
    assert matches("Data,Valor,Identificador,Descrição\n01/01/2026,-1.00,x,y")
    assert not matches("date,amount,id,desc\n2026-01-01,-1.00,x,y")


def test_parse_ofx_reads_stmttrn_blocks():
    raw = (FIXTURES / "sample.ofx").read_text(encoding="utf-8")
    rows = parse_ofx(raw)

    assert len(rows) == 3
    assert rows[0].external_id == "ofx-0001"
    assert rows[0].date == "2026-03-01"
    assert rows[0].amount_cents == -12050
    assert rows[2].amount_cents == 30000  # crédito, sinal positivo


def test_registry_dispatches_by_source_and_content():
    csv_raw = (FIXTURES / "sample_nubank.csv").read_text(encoding="utf-8")
    ofx_raw = (FIXTURES / "sample.ofx").read_text(encoding="utf-8")

    assert len(parse("csv", csv_raw)) == 5
    assert len(parse("ofx", ofx_raw)) == 3


def test_registry_raises_parse_error_for_unknown_csv_layout():
    unknown_csv = "date,amount,id,desc\n2026-01-01,-1.00,x,y"
    try:
        parse("csv", unknown_csv)
        assert False, "esperava ParseError"
    except ParseError:
        pass


def test_registry_raises_parse_error_for_pdf_with_wrong_raw_type():
    # source="pdf" espera bytes (job_runner.py não decodifica PDF como
    # utf-8, Fase 3) -- receber str aqui indicaria um bug no chamador.
    try:
        parse("pdf", "qualquer coisa")
        assert False, "esperava ParseError — pdf exige bytes, não str"
    except ParseError:
        pass
