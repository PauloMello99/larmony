import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

// Escrito quando o módulo `statement-import` ainda não existia (débito da
// Fase 1 — ver ADR-0034) — sem controller pra exercitar via HTTP ainda,
// então este teste prova a policy diretamente no nível da conexão RLS
// (`app_user` + request.jwt.claims), reproduzindo o que
// RlsContext.runWithClaims faz por request (database.module.ts). O módulo
// já existe agora (ver test/statement-import-rls.e2e-spec.ts, que cobre o
// mesmo isolamento via HTTP real) — mantido como prova de nível de banco,
// independente de qualquer regressão futura no controller/guard. Prova o
// critério de aceite #6 da spec 16: household A nunca recebe/enxerga
// memória de comerciante do household B.
describe("merchant_category_memory RLS (e2e)", () => {
  let app: INestApplication;
  let admin: Pool;
  let rlsPool: Pool;
  let alice: TestUser;
  let bob: TestUser;
  let householdAlice: string;
  let householdBob: string;
  let categoryAlice: string;
  let categoryBob: string;
  let authIdAlice: string;
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
    admin = adminPool();
    rlsPool = new Pool({
      connectionString:
        process.env["DATABASE_APP_URL"] ?? process.env["DATABASE_URL"],
    });

    alice = await signUpUser(app, "mcm.alice");
    bob = await signUpUser(app, "mcm.bob");

    householdAlice = (
      await authed(app, "post", "/households", alice.accessToken)
        .send({ name: "E2E Lar MCM Alice" })
        .expect(201)
    ).body.id;
    householdBob = (
      await authed(app, "post", "/households", bob.accessToken)
        .send({ name: "E2E Lar MCM Bob" })
        .expect(201)
    ).body.id;

    const catAlice = await admin.query(
      `SELECT id FROM public.categories WHERE household_id = $1 LIMIT 1`,
      [householdAlice],
    );
    const catBob = await admin.query(
      `SELECT id FROM public.categories WHERE household_id = $1 LIMIT 1`,
      [householdBob],
    );
    categoryAlice = catAlice.rows[0].id;
    categoryBob = catBob.rows[0].id;

    const idAlice = await admin.query(
      `SELECT ui.auth_id FROM public.user_identities ui
       JOIN public.users u ON u.id = ui.user_id WHERE u.email = $1`,
      [alice.email],
    );
    const idBob = await admin.query(
      `SELECT ui.auth_id FROM public.user_identities ui
       JOIN public.users u ON u.id = ui.user_id WHERE u.email = $1`,
      [bob.email],
    );
    if (!idAlice.rows[0] || !idBob.rows[0]) {
      throw new Error(
        `user_identities não encontrada — alice=${JSON.stringify(idAlice.rows)} bob=${JSON.stringify(idBob.rows)}`,
      );
    }
    authIdAlice = idAlice.rows[0].auth_id;
    authIdBob = idBob.rows[0].auth_id;
  });

  afterAll(async () => {
    await admin.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(admin);
    await rlsPool.end();
    await admin.end();
    await app.close();
  });

  it("membro do lar grava e lê a própria memória de comerciante", async () => {
    const inserted = await queryAsClaims(
      authIdAlice,
      `INSERT INTO public.merchant_category_memory (household_id, merchant_key, category_id)
       VALUES ($1, 'SUPERMERCADO EXEMPLO LTDA', $2)
       RETURNING id, merchant_key`,
      [householdAlice, categoryAlice],
    );
    expect(inserted).toHaveLength(1);

    const selected = await queryAsClaims<{ merchant_key: string }>(
      authIdAlice,
      `SELECT merchant_key FROM public.merchant_category_memory WHERE household_id = $1`,
      [householdAlice],
    );
    expect(selected.map((r) => r.merchant_key)).toContain("SUPERMERCADO EXEMPLO LTDA");
  });

  it("household B não enxerga (SELECT) memória de comerciante do household A", async () => {
    const selected = await queryAsClaims(
      authIdBob,
      `SELECT * FROM public.merchant_category_memory WHERE household_id = $1`,
      [householdAlice],
    );
    expect(selected).toHaveLength(0);
  });

  it("household B não consegue inserir memória apontando pro household A (WITH CHECK bloqueia)", async () => {
    await expect(
      queryAsClaims(
        authIdBob,
        `INSERT INTO public.merchant_category_memory (household_id, merchant_key, category_id)
         VALUES ($1, 'INVASAO', $2)`,
        [householdAlice, categoryBob],
      ),
    ).rejects.toThrow();
  });

  it("household B grava e lê a própria memória sem ver a de A na mesma query", async () => {
    await queryAsClaims(
      authIdBob,
      `INSERT INTO public.merchant_category_memory (household_id, merchant_key, category_id)
       VALUES ($1, 'PADARIA DO BOB', $2)`,
      [householdBob, categoryBob],
    );

    const bobView = await queryAsClaims<{ merchant_key: string }>(
      authIdBob,
      `SELECT merchant_key FROM public.merchant_category_memory`,
    );
    const keys = bobView.map((r) => r.merchant_key);
    expect(keys).toContain("PADARIA DO BOB");
    expect(keys).not.toContain("SUPERMERCADO EXEMPLO LTDA");
  });
});
