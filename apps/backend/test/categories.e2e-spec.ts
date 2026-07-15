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

describe("Categories (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "cat.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Categorias" })
      .expect(201);
    householdId = created.body.id;

    // Categorias personalizadas são Family-only (P-4, D-1) — este arquivo
    // testa CRUD de categoria custom, não o gate em si (que tem teste
    // dedicado isolado abaixo). Comp desbloqueia as fixtures existentes.
    await pool.query(
      `INSERT INTO public.subscriptions (household_id, type, status, comp_reason)
       VALUES ($1, 'custom', 'active', 'e2e bootstrap — desbloqueia fixtures de categories.e2e-spec')
       ON CONFLICT (household_id) DO UPDATE SET type = 'custom', comp_reason = EXCLUDED.comp_reason`,
      [householdId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("lista as 13 categorias default semeadas na criação do lar", async () => {
    const res = await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      owner.accessToken,
    ).expect(200);

    expect(res.body).toHaveLength(13);
    expect(res.body.every((c: { isDefault: boolean }) => c.isDefault)).toBe(true);
  });

  it("cria, edita e deleta uma categoria custom", async () => {
    const created = await authed(
      app,
      "post",
      `/households/${householdId}/categories`,
      owner.accessToken,
    )
      .send({ name: "Pets", type: "expense", color: "#a855f7", icon: "PawPrint" })
      .expect(201);

    expect(created.body.isDefault).toBe(false);
    expect(created.body.name).toBe("Pets");

    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/categories/${created.body.id}`,
      owner.accessToken,
    )
      .send({ name: "Pets e Vet" })
      .expect(200);
    expect(updated.body.name).toBe("Pets e Vet");

    await authed(
      app,
      "delete",
      `/households/${householdId}/categories/${created.body.id}`,
      owner.accessToken,
    ).expect(204);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      owner.accessToken,
    ).expect(200);
    expect(list.body.find((c: { id: string }) => c.id === created.body.id)).toBeUndefined();
  });

  it("permite deletar uma categoria default (não é destrutivo para transações)", async () => {
    const list = await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      owner.accessToken,
    ).expect(200);
    const salario = list.body.find((c: { name: string }) => c.name === "Salário");
    expect(salario).toBeDefined();

    await authed(
      app,
      "delete",
      `/households/${householdId}/categories/${salario.id}`,
      owner.accessToken,
    ).expect(204);
  });

  it("não-membro recebe 403 (isolamento por household)", async () => {
    const stranger = await signUpUser(app, "cat.stranger");

    await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      stranger.accessToken,
    ).expect(403);

    await authed(
      app,
      "post",
      `/households/${householdId}/categories`,
      stranger.accessToken,
    )
      .send({ name: "Invasor", type: "expense" })
      .expect(403);
  });

  it("categoria personalizada é Completo-only (M16): Essencial recebe 402 PREMIUM_REQUIRED, liberada no Completo", async () => {
    // Lar Essencial isolado (assinatura ativa, mas tier de entrada — sem a
    // capability custom_categories). Não usa o householdId compartilhado (comp).
    const solo = await signUpUser(app, "cat.limit.owner");
    const solo1 = await authed(app, "post", "/households", solo.accessToken)
      .send({ name: "E2E Lar Categoria Essencial" })
      .expect(201);
    const soloHouseholdId = solo1.body.id;
    await activateHousehold(pool, soloHouseholdId, "essencial");

    const blocked = await authed(
      app,
      "post",
      `/households/${soloHouseholdId}/categories`,
      solo.accessToken,
    )
      .send({ name: "Pets", type: "expense", color: "#a855f7", icon: "PawPrint" })
      .expect(402);
    expect(blocked.body.code).toBe("PREMIUM_REQUIRED");

    // Upgrade para Completo → cria categoria personalizada.
    await activateHousehold(pool, soloHouseholdId, "completo");
    await authed(app, "post", `/households/${soloHouseholdId}/categories`, solo.accessToken)
      .send({ name: "Pets", type: "expense", color: "#a855f7", icon: "PawPrint" })
      .expect(201);

    // Categorias-padrão continuam livres de gate — seed na criação do lar
    // já provou 13 categorias no lar isolado também (mesmo caminho do repo).
    const list = await authed(
      app,
      "get",
      `/households/${soloHouseholdId}/categories`,
      solo.accessToken,
    ).expect(200);
    expect(list.body.filter((c: { isDefault: boolean }) => c.isDefault)).toHaveLength(13);
  });
});
