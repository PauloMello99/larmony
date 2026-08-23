# Ponto único de entrada de parsing — escolhe o adapter certo por "source" +
# heurística de conteúdo. Levanta ParseError explícito em vez de tentar
# adivinhar layout (ver nota em csv_nubank.py).

from . import ParsedTransaction
from .csv_nubank import matches as csv_is_nubank
from .csv_nubank import parse_nubank_csv
from .ofx import parse_ofx


class ParseError(Exception):
    pass


def parse(source: str, raw: str) -> list[ParsedTransaction]:
    if source == "ofx":
        transactions = parse_ofx(raw)
        if not transactions:
            raise ParseError("OFX sem nenhuma <STMTTRN> reconhecida")
        return transactions

    if source == "csv":
        if csv_is_nubank(raw):
            return parse_nubank_csv(raw)
        raise ParseError(
            "Layout de CSV não reconhecido — nenhum adapter dedicado ainda "
            "(registro de adapters por banco, ADR-0033)"
        )

    raise ParseError(f"source '{source}' não suportado na Fase 1 (só csv/ofx)")
