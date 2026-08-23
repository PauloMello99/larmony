import base64
from pathlib import Path

from fastapi.testclient import TestClient

from statement_processor.main import app

FIXTURES = Path(__file__).parent / "fixtures"
SECRET = "test-secret"


def _csv_request(job_id: str = "job-1") -> dict:
    raw = (FIXTURES / "sample_nubank.csv").read_text(encoding="utf-8")
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
            "categories": [{"code": "ALI", "id": "cat-ali", "name": "Alimentação", "type": "expense"}],
            "merchantMemory": [],
            "householdMembers": [],
        },
    }


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
    import json

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


def test_health_endpoint_does_not_require_secret():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
