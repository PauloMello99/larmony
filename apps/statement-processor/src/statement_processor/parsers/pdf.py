# Camada de OCR (Fase 3) — Docling self-hospedado, CPU-only, motor EasyOCR
# (decisão confirmada: EasyOCR em vez de RapidOCR/Tesseract, apesar do
# torch deixar a imagem Docker maior). Parser genérico por heurística de
# cabeçalho de coluna (Data/Valor/Descrição e sinônimos) — sem adapter
# dedicado por banco nesta fase (ADR-0033: "PDF de extrato não é
# padronizado nem entre formatos", mesmo achado que já vale pra CSV).
# Layout não reconhecido levanta OcrError -> callback OCR_FAILED, revisão
# manual do usuário — nunca tenta adivinhar coluna (mesmo princípio de
# csv_nubank.py).
#
# Validado com instalação real (docling 2.121.0 + easyocr 1.7.2, ver
# pyproject.toml para o range travado). API confirmada correta.

import functools
import math
import os
import re
import tempfile
from datetime import date
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import EasyOcrOptions, PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption

from . import ParsedTransaction
from .registry import OcrError

_DATE_KEYWORDS = ("date", "data")
_DEBIT_KEYWORDS = ("debit", "débito", "debito", "dr")
_CREDIT_KEYWORDS = ("credit", "crédito", "credito", "cr")
_AMOUNT_KEYWORDS = ("amount", "valor")
_DESCRIPTION_KEYWORDS = (
    "description",
    "descrição",
    "descricao",
    "histórico",
    "historico",
    "narration",
    "particulars",
)

_EMPTY_TOKENS = {"", "nan", "none", "null", "-", "--"}
_BR_DATE_RE = re.compile(r"^(\d{2})[/-](\d{2})[/-](\d{4})$")


@functools.lru_cache(maxsize=1)
def _build_converter() -> DocumentConverter:
    # Cache de processo: sem isso, cada chamada a parse_pdf() recriava o
    # DocumentConverter e recarregava os pesos do EasyOCR do zero (medido:
    # a maior parte do tempo de um job de PDF é carregar modelo, não o OCR
    # em si) -- em um worker FastAPI de vida longa isso pagaria o custo de
    # cold-start a cada job, arriscando o timeout de 5min do cron de
    # reconciliação pra source=pdf.
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True
    pipeline_options.ocr_options = EasyOcrOptions()
    # Modelo baked no build da imagem Docker (Dockerfile) -- nunca baixado
    # em runtime (achado da PoC: cold-start de download repetido a cada
    # instância fria). Sem a env (dev local sem pre-cache), cai no
    # comportamento default do Docling (baixa on-demand, mais lento só na
    # primeira chamada do processo).
    artifacts_path = os.environ.get("DOCLING_ARTIFACTS_PATH")
    if artifacts_path:
        pipeline_options.artifacts_path = artifacts_path
    return DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)}
    )


def _find_column(headers: list[str], keywords: tuple[str, ...]) -> int | None:
    # \b (borda de palavra), não substring solta — achado real: keywords
    # curtas tipo "cr"/"dr" (abreviação de Credit/Debit em alguns extratos)
    # batiam dentro de "desCRiption"/"aDDRess" com `kw in normalized`,
    # confundindo a coluna de descrição com a de crédito.
    for i, header in enumerate(headers):
        normalized = header.strip().lower()
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", normalized):
                return i
    return None


# Extrai o núcleo numérico de qualquer lugar da string via `search` (não
# `match`) -- achado real com o fixture de teste (extrato indiano em
# rúpias): valores vêm como "Rs. 6,086.63", com prefixo de moeda que o
# `^...$` original não tolerava (toda célula de debit/credit caía em
# None, e a tabela inteira era descartada como "sem transação válida").
# Sufixo D/C (achado do extrato real da Caixa, ADR-0033/domain-rules)
# continua opcional no fim.
_AMOUNT_CORE_RE = re.compile(r"(?P<core>\d[\d.,]*)\s*(?P<suffix>[DCdc])?$")


def _parse_amount_cents(text: str) -> int | None:
    # Célula vazia (mutuamente exclusivo entre debit/credit no dataset de
    # fixture) sai do pandas como string "nan" -- sem esse guard,
    # float("nan") "funciona" e round(abs(nan) * 100) explode com
    # ValueError não tratado (escaparia como INTERNAL_ERROR em vez de
    # simplesmente pular a coluna vazia).
    normalized = text.strip()
    if not normalized or normalized.lower() in _EMPTY_TOKENS:
        return None

    match = _AMOUNT_CORE_RE.search(normalized)
    if not match:
        return None

    core = match.group("core")
    # Sinal negativo: "-" só conta se aparecer ANTES do número (prefixo de
    # moeda pode vir no meio: "-Rs. 500" ou "Rs. -500", ambos cobertos por
    # procurar o "-" em normalized[:match.start()]). Decisão deliberada,
    # não "'-' em qualquer posição" -- achado real no próprio fixture de
    # teste: células de Balance (não usadas aqui, mas mesmo formato de
    # célula) trazem um "-" solto DEPOIS do número como artefato de
    # reconhecimento de tabela (ex. "Rs. 24,304.46 -"); tratar isso como
    # sinal inverteria uma célula positiva. Um "-" à direita dos dígitos
    # também não passa no `$` do regex (não é dígito nem D/C), então essas
    # células já retornam None antes de chegar aqui -- a checagem abaixo é
    # a segunda camada de defesa, explícita sobre a intenção.
    sign = -1 if "-" in normalized[: match.start()] else 1
    if match.group("suffix") and match.group("suffix").upper() == "D":
        sign = -1

    has_comma = "," in core
    has_dot = "." in core
    if has_comma and has_dot:
        # o separador decimal é o que aparece por último na string; o outro
        # é separador de milhar e deve ser removido antes do float().
        if core.rfind(",") > core.rfind("."):
            core = core.replace(".", "").replace(",", ".")
        else:
            core = core.replace(",", "")
    elif has_comma:
        # só vírgula -> decimal BR ("1234,56")
        core = core.replace(",", ".")
    # só ponto ou nenhum separador -> já é formato float válido (ponto
    # decimal), inclusive milhar "1.234" (ambíguo, mas não ocorre nos
    # fixtures usados; tratado como decimal por ser o caso majoritário de
    # export de sistema, ao contrário de digitação manual).

    try:
        value = float(core)
    except ValueError:
        return None
    if not math.isfinite(value):
        return None

    return round(abs(value) * 100) * sign


def _to_iso_date(text: str) -> str | None:
    normalized = text.strip()
    if not normalized or normalized.lower() in _EMPTY_TOKENS:
        return None

    # "2024-01-01 11:30:55" ou "2024-01-01" -- fromisoformat só aceita o
    # prefixo de 10 chars (YYYY-MM-DD), o resto (hora) é ruído pra nós.
    # Achado real (fixture "Txn Date" do extrato indiano): o mesmo vale pro
    # formato BR -- "01-01-2024 11:30:55" tem hora sobrando, e o `$` do
    # regex original exigia string inteira, então nunca casava. Cortamos
    # pros 10 primeiros chars ANTES de tentar os dois formatos.
    date_part = normalized[:10]
    try:
        return date.fromisoformat(date_part).isoformat()
    except ValueError:
        pass

    # "01/01/2024" ou "01-01-2024" (formato BR/extrato real, ex. Caixa)
    match = _BR_DATE_RE.match(date_part)
    if match:
        day, month, year = match.groups()
        try:
            return date(int(year), int(month), int(day)).isoformat()
        except ValueError:
            return None

    return None


def parse_pdf(raw: bytes) -> list[ParsedTransaction]:
    converter = _build_converter()
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(raw)
        tmp_path = Path(tmp.name)
    try:
        try:
            result = converter.convert(tmp_path)
        except Exception as exc:
            raise OcrError(f"Falha ao processar o PDF via OCR: {exc}") from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    tables = result.document.tables
    if not tables:
        raise OcrError("Nenhuma tabela reconhecida no PDF (layout não suportado)")

    out: list[ParsedTransaction] = []
    for table in tables:
        df = table.export_to_dataframe(doc=result.document)
        if df.empty:
            continue
        headers = [str(c) for c in df.columns]
        date_idx = _find_column(headers, _DATE_KEYWORDS)
        desc_idx = _find_column(headers, _DESCRIPTION_KEYWORDS)
        debit_idx = _find_column(headers, _DEBIT_KEYWORDS)
        credit_idx = _find_column(headers, _CREDIT_KEYWORDS)
        amount_idx = _find_column(headers, _AMOUNT_KEYWORDS)
        if date_idx is None or desc_idx is None or (
            debit_idx is None and credit_idx is None and amount_idx is None
        ):
            continue  # tabela não é a de transações (ex.: cabeçalho da conta)

        for _, row in df.iterrows():
            iso_date = _to_iso_date(str(row.iloc[date_idx]))
            if iso_date is None:
                continue
            description = str(row.iloc[desc_idx]).strip()

            amount_cents: int | None = None
            if debit_idx is not None:
                debit_cents = _parse_amount_cents(str(row.iloc[debit_idx]))
                if debit_cents:
                    amount_cents = -abs(debit_cents)
            if amount_cents is None and credit_idx is not None:
                credit_cents = _parse_amount_cents(str(row.iloc[credit_idx]))
                if credit_cents:
                    amount_cents = abs(credit_cents)
            if amount_cents is None and amount_idx is not None:
                amount_cents = _parse_amount_cents(str(row.iloc[amount_idx]))
            if amount_cents is None:
                continue

            out.append(
                ParsedTransaction(
                    external_id="",
                    date=iso_date,
                    amount_cents=amount_cents,
                    description=description,
                )
            )

    if not out:
        raise OcrError("Tabela reconhecida mas nenhuma transação válida extraída")
    return out
