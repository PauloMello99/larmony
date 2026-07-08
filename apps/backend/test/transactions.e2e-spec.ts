import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

describe("Transactions (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let categoryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "tx.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Transacoes" })
      .expect(201);
    householdId = created.body.id;

    const categories = await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      owner.accessToken,
    ).expect(200);
    categoryId = categories.body.find(
      (c: { name: string }) => c.name === "Alimentação",
    ).id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("cria uma transação e ela aparece na listagem com categoria resolvida", async () => {
    const created = await authed(
      app,
      "post",
      `/households/${householdId}/transactions`,
      owner.accessToken,
    )
      .send({
        type: "expense",
        amountCents: 5000,
        description: "Supermercado",
        date: "2026-07-05",
        categoryId,
      })
      .expect(201);

    expect(created.body.amountCents).toBe(5000);

    // createdBy deve ser o public.users.id interno (FK), não o auth id.
    const internalUser = await pool.query(
      `SELECT id FROM public.users WHERE email = $1`,
      [owner.email],
    );
    expect(created.body.createdBy).toBe(internalUser.rows[0].id);
    expect(created.body.personId).toBe(internalUser.rows[0].id);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/transactions`,
      owner.accessToken,
    ).expect(200);

    const item = list.body.items.find((t: { id: string }) => t.id === created.body.id);
    expect(item).toBeDefined();
    expect(item.categoryName).toBe("Alimentação");
    expect(item.personName).toBeTruthy();
  });

  it("filtra por mês e por tipo", async () => {
    await authed(app, "post", `/households/${householdId}/transactions`, owner.accessToken)
      .send({ type: "income", amountCents: 200000, description: "Salário", date: "2026-06-10" })
      .expect(201);

    const juneExpenses = await authed(
      app,
      "get",
      `/households/${householdId}/transactions?month=6&year=2026&type=income`,
      owner.accessToken,
    ).expect(200);

    expect(juneExpenses.body.items.length).toBeGreaterThanOrEqual(1);
    expect(
      juneExpenses.body.items.every((t: { type: string }) => t.type === "income"),
    ).toBe(true);
  });

  it("edita e deleta uma transação", async () => {
    const created = await authed(
      app,
      "post",
      `/households/${householdId}/transactions`,
      owner.accessToken,
    )
      .send({ type: "expense", amountCents: 1000, description: "Café", date: "2026-07-01" })
      .expect(201);

    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/transactions/${created.body.id}`,
      owner.accessToken,
    )
      .send({ amountCents: 1500 })
      .expect(200);
    expect(updated.body.amountCents).toBe(1500);

    await authed(
      app,
      "delete",
      `/households/${householdId}/transactions/${created.body.id}`,
      owner.accessToken,
    ).expect(204);
  });

  it("deletar a categoria vinculada não quebra a transação (categoryId vira null)", async () => {
    const customCategory = await authed(
      app,
      "post",
      `/households/${householdId}/categories`,
      owner.accessToken,
    )
      .send({ name: "E2E Categoria Descartável", type: "expense" })
      .expect(201);

    const tx = await authed(
      app,
      "post",
      `/households/${householdId}/transactions`,
      owner.accessToken,
    )
      .send({
        type: "expense",
        amountCents: 3000,
        description: "Vinculada a categoria descartável",
        date: "2026-07-02",
        categoryId: customCategory.body.id,
      })
      .expect(201);

    await authed(
      app,
      "delete",
      `/households/${householdId}/categories/${customCategory.body.id}`,
      owner.accessToken,
    ).expect(204);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/transactions`,
      owner.accessToken,
    ).expect(200);
    const item = list.body.items.find((t: { id: string }) => t.id === tx.body.id);
    expect(item.categoryId).toBeNull();
    expect(item.categoryName).toBeNull();
  });

  it("não-membro recebe 403", async () => {
    const stranger = await signUpUser(app, "tx.stranger");

    await authed(
      app,
      "get",
      `/households/${householdId}/transactions`,
      stranger.accessToken,
    ).expect(403);
  });
});
