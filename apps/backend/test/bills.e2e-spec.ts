import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

describe("Bills (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let categoryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "bill.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Contas" })
      .expect(201);
    householdId = created.body.id;

    const categories = await authed(
      app,
      "get",
      `/households/${householdId}/categories`,
      owner.accessToken,
    ).expect(200);
    categoryId = categories.body.find((c: { name: string }) => c.name === "Moradia").id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("cria uma bill e lista com vencimento calculado", async () => {
    const created = await authed(app, "post", `/households/${householdId}/bills`, owner.accessToken)
      .send({
        name: "Aluguel",
        amountCents: 250000,
        dueDay: 10,
        categoryId,
        reminderDaysBefore: 3,
      })
      .expect(201);

    expect(created.body.name).toBe("Aluguel");
    expect(created.body.isActive).toBe(true);

    const list = await authed(app, "get", `/households/${householdId}/bills`, owner.accessToken).expect(
      200,
    );
    const bill = list.body.find((b: { id: string }) => b.id === created.body.id);
    expect(bill).toBeDefined();
    expect(bill.categoryName).toBe("Moradia");
    expect(typeof bill.daysUntilDue).toBe("number");
    expect(bill.dueDate).toBeTruthy();
  });

  it("edita a bill (inclusive desativar via toggle)", async () => {
    const created = await authed(app, "post", `/households/${householdId}/bills`, owner.accessToken)
      .send({ name: "Internet", amountCents: 12000, dueDay: 15 })
      .expect(201);

    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/bills/${created.body.id}`,
      owner.accessToken,
    )
      .send({ isActive: false, amountCents: 13000 })
      .expect(200);

    expect(updated.body.isActive).toBe(false);
    expect(updated.body.amountCents).toBe(13000);
  });

  it("lança a bill como transação — a bill continua existindo (bills≠transactions)", async () => {
    const bill = await authed(app, "post", `/households/${householdId}/bills`, owner.accessToken)
      .send({ name: "Academia", amountCents: 9900, dueDay: 5, categoryId })
      .expect(201);

    const launched = await authed(
      app,
      "post",
      `/households/${householdId}/bills/${bill.body.id}/launch`,
      owner.accessToken,
    ).expect(201);

    expect(launched.body.type).toBe("expense");
    expect(launched.body.amountCents).toBe(9900);
    expect(launched.body.description).toBe("Academia");
    expect(launched.body.categoryId).toBe(categoryId);

    // A transação aparece na listagem de transactions.
    const transactions = await authed(
      app,
      "get",
      `/households/${householdId}/transactions`,
      owner.accessToken,
    ).expect(200);
    expect(
      transactions.body.items.some((t: { id: string }) => t.id === launched.body.id),
    ).toBe(true);

    // A bill continua existindo (não some, não é consumida).
    const list = await authed(app, "get", `/households/${householdId}/bills`, owner.accessToken).expect(
      200,
    );
    expect(list.body.some((b: { id: string }) => b.id === bill.body.id)).toBe(true);
  });

  it("deleta uma bill", async () => {
    const created = await authed(app, "post", `/households/${householdId}/bills`, owner.accessToken)
      .send({ name: "Descartável", amountCents: 5000, dueDay: 1 })
      .expect(201);

    await authed(
      app,
      "delete",
      `/households/${householdId}/bills/${created.body.id}`,
      owner.accessToken,
    ).expect(204);

    const list = await authed(app, "get", `/households/${householdId}/bills`, owner.accessToken).expect(
      200,
    );
    expect(list.body.find((b: { id: string }) => b.id === created.body.id)).toBeUndefined();
  });

  it("não-membro recebe 403", async () => {
    const stranger = await signUpUser(app, "bill.stranger");
    await authed(app, "get", `/households/${householdId}/bills`, stranger.accessToken).expect(403);
  });
});
