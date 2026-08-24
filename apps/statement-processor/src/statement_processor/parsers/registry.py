# Ponto único de entrada de parsing — escolhe o adapter certo por "source" +
# heurística de conteúdo. Levanta ParseError explícito em vez de tentar
# adivinhar layout (ver nota em csv_nubank.py).

from . import ParsedTransaction
from .csv_nubank import matches as csv_is_nubank
from .csv_nubank import parse_nubank_csv
from .ofx import parse_ofx


class ParseError(Exception):
    pass


class OcrError(ParseError):
    # Subclasse de ParseError -- quem só faz `except ParseError` continua
    # pegando, mas job_runner.py distingue com `except OcrError` primeiro
    # pra mapear errorCode="OCR_FAILED" em vez de "PARSE_ERROR" (Fase 3).
    pass


def parse(source: str, raw: str | bytes) -> list[ParsedTransaction]:
    if source == "ofx":
        if not isinstance(raw, str):
            raise ParseError("OFX esperado como texto, recebeu bytes")
        transactions = parse_ofx(raw)
        if not transactions:
            raise ParseError("OFX sem nenhuma <STMTTRN> reconhecida")
        return transactions

    if source == "csv":
        if not isinstance(raw, str):
            raise ParseError("CSV esperado como texto, recebeu bytes")
        if csv_is_nubank(raw):
            return parse_nubank_csv(raw)
        raise ParseError(
            "Layout de CSV não reconhecido — nenhum adapter dedicado ainda "
            "(registro de adapters por banco, ADR-0033)"
        )

    if source == "pdf":
        if not isinstance(raw, bytes):
            raise ParseError("PDF esperado como bytes, recebeu texto")
        # Import local pra não pagar o custo de import do docling (pesado --
        # torch/easyocr) em processos que só lidam com csv/ofx.
        from .pdf import parse_pdf

        return parse_pdf(raw)

    raise ParseError(f"source '{source}' não suportado (csv/ofx/pdf)")
