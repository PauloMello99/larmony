import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

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
});
