import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Pool } from "pg";
import {
  activateHousehold,
  adminPool,
  authed,
  cleanupByEmailPattern,
  createTestApp,
  signUpUser,
  TestUser,
} from "./helpers";

/**
 * Reconciliação de timeout do statement-import (ADR-0034) plugada no tick do
 * internal-cron via StatementImportReconciliationJob. Job "csv"/"ofx" tem
 * deadline de 30s — usamos 2 minutos de atraso pra folga generosa contra flake.
 */
describe("Statement import — reconciliação de timeout via cron (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let user: TestUser;
  let householdId: string;
  const secret = process.env["CRON_SECRET"] ?? "";

  function tick() {
    return request(app.getHttpServer()).post("/internal/cron/tick").set("x-cron-secret", secret);
  }

  async function createPendingJob(): Promise<string> {
    const res = await authed(app, "post", `/households/${householdId}/statement-imports`, user.accessToken)
      .send({ source: "csv", fileBase64: Buffer.from("extrato cron").toString("base64") })
      .expect(201);
    const jobId: string = res.body.id;
    await pool.query(`UPDATE public.statement_import_jobs SET status = 'pending' WHERE id = $1`, [jobId]);
    return jobId;
  }

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    user = await signUpUser(app, "si.cron");
    householdId = (
      await authed(app, "post", "/households", user.accessToken)
        .send({ name: "E2E Lar SI Cron" })
        .expect(201)
    ).body.id;
    await activateHousehold(pool, householdId);
  }, 30000);

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("job pending com created_at 2 minutos no passado é marcado failed/TIMEOUT no tick", async () => {
    const jobId = await createPendingJob();
    await pool.query(
      `UPDATE public.statement_import_jobs SET created_at = now() - interval '2 minutes' WHERE id = $1`,
      [jobId],
    );

    await tick().expect(200);

    const res = await pool.query(
      `SELECT status, error_code FROM public.statement_import_jobs WHERE id = $1`,
      [jobId],
    );
    expect(res.rows[0].status).toBe("failed");
    expect(res.rows[0].error_code).toBe("TIMEOUT");
  }, 30000);

  it("job pending recém-criado não é varrido pelo mesmo tick (sweep não é agressivo demais)", async () => {
    const jobId = await createPendingJob();

    await tick().expect(200);

    const res = await pool.query(`SELECT status FROM public.statement_import_jobs WHERE id = $1`, [jobId]);
    expect(res.rows[0].status).toBe("pending");
  }, 30000);
});
