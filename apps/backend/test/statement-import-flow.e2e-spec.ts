import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { TelemetryService } from "../src/common/telemetry/telemetry.service";
import {
  STATEMENT_PROCESSOR,
  type IStatementProcessor,
  type SubmitStatementImportJobInput,
} from "../src/modules/statement-import/domain/ports/statement-processor.port";
import {
  activateHousehold,
  adminPool,
  authed,
  cleanupByEmailPattern,
  signUpUser,
  TestUser,
} from "./helpers";

const PROCESSOR_SECRET = process.env["PROCESSOR_SHARED_SECRET"] ?? "";

/**
 * Fluxo completo do import de extrato (ADR-0034/spec 16, Fase 2), com o
 * STATEMENT_PROCESSOR mockado (overrideProvider) — cobre upload → callback →
 * candidatos → confirmação/dismiss → aprendizado de merchant_category_memory
 * → contexto enviado no upload seguinte (critério de aceite #3 da spec 16).
 */
describe("Statement import — fluxo completo (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  const fakeProcessor: jest.Mocked<IStatementProcessor> = { submitJob: jest.fn() };

  let user: TestUser;
  let householdId: string;
  let categoriaAlimentacaoId: string;
  let categoriaMoradiaId: string;

  let jobId1: string;
  let candidateId1: string;
  let jobId2: string;
  let candidateId2: string;
  let jobId4: string;
  let candidateId4: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STATEMENT_PROCESSOR)
      .useValue(fakeProcessor)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
    await app.useBodyParser("json", { limit: "10mb" });
    app.useGlobalFilters(new AllExceptionsFilter(app.get(TelemetryService)));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    pool = adminPool();

    user = await signUpUser(app, "si.flow");
    householdId = (
      await authed(app, "post", "/households", user.accessToken)
        .send({ name: "E2E Lar Statement Import" })
        .expect(201)
    ).body.id;
    await activateHousehold(pool, householdId);

    const catAlimentacao = await pool.query(
      `SELECT id FROM public.categories WHERE household_id = $1 AND name = 'Alimentação'`,
      [householdId],
    );
    const catMoradia = await pool.query(
      `SELECT id FROM public.categories WHERE household_id = $1 AND name = 'Moradia'`,
      [householdId],
    );
    categoriaAlimentacaoId = catAlimentacao.rows[0].id;
    categoriaMoradiaId = catMoradia.rows[0].id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  beforeEach(() => {
    fakeProcessor.submitJob.mockReset();
  });

  it("upload aceito cria job pending e envia o contexto de categorias ao processor", async () => {
    fakeProcessor.submitJob.mockResolvedValueOnce({ accepted: true });

    const res = await authed(app, "post", `/households/${householdId}/statement-imports`, user.accessToken)
      .send({ source: "csv", fileBase64: Buffer.from("qualquer coisa").toString("base64") })
      .expect(201);

    expect(res.body.status).toBe("pending");
    jobId1 = res.body.id;

    const got = await authed(
      app,
      "get",
      `/households/${householdId}/statement-imports/${jobId1}`,
      user.accessToken,
    ).expect(200);
    expect(got.body).toMatchObject({ id: jobId1, status: "pending", source: "csv" });

    expect(fakeProcessor.submitJob).toHaveBeenCalledTimes(1);
    const call = fakeProcessor.submitJob.mock.calls[0][0] as SubmitStatementImportJobInput;
    expect(call.context.categories).toContainEqual(
      expect.objectContaining({
        code: "ALI",
        name: "Alimentação",
        id: categoriaAlimentacaoId,
        type: "expense",
      }),
    );
  });

  it("GET de job inexistente retorna 404", async () => {
    await authed(
      app,
      "get",
      `/households/${householdId}/statement-imports/00000000-0000-0000-0000-000000000000`,
      user.accessToken,
    ).expect(404);
  });

  it("callback de sucesso do processor gera candidato com a categoria real do household", async () => {
    await request(app.getHttpServer())
      .post(`/internal/statement-imports/${jobId1}/callback`)
      .set("x-processor-secret", PROCESSOR_SECRET)
      .send({
        status: "completed",
        transactions: [
          {
            externalId: "ext-1",
            date: "2026-07-01",
            amountCents: 8990,
            type: "expense",
            description: "Compra no débito - SUPERMERCADO EXEMPLO",
            categoryCode: "ALI",
            categoryConfidence: "high",
            resolvedBy: "keyword",
            merchantKey: "SUPERMERCADO EXEMPLO",
          },
        ],
        stats: { total: 1, resolvedByRules: 1, resolvedByLlm: 0, unresolved: 0, processingMs: 10 },
      })
      .expect(200);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/statement-imports/${jobId1}/candidates`,
      user.accessToken,
    ).expect(200);

    expect(list.body).toHaveLength(1);
    candidateId1 = list.body[0].id;
    expect(list.body[0].categoryId).toBe(categoriaAlimentacaoId);

    // ADR-0034: amountCents sempre positivo, direção só em `type` — nunca
    // duplicada no sinal (achado da revisão final: um valor negativo aqui
    // inverteria silenciosamente somas de orçamento/relatório).
    const stored = await pool.query(
      `SELECT amount_cents FROM public.statement_import_candidates WHERE id = $1`,
      [candidateId1],
    );
    expect(stored.rows[0].amount_cents).toBe(8990);
  });

  it("callback com amountCents negativo é rejeitado (job vira failed, não coage com Math.abs())", async () => {
    fakeProcessor.submitJob.mockResolvedValueOnce({ accepted: true });
    const jobId = (
      await authed(app, "post", `/households/${householdId}/statement-imports`, user.accessToken)
        .send({ source: "csv", fileBase64: Buffer.from("extrato invalido").toString("base64") })
        .expect(201)
    ).body.id;

    await request(app.getHttpServer())
      .post(`/internal/statement-imports/${jobId}/callback`)
      .set("x-processor-secret", PROCESSOR_SECRET)
      .send({
        status: "completed",
        transactions: [
          {
            externalId: "ext-invalido",
            date: "2026-07-01",
            amountCents: -100,
            type: "expense",
            description: "Valor inválido",
            categoryCode: null,
            categoryConfidence: null,
            resolvedBy: "unresolved",
            merchantKey: null,
          },
        ],
        stats: { total: 1, resolvedByRules: 0, resolvedByLlm: 0, unresolved: 1, processingMs: 5 },
      })
      .expect(200);

    const job = await pool.query(
      `SELECT status, error_code FROM public.statement_import_jobs WHERE id = $1`,
      [jobId],
    );
    expect(job.rows[0]).toMatchObject({ status: "failed", error_code: "INTERNAL_ERROR" });

    const candidates = await pool.query(
      `SELECT id FROM public.statement_import_candidates WHERE job_id = $1`,
      [jobId],
    );
    expect(candidates.rows).toHaveLength(0);
  });

  it("callback sem secret é bloqueado (401)", async () => {
    await request(app.getHttpServer())
      .post(`/internal/statement-imports/${jobId1}/callback`)
      .send({ status: "completed", transactions: [], stats: {} })
      .expect(401);
  });

  it("callback com secret errado é bloqueado (401)", async () => {
    await request(app.getHttpServer())
      .post(`/internal/statement-imports/${jobId1}/callback`)
      .set("x-processor-secret", "chave-errada")
      .send({ status: "completed", transactions: [], stats: {} })
      .expect(401);
  });

  it("confirmação sem trocar categoria cria a transação e não aprende memória de comerciante", async () => {
    const res = await authed(
      app,
      "post",
      `/households/${householdId}/statement-imports/${jobId1}/candidates/${candidateId1}/confirm`,
      user.accessToken,
    )
      .send({})
      .expect(201);

    const txn = await pool.query(`SELECT id FROM public.transactions WHERE id = $1`, [res.body.id]);
    expect(txn.rows).toHaveLength(1);

    const memory = await pool.query(
      `SELECT id FROM public.merchant_category_memory WHERE household_id = $1 AND merchant_key = $2`,
      [householdId, "SUPERMERCADO EXEMPLO"],
    );
    expect(memory.rows).toHaveLength(0);
  });

  it("segundo candidato sem categoria resolvida, confirmado com categoria escolhida pelo usuário, aprende a memória", async () => {
    fakeProcessor.submitJob.mockResolvedValueOnce({ accepted: true });
    jobId2 = (
      await authed(app, "post", `/households/${householdId}/statement-imports`, user.accessToken)
        .send({ source: "csv", fileBase64: Buffer.from("outro extrato").toString("base64") })
        .expect(201)
    ).body.id;

    await request(app.getHttpServer())
      .post(`/internal/statement-imports/${jobId2}/callback`)
      .set("x-processor-secret", PROCESSOR_SECRET)
      .send({
        status: "completed",
        transactions: [
          {
            externalId: "ext-2",
            date: "2026-07-02",
            amountCents: 3500,
            type: "expense",
            description: "Compra na padaria",
            categoryCode: null,
            categoryConfidence: null,
            resolvedBy: "unresolved",
            merchantKey: "PADARIA NOVA",
          },
        ],
        stats: { total: 1, resolvedByRules: 0, resolvedByLlm: 0, unresolved: 1, processingMs: 5 },
      })
      .expect(200);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/statement-imports/${jobId2}/candidates`,
      user.accessToken,
    ).expect(200);
    expect(list.body).toHaveLength(1);
    candidateId2 = list.body[0].id;
    expect(list.body[0].categoryId).toBeNull();

    await authed(
      app,
      "post",
      `/households/${householdId}/statement-imports/${jobId2}/candidates/${candidateId2}/confirm`,
      user.accessToken,
    )
      .send({ categoryId: categoriaMoradiaId })
      .expect(201);

    const memory = await pool.query(
      `SELECT category_id FROM public.merchant_category_memory WHERE household_id = $1 AND merchant_key = $2`,
      [householdId, "PADARIA NOVA"],
    );
    expect(memory.rows).toHaveLength(1);
    expect(memory.rows[0].category_id).toBe(categoriaMoradiaId);
  });

  it("terceiro upload recebe no contexto a memória de comerciante aprendida no passo anterior", async () => {
    fakeProcessor.submitJob.mockResolvedValueOnce({ accepted: true });
    await authed(app, "post", `/households/${householdId}/statement-imports`, user.accessToken)
      .send({ source: "csv", fileBase64: Buffer.from("terceiro extrato").toString("base64") })
      .expect(201);

    expect(fakeProcessor.submitJob).toHaveBeenCalledTimes(1);
    const call = fakeProcessor.submitJob.mock.calls[0][0] as SubmitStatementImportJobInput;
    expect(call.context.merchantMemory).toContainEqual({
      merchantKey: "PADARIA NOVA",
      categoryCode: "MOR",
    });
  });

  it("dismiss marca o candidato como dismissed (sem virar transação)", async () => {
    fakeProcessor.submitJob.mockResolvedValueOnce({ accepted: true });
    jobId4 = (
      await authed(app, "post", `/households/${householdId}/statement-imports`, user.accessToken)
        .send({ source: "csv", fileBase64: Buffer.from("quarto extrato").toString("base64") })
        .expect(201)
    ).body.id;

    await request(app.getHttpServer())
      .post(`/internal/statement-imports/${jobId4}/callback`)
      .set("x-processor-secret", PROCESSOR_SECRET)
      .send({
        status: "completed",
        transactions: [
          {
            externalId: "ext-4",
            date: "2026-07-04",
            amountCents: 1200,
            type: "expense",
            description: "Lançamento a ser descartado",
            categoryCode: "ALI",
            categoryConfidence: "medium",
            resolvedBy: "keyword",
            merchantKey: "LOJA DESCARTADA",
          },
        ],
        stats: { total: 1, resolvedByRules: 1, resolvedByLlm: 0, unresolved: 0, processingMs: 8 },
      })
      .expect(200);

    const beforeList = await authed(
      app,
      "get",
      `/households/${householdId}/statement-imports/${jobId4}/candidates`,
      user.accessToken,
    ).expect(200);
    candidateId4 = beforeList.body[0].id;

    await authed(
      app,
      "post",
      `/households/${householdId}/statement-imports/${jobId4}/candidates/${candidateId4}/dismiss`,
      user.accessToken,
    ).expect(204);

    const afterList = await authed(
      app,
      "get",
      `/households/${householdId}/statement-imports/${jobId4}/candidates`,
      user.accessToken,
    ).expect(200);
    expect(afterList.body).toHaveLength(1);
    expect(afterList.body[0].status).toBe("dismissed");
  });

  it("payload grande (~200KB base64) não estoura o limite de body (413)", async () => {
    fakeProcessor.submitJob.mockResolvedValueOnce({ accepted: true });
    const fileBase64 = Buffer.alloc(150_000).toString("base64");

    await authed(app, "post", `/households/${householdId}/statement-imports`, user.accessToken)
      .send({ source: "csv", fileBase64 })
      .expect(201);
  });

  it("callback duplicado (mesmo jobId, mesmo body) é idempotente — não duplica candidatos", async () => {
    const body = {
      status: "completed" as const,
      transactions: [
        {
          externalId: "ext-1",
          date: "2026-07-01",
          amountCents: 8990,
          type: "expense" as const,
          description: "Compra no débito - SUPERMERCADO EXEMPLO",
          categoryCode: "ALI",
          categoryConfidence: "high" as const,
          resolvedBy: "keyword",
          merchantKey: "SUPERMERCADO EXEMPLO",
        },
      ],
      stats: { total: 1, resolvedByRules: 1, resolvedByLlm: 0, unresolved: 0, processingMs: 10 },
    };

    await request(app.getHttpServer())
      .post(`/internal/statement-imports/${jobId1}/callback`)
      .set("x-processor-secret", PROCESSOR_SECRET)
      .send(body)
      .expect(200);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/statement-imports/${jobId1}/candidates`,
      user.accessToken,
    ).expect(200);
    expect(list.body).toHaveLength(1);
  });
});
