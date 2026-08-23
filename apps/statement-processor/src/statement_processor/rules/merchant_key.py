# Normalizador de comerciante/pessoa (Fase 2 — memória por lar). Algoritmo
# validado nas PoCs da investigação contra memos reais do Nubank — ver
# docs/product/features/16-import-extrato.md, "Referência técnica da Fase 2".
# Une corretamente o mesmo nome aparecendo em templates de memo diferentes
# (com CNPJ, com CPF mascarado/grudado, com sufixo de transferência, sem
# nenhum identificador). Limitação conhecida e aceita: não une nomes com
# ordem de palavra diferente entre canais (ex. Pix vs. débito da mesma
# rede) — só a camada 5 (ML) resolveu esse caso na PoC.

import re

_LEAD_INS = [
    re.compile(r"^transferência enviada pelo pix \(saldo compartilhado\) - ", re.I),
    re.compile(
        r"^transferência enviada pelo pix via open banking - iniciada por: .+? - ",
        re.I,
    ),
    re.compile(r"^transferência enviada pelo pix - ", re.I),
    re.compile(r"^transferência recebida pelo pix - ", re.I),
    re.compile(r"^transferência recebida - ", re.I),
    re.compile(r"^compra no débito - ", re.I),
    re.compile(r"^pagamento de boleto efetuado - ", re.I),
]

_DELIMITER_PATTERNS = [
    re.compile(r" - "),
    re.compile(r" \(Transferência", re.I),
    re.compile(r" CNPJ ", re.I),
    re.compile(r"\d{2}\.\d{3}\.\d{3}/"),
    re.compile(r"•••"),
]

_SUFFIX_PATTERNS = [
    re.compile(r"\(Transferência enviada\)", re.I),
    re.compile(r"\(Transferência recebida\)", re.I),
]

_TRAILING_DIGITS = re.compile(r"\d{6,}$")


def _cut_at_first_delimiter(s: str) -> str:
    cut_pos = len(s)
    for pattern in _DELIMITER_PATTERNS:
        match = pattern.search(s)
        if match and match.start() < cut_pos:
            cut_pos = match.start()
    return s[:cut_pos]


def normalize_merchant(description: str) -> str:
    s = description
    for pattern in _LEAD_INS:
        match = pattern.match(s)
        if match:
            s = s[match.end() :]
            break

    s = _cut_at_first_delimiter(s)
    for pattern in _SUFFIX_PATTERNS:
        s = pattern.sub("", s)
    s = _TRAILING_DIGITS.sub("", s)

    return re.sub(r"\s+", " ", s).strip().upper()
