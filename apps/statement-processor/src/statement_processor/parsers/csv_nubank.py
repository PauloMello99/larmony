# Adapter de CSV do Nubank — formato "Data,Valor,Identificador,Descrição",
# validado na PoC contra EXTRATO_NUBANK_JULHO_2026.csv. Cada banco tem seu
# próprio layout de coluna (registro de adapters, ver ADR-0033 §"Arquitetura
# dinâmica multi-banco") — este é o único CSV validado até agora; CSV de
# outro banco cai em erro explícito (PARSE_ERROR), nunca em heurística
# genérica de coluna (achado da investigação: heurística de texto livre é
# viável para normalizar nome de comerciante, mas layout de CSV é
# estruturalmente diferente por banco — errar aqui corrompe valor/data, um
# risco maior que deixar a transação sem categoria).

from . import ParsedTransaction

HEADER = "Data,Valor,Identificador,Descrição"


def matches(raw: str) -> bool:
    first_line = raw.split("\n", 1)[0].strip()
    return first_line == HEADER


def _to_iso_date(br_date: str) -> str:
    day, month, year = br_date.split("/")
    return f"{year}-{month}-{day}"


def parse_nubank_csv(raw: str) -> list[ParsedTransaction]:
    lines = [line for line in raw.split("\n") if line.strip()]
    rows = lines[1:]  # descarta o header
    out: list[ParsedTransaction] = []
    for line in rows:
        # formato fixo de 4 colunas; a descrição pode conter vírgulas, então
        # só as 3 primeiras vírgulas delimitam campo — o resto é descrição.
        parts = line.split(",", 3)
        if len(parts) < 4:
            continue
        date, valor, identificador, desc = parts
        out.append(
            ParsedTransaction(
                external_id=identificador.strip(),
                date=_to_iso_date(date.strip()),
                amount_cents=round(float(valor.strip()) * 100),
                description=desc.strip(),
            )
        )
    return out
