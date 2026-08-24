import base64
import json
from pathlib import Path

from fastapi.testclient import TestClient

from statement_processor.main import app
from statement_processor.rules.llm_fallback import _GROQ_URL

FIXTURES = Path(__file__).parent / "fixtures"
SECRET = "test-secret"


def _csv_request(job_id: str = "job-1", categories: list[dict] | None = None) -> dict:
    raw = (FIXTURES / "sample_nubank.csv").read_text(encoding="utf-8")
    if categories is None:
        categories = [
            {"code": "ALI", "id": "cat-ali", "name": "Alimentação", "type": "expense"}
        ]
    return {
        "jobId": job_id,
        "householdId": "household-1",
        "source": "csv",
        "file": {
            "encoding": "base64",
            "data": base64.b64encode(raw.encode("utf-8")).decode("ascii"),
        },
        "callbackUrl": "https://backend.example.com/internal/statement-imports/job-1/callback",
        "context": {
            "categories": categories,
            "merchantMemory": [],
            "householdMembers": [],
        },
    }


def _groq_envelope(items: list[dict]) -> dict:
    return {"choices": [{"message": {"content": json.dumps({"items": items})}}]}


def test_jobs_endpoint_rejects_missing_secret():
    client = TestClient(app)
    res = client.post("/jobs", json=_csv_request())
    assert res.status_code == 401


def test_jobs_endpoint_accepts_and_runs_callback(httpx_mock):
    # fx-0005 tem CNPJ na descrição — o pipeline sempre tenta a camada 3;
    # mockamos com um CNAE genérico (sem regra de mapeamento) pra manter a
    # transação unresolved sem depender de rede real neste teste.
    httpx_mock.add_response(
        url="https://brasilapi.com.br/api/cnpj/v1/11222333000144",
        json={
            "cnae_fiscal_descricao": "Atividades de consultoria em gestão empresarial",
            "razao_social": "EMPRESA TESTE ENERGIA LTDA",
        },
    )
    # conftest.py sempre define GROQ_API_KEY de teste, então as 2 transações
    # que sobram unresolved acionam de fato a camada 6 -- mocka a Groq com
    # uma resposta vazia (não resolve nada) só pra não deixar uma request
    # real sem mock registrado; as asserções de resolved_by abaixo continuam
    # exatamente as mesmas de antes da Fase 4.
    httpx_mock.add_response(url=_GROQ_URL, json=_groq_envelope([]))
    httpx_mock.add_response(
        url="https://backend.example.com/internal/statement-imports/job-1/callback",
        method="POST",
        json={"ok": True},
    )

    client = TestClient(app)
    res = client.post(
        "/jobs", json=_csv_request(), headers={"x-processor-secret": SECRET}
    )

    assert res.status_code == 202
    assert res.json() == {"jobId": "job-1", "status": "accepted"}

    callback_requests = httpx_mock.get_requests(
        url="https://backend.example.com/internal/statement-imports/job-1/callback"
    )
    assert len(callback_requests) == 1
    body = callback_requests[0].read()
    payload = json.loads(body)
    assert payload["status"] == "completed"
    assert payload["stats"]["total"] == 5
    # 2 das 5 são resolvidas por regra estrutural sem categoria (saldo
    # compartilhado + fatura), 1 por keyword (supermercado) — o resto
    # (pessoa física, empresa sem keyword) fica unresolved nesta Fase 1
    # sem CNPJ mockado.
    resolved_by = [t["resolvedBy"] for t in payload["transactions"]]
    assert resolved_by.count("structural") == 2
    assert resolved_by.count("keyword") == 1


def test_jobs_endpoint_resolves_residual_via_llm_fallback(httpx_mock):
    # Mesmas 5 transações do fixture, mas o vocabulário do household ganha
    # um código extra ("OUT") que nenhuma camada 1-4 atribui -- só a Groq
    # "escolhe" ele pra uma das transações que ficariam unresolved.
    httpx_mock.add_response(
        url="https://brasilapi.com.br/api/cnpj/v1/11222333000144",
        json={
            "cnae_fiscal_descricao": "Atividades de consultoria em gestão empresarial",
            "razao_social": "EMPRESA TESTE ENERGIA LTDA",
        },
    )
    httpx_mock.add_response(
        url=_GROQ_URL,
        json=_groq_envelope([{"index": 0, "categoryCode": "OUT"}]),
    )
    httpx_mock.add_response(
        url="https://backend.example.com/internal/statement-imports/job-1/callback",
        method="POST",
        json={"ok": True},
    )

    categories = [
        {"code": "ALI", "id": "cat-ali", "name": "Alimentação", "type": "expense"},
        {"code": "OUT", "id": "cat-out", "name": "Outros", "type": "expense"},
    ]
    client = TestClient(app)
    res = client.post(
        "/jobs",
        json=_csv_request(categories=categories),
        headers={"x-processor-secret": SECRET},
    )

    assert res.status_code == 202

    callback_requests = httpx_mock.get_requests(
        url="https://backend.example.com/internal/statement-imports/job-1/callback"
    )
    assert len(callback_requests) == 1
    payload = json.loads(callback_requests[0].read())

    resolved_by = [t["resolvedBy"] for t in payload["transactions"]]
    assert resolved_by.count("llm_fallback") >= 1
    assert payload["stats"]["resolvedByLlm"] >= 1


def test_health_endpoint_does_not_require_secret():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
