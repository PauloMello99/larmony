import { INestApplication } from "@nestjs/common";
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
 * Isolamento entre lares do módulo statement-import (ADR-0034): guard de
 * membership + RLS por household_id nas tabelas statement_import_jobs/
 * statement_import_candidates. O STATEMENT_PROCESSOR real (HttpStatementProcessor)
 * não é mockado aqui — o handshake síncrono falha (STATEMENT_PROCESSOR_URL não
 * responde de verdade nos e2e), então o job criado no beforeAll nasce
 * `status: "failed"` (markFailedSync); o que importa pra este spec é a linha
 * existir com o household_id/job_id corretos, não o resultado do upload.
 */
describe("Statement import — isolamento entre lares (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let rlsPool: Pool;
  let alice: TestUser;
  let bob: TestUser;
  let householdAlice: string;
  let householdBob: string;
  let categoryAlice: string;
  let jobIdAlice: string;
  let authIdBob: string;

  async function queryAsClaims<T = unknown>(authId: string, sql: string, params: unknown[] = []) {
    const client = await rlsPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: authId, role: "authenticated" }),
      ]);
      const result = await client.query<T>(sql, params);
      await client.query("COMMIT");
      return result.rows;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    rlsPool = new Pool({
      connectionString: process.env["DATABASE_APP_URL"] ?? process.env["DATABASE_URL"],
    });

    alice = await signUpUser(app, "si.rls.alice");
    bob = await signUpUser(app, "si.rls.bob");

    householdAlice = (
      await authed(app, "post", "/households", alice.accessToken)
        .send({ name: "E2E Lar SI Alice" })
        .expect(201)
    ).body.id;
    householdBob = (
      await authed(app, "post", "/households", bob.accessToken)
        .send({ name: "E2E Lar SI Bob" })
        .expect(201)
    ).body.id;

    await activateHousehold(pool, householdAlice);
    await activateHousehold(pool, householdBob);

    const catAlice = await pool.query(
      `SELECT id FROM public.categories WHERE household_id = $1 LIMIT 1`,
      [householdAlice],
    );
    categoryAlice = catAlice.rows[0].id;

    jobIdAlice = (
      await authed(app, "post", `/households/${householdAlice}/statement-imports`, alice.accessToken)
        .send({ source: "csv", fileBase64: Buffer.from("extrato alice").toString("base64") })
        .expect(201)
    ).body.id;

    const idBob = await pool.query(
      `SELECT ui.auth_id FROM public.user_identities ui
       JOIN public.users u ON u.id = ui.user_id WHERE u.email = $1`,
      [bob.email],
    );
    if (!idBob.rows[0]) {
      throw new Error(`user_identities não encontrada para bob — ${JSON.stringify(idBob.rows)}`);
    }
    authIdBob = idBob.rows[0].auth_id;
  }, 30000);

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await rlsPool.end();
    await pool.end();
    await app.close();
  });

  it("Bob listando candidatos de um job da Alice pela URL do próprio lar recebe lista vazia (sem vazamento)", async () => {
    const res = await authed(
      app,
      "get",
      `/households/${householdBob}/statement-imports/${jobIdAlice}/candidates`,
      bob.accessToken,
    ).expect(200);

    expect(res.body).toEqual([]);
  });

  it("Bob confirmando um candidato da Alice (seed direto via admin) recebe 404 — findById não acha por household_id", async () => {
    const inserted = await pool.query(
      `INSERT INTO public.statement_import_candidates
         (job_id, household_id, external_id, date, amount_cents, type, description, category_id, category_confidence, resolved_by, merchant_key)
       VALUES ($1, $2, 'ext-rls-1', '2026-07-05', -1000, 'expense', 'Candidato da Alice', $3, 'high', 'keyword', 'MERCADO RLS')
       RETURNING id`,
      [jobIdAlice, householdAlice, categoryAlice],
    );
    const candidateIdAlice: string = inserted.rows[0].id;

    await authed(
      app,
      "post",
      `/households/${householdBob}/statement-imports/${jobIdAlice}/candidates/${candidateIdAlice}/confirm`,
      bob.accessToken,
    )
      .send({})
      .expect(404);
  });

  it("Bob autenticado não consegue INSERT direto em statement_import_candidates apontando household_id da Alice (RLS WITH CHECK bloqueia)", async () => {
    // Prova o isolamento de tenant no nível de RLS (não só na camada de
    // aplicação). Não cobre o caso household_id=próprio + job_id de outro lar —
    // a policy WITH CHECK só valida is_household_member(household_id), e não
    // há FK composta (household_id, job_id) em statement_import_candidates;
    // esse gap está documentado (achado do database-guardian) e é risco
    // aceito nesta fase, não algo a resolver neste spec.
    await expect(
      queryAsClaims(
        authIdBob,
        `INSERT INTO public.statement_import_candidates
           (job_id, household_id, external_id, date, amount_cents, type, description, resolved_by)
         VALUES ($1, $2, 'ext-rls-invasao', '2026-07-05', -1000, 'expense', 'Invasão', 'keyword')`,
        [jobIdAlice, householdAlice],
      ),
    ).rejects.toThrow();
  });
});
