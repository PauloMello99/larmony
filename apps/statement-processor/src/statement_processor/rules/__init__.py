from dataclasses import dataclass


@dataclass(frozen=True)
class RuleHit:
    category_code: str | None
    confidence: str  # "high" | "medium" | "low"
    resolved_by: str
    merchant_key: str | None = None
