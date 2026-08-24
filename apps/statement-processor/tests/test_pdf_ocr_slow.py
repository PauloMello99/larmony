# Teste de OCR real (Docling + EasyOCR) contra o PDF ESCANEADO (imagem,
# sem camada de texto) -- aciona OCR de verdade, 14-40s/página medido na
# investigação (6 páginas = pode levar minutos). Isolado com o marker
# `slow` (registrado em pyproject.toml, `addopts = "-m 'not slow'"`) pra
# não pesar o `pytest -q` default; rodar explicitamente com
# `pytest -m slow -q`.

import json
from pathlib import Path

import pytest

from statement_processor.parsers.pdf import parse_pdf

FIXTURES = Path(__file__).parent / "fixtures"


def _ground_truth() -> list[dict]:
    data = json.loads(
        (FIXTURES / "pdf_bank_statement_ground_truth.json").read_text(encoding="utf-8")
    )
    return data["transactions"]


@pytest.mark.slow
def test_parse_pdf_via_real_ocr_scanned_document():
    raw = (FIXTURES / "pdf_bank_statement_scanned.pdf").read_bytes()
    ground_truth = _ground_truth()

    transactions = parse_pdf(raw)

    # OCR real introduz mais ruído que a camada de texto digital -- só
    # exigimos volume razoável de transações reconhecidas, não paridade
    # exata com o ground truth (achado esperado: erros de OCR em dígitos
    # isolados são possíveis e aceitáveis nesta fase, sem adapter dedicado
    # por banco).
    assert len(transactions) > 0
    assert len(transactions) >= len(ground_truth) // 2

    first = transactions[0]
    assert first.date == "2024-01-01"
