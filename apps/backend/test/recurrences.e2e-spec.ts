import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

/** ISO (yyyy-MM-dd) deslocado `days` a partir de hoje. */
function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Recorrência (M9): CRUD + engine no tick do cron. O engine gera transações
 * das regras vencidas materializando ocorrência a ocorrência, avança o cursor
 * ANTES de inserir (idempotente sob ticks repetidos) e encerra a série no fim.
 */
describe("Recurrences (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  let categoryId: string;
  const secret = process.env["CRON_SECRET"] ?? "";

  function tick() {
    return request(app.getHttpServer())
      .post("/internal/cron/tick")
      .set("x-cron-secret", secret);
  }

  /** Cursor/fim de uma regra direto no banco (admin) — simula ticks perdidos. */
  async function setSchedule(id: string, nextRunDate: string, endDate?: string) {
    await pool.query(
      `UPDATE public.recurrences SET next_run_date = $2, end_date = $3 WHERE id = $1`,
      [id, nextRunDate, endDate ?? null],
    );
  }

  async function generatedFor(recurrenceId: string) {
    const res = await pool.query(
      `SELECT count(*)::int AS n FROM public.transactions WHERE recurrence_id = $1`,
      [recurrenceId],
    );
    return res.rows[0].n as number;
  }

  async function ruleRow(id: string) {
    // next_run_date::text → string ISO (o driver pg devolve DATE como Date).
    const res = await pool.query(
      `SELECT is_active, next_run_date::text AS next_run_date FROM public.recurrences WHERE id = $1`,
      [id],
    );
    return res.rows[0] as { is_active: boolean; next_run_date: string };
  }

  async function createRule(body: Record<string, unknown>) {
    const res = await authed(app, "post", `/households/${householdId}/recurrences`, owner.accessToken)
      .send(body)
      .expect(201);
    return res.body as { id: string };
  }

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "recurrence.owner");

    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Recorrencia" })
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

  // ─── CRUD ───

  it("cria uma recorrência e lista com nome de categoria resolvido", async () => {
    const created = await createRule({
      type: "expense",
      amountCents: 4990,
      description: "Streaming",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
      categoryId,
    });

    expect(created.id).toBeDefined();

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/recurrences`,
      owner.accessToken,
    ).expect(200);
    const rule = list.body.find((r: { id: string }) => r.id === created.id);
    expect(rule).toBeDefined();
    expect(rule.categoryName).toBe("Moradia");
    expect(rule.frequency).toBe("monthly");
    expect(rule.interval).toBe(1);
    expect(rule.isActive).toBe(true);
    expect(rule.nextRunDate).toBe(rule.startDate);
  });

  it("rejeita startDate no passado (422)", async () => {
    await authed(app, "post", `/households/${householdId}/recurrences`, owner.accessToken)
      .send({
        type: "income",
        amountCents: 100000,
        description: "Salário retroativo",
        frequency: "monthly",
        startDate: isoDaysFromNow(-1),
      })
      .expect(422);
  });

  it("rejeita endDate anterior ao startDate (422)", async () => {
    await authed(app, "post", `/households/${householdId}/recurrences`, owner.accessToken)
      .send({
        type: "expense",
        amountCents: 5000,
        description: "Janela inválida",
        frequency: "monthly",
        startDate: isoDaysFromNow(10),
        endDate: isoDaysFromNow(5),
      })
      .expect(422)
  })

  it("edita a recorrência (valor + desativar via toggle)", async () => {
    const created = await createRule({
      type: "expense",
      amountCents: 3000,
      description: "Academia",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
    });

    const updated = await authed(
      app,
      "patch",
      `/households/${householdId}/recurrences/${created.id}`,
      owner.accessToken,
    )
      .send({ amountCents: 3500, isActive: false })
      .expect(200);

    expect(updated.body.amountCents).toBe(3500);
    expect(updated.body.isActive).toBe(false);
  });

  it("deleta uma recorrência", async () => {
    const created = await createRule({
      type: "expense",
      amountCents: 1000,
      description: "Descartável",
      frequency: "weekly",
      startDate: isoDaysFromNow(0),
    });

    await authed(
      app,
      "delete",
      `/households/${householdId}/recurrences/${created.id}`,
      owner.accessToken,
    ).expect(204);

    const list = await authed(
      app,
      "get",
      `/households/${householdId}/recurrences`,
      owner.accessToken,
    ).expect(200);
    expect(list.body.find((r: { id: string }) => r.id === created.id)).toBeUndefined();
  });

  it("não-membro recebe 403", async () => {
    const stranger = await signUpUser(app, "recurrence.stranger");
    await authed(app, "get", `/households/${householdId}/recurrences`, stranger.accessToken).expect(403);
  });

  // ─── Engine ───

  it("tick lista o job recurrence-engine com status ok", async () => {
    const res = await tick().expect(200);
    expect(res.body.ok).toBe(true);
    const names = res.body.jobs.map((j: { name: string }) => j.name);
    expect(names).toContain("recurrence-engine");
    for (const job of res.body.jobs) expect(job.status).toBe("ok");
  });

  it("gera a transação da ocorrência vencida e NÃO duplica no tick seguinte", async () => {
    const rule = await createRule({
      type: "income",
      amountCents: 500000,
      description: "Salário",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
      categoryId,
    });
    // Simula ocorrência vencida (cursor 3 dias atrás).
    await setSchedule(rule.id, isoDaysFromNow(-3));

    await tick().expect(200);
    expect(await generatedFor(rule.id)).toBe(1);

    // Cursor avançou 1 mês → agora no futuro (não vence de novo hoje).
    const after = await ruleRow(rule.id);
    expect(after.next_run_date > isoDaysFromNow(0)).toBe(true);

    // A transação gerada carrega o recurrence_id e aparece na listagem.
    const list = await authed(
      app,
      "get",
      `/households/${householdId}/transactions?limit=100&offset=0`,
      owner.accessToken,
    ).expect(200);
    const generated = list.body.items.find(
      (t: { recurrenceId: string | null }) => t.recurrenceId === rule.id,
    );
    expect(generated).toBeDefined();
    expect(generated.type).toBe("income");
    expect(generated.amountCents).toBe(500000);

    // Tick repetido → nenhuma nova transação.
    await tick().expect(200);
    expect(await generatedFor(rule.id)).toBe(1);
  });

  it("faz catch-up de múltiplas ocorrências perdidas num único tick", async () => {
    const rule = await createRule({
      type: "expense",
      amountCents: 2000,
      description: "Mesada semanal",
      frequency: "weekly",
      startDate: isoDaysFromNow(0),
    });
    // 20 dias atrás, semanal → ocorrências em -20, -13, -6 (o +1 é futuro).
    await setSchedule(rule.id, isoDaysFromNow(-20));

    await tick().expect(200);
    expect(await generatedFor(rule.id)).toBe(3);
    expect((await ruleRow(rule.id)).next_run_date > isoDaysFromNow(0)).toBe(true);
  });

  it("encerra a série (isActive=false) ao ultrapassar o endDate, sem gerar", async () => {
    const rule = await createRule({
      type: "expense",
      amountCents: 1500,
      description: "Promoção temporária",
      frequency: "monthly",
      startDate: isoDaysFromNow(0),
    });
    // Cursor vencido mas depois do fim da série → encerra sem gerar.
    await setSchedule(rule.id, isoDaysFromNow(-1), isoDaysFromNow(-5));

    await tick().expect(200);
    expect(await generatedFor(rule.id)).toBe(0);
    expect((await ruleRow(rule.id)).is_active).toBe(false);
  });
});
