import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

describe("Households (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "hh.owner");
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("cria o lar como owner e semeia as 13 categorias default", async () => {
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Principal" })
      .expect(201);

    expect(created.body.role).toBe("owner");
    expect(created.body.slug).toBeTruthy();

    const categories = await pool.query(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE is_default)::int AS defaults
       FROM public.categories WHERE household_id = $1`,
      [created.body.id],
    );
    expect(categories.rows[0]).toEqual({ n: 13, defaults: 13 });
  });

  it("lista e resolve por slug", async () => {
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Slug" })
      .expect(201);

    const list = await authed(app, "get", "/households", owner.accessToken).expect(200);
    expect(list.body.map((h: { id: string }) => h.id)).toContain(created.body.id);

    const bySlug = await authed(
      app,
      "get",
      `/households/by-slug/${created.body.slug}`,
      owner.accessToken,
    ).expect(200);
    expect(bySlug.body.id).toBe(created.body.id);
  });

  it("update é owner-only: member recebe 403", async () => {
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Update" })
      .expect(201);

    await authed(app, "patch", `/households/${created.body.id}`, owner.accessToken)
      .send({ name: "E2E Lar Renomeado" })
      .expect(200);

    // Segundo usuário vira member direto via SQL (o fluxo de convite tem spec própria).
    const member = await signUpUser(app, "hh.member");
    await pool.query(
      `INSERT INTO public.household_memberships (household_id, user_id, role)
       SELECT $1, u.id, 'member' FROM public.users u WHERE u.email = $2`,
      [created.body.id, member.email],
    );

    await authed(app, "patch", `/households/${created.body.id}`, member.accessToken)
      .send({ name: "Tentativa do member" })
      .expect(403);
  });

  it("delete pelo owner remove o lar e cascateia categorias", async () => {
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Delete" })
      .expect(201);

    await authed(app, "delete", `/households/${created.body.id}`, owner.accessToken).expect(
      (res) => expect([200, 204]).toContain(res.status),
    );

    const categories = await pool.query(
      `SELECT count(*)::int AS n FROM public.categories WHERE household_id = $1`,
      [created.body.id],
    );
    expect(categories.rows[0].n).toBe(0);
  });
});
