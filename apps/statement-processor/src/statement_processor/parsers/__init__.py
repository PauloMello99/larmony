import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedTransaction:
    external_id: str
    date: str  # ISO yyyy-mm-dd
    amount_cents: int
    description: str


def deterministic_external_id(date: str, amount_cents: int, description: str) -> str:
    """Hash estável pra fontes sem id nativo (CSV/PDF de bancos sem coluna
    de identificador) — usado como externalId pro dedup de reimport
    (ADR-0034). OFX/Nubank-CSV têm id nativo e não passam por aqui."""
    raw = f"{date}|{amount_cents}|{description.strip().upper()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
