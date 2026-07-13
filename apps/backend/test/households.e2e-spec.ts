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

    // Bootstrap: este arquivo cria VÁRIOS lares com o mesmo `owner` ao longo
    // dos testes (fixtures pré-existentes ao gate de limite do Free, P-2).
    // Concede comp no primeiro lar para destravar as criações seguintes —
    // o teste do LIMITE em si usa um usuário isolado, mais abaixo.
    const bootstrap = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Bootstrap (comp)" })
      .expect(201);
    await pool.query(
      `INSERT INTO public.subscriptions (household_id, type, status, comp_reason)
       VALUES ($1, 'custom', 'active', 'e2e bootstrap — desbloqueia fixtures de households.e2e-spec')
       ON CONFLICT (household_id) DO UPDATE SET type = 'custom', comp_reason = EXCLUDED.comp_reason`,
      [bootstrap.body.id],
    );
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

  it("timezone (M12): default no create, aceito no create e editável no update", async () => {
    // Sem timezone → default do schema.
    const def = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar TZ Default" })
      .expect(201);
    expect(def.body.timezone).toBe("America/Sao_Paulo");
    expect(def.body.notificationHour).toBe(9);

    // Com timezone do navegador.
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar TZ", timezone: "America/New_York" })
      .expect(201);
    expect(created.body.timezone).toBe("America/New_York");

    // Update de fuso + hora reflete no GET.
    await authed(app, "patch", `/households/${created.body.id}`, owner.accessToken)
      .send({ timezone: "Europe/Lisbon", notificationHour: 7 })
      .expect(200);
    const got = await authed(app, "get", `/households/${created.body.id}`, owner.accessToken).expect(200);
    expect(got.body.timezone).toBe("Europe/Lisbon");
    expect(got.body.notificationHour).toBe(7);

    // Fuso inválido → 400 (validação IANA no ValidationPipe global).
    await authed(app, "patch", `/households/${created.body.id}`, owner.accessToken)
      .send({ timezone: "Marte/Olympus_Mons" })
      .expect(400);
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

  it("limite de lares do Free (D-1, P-2): 1º lar ok, 2º bloqueado (402), libera após upgrade", async () => {
    // Usuário isolado — não usa o `owner` compartilhado (já tem comp p/ outros
    // testes deste arquivo; o gate testado aqui é o do plano Free real).
    const solo = await signUpUser(app, "hh.limit");

    const first = await authed(app, "post", "/households", solo.accessToken)
      .send({ name: "E2E Lar Limite 1" })
      .expect(201);

    const blocked = await authed(app, "post", "/households", solo.accessToken)
      .send({ name: "E2E Lar Limite 2" })
      .expect(402);
    expect(blocked.body.code).toBe("HOUSEHOLD_LIMIT_REACHED");

    // Upgrade do 1º lar (comp) libera a criação do 2º.
    await pool.query(
      `INSERT INTO public.subscriptions (household_id, type, status, comp_reason)
       VALUES ($1, 'custom', 'active', 'e2e limite de lares — upgrade')
       ON CONFLICT (household_id) DO UPDATE SET type = 'custom', comp_reason = EXCLUDED.comp_reason`,
      [first.body.id],
    );

    await authed(app, "post", "/households", solo.accessToken)
      .send({ name: "E2E Lar Limite 2" })
      .expect(201);
  });
});
