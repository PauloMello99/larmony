# Parser de OFX (SGML) — formato padronizado (OFXHEADER:100/SGML), o mesmo
# em qualquer banco que exporte OFX 1.x. Validado contra 5 extratos reais
# do Nubank na investigação (.memory/sessions/2026-08-21-llm-viability-investigation.md)
# — <TRNAMT>/<FITID>/<MEMO>/<DTPOSTED> são tags padrão da spec OFX, não
# jargão de banco específico, ao contrário do texto livre do MEMO.

import re

from . import ParsedTransaction

_BLOCK_RE = re.compile(r"<STMTTRN>(.*?)</STMTTRN>", re.DOTALL)
_TAG_RE = {
    "amt": re.compile(r"<TRNAMT>([^\r\n<]+)"),
    "fitid": re.compile(r"<FITID>([^\r\n<]+)"),
    "memo": re.compile(r"<MEMO>([^\r\n<]+)"),
    "dtposted": re.compile(r"<DTPOSTED>([^\r\n<]+)"),
}


def _to_iso_date(dtposted: str) -> str:
    # "20260701000000[-3:BRT]" -> "2026-07-01"
    digits = dtposted[:8]
    return f"{digits[0:4]}-{digits[4:6]}-{digits[6:8]}"


def parse_ofx(raw: str) -> list[ParsedTransaction]:
    # OFX 1.x (SGML) não fecha tag por tag, só o bloco STMTTRN de fato tem
    # fechamento explícito na maioria dos exports reais — usar split por
    # abertura é mais tolerante a variação entre bancos que split por par
    # de tag completo (achado da PoC: alguns exports omitem o </STMTTRN>).
    blocks = re.split(r"<STMTTRN>", raw)[1:]
    out: list[ParsedTransaction] = []
    for block in blocks:
        amt = _TAG_RE["amt"].search(block)
        fitid = _TAG_RE["fitid"].search(block)
        memo = _TAG_RE["memo"].search(block)
        dtposted = _TAG_RE["dtposted"].search(block)
        if not (amt and dtposted):
            continue
        amount_cents = round(float(amt.group(1)) * 100)
        out.append(
            ParsedTransaction(
                external_id=fitid.group(1) if fitid else "",
                date=_to_iso_date(dtposted.group(1)),
                amount_cents=amount_cents,
                description=(memo.group(1) if memo else "").strip(),
            )
        )
    return out
