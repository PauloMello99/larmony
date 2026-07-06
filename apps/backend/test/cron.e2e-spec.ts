import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

/**
 * Fluxo do cron + reminders (fatia M7): job registrado no tick, disparo na
 * janela e NÃO-duplicação por contexto (bill×mês) — validada pelos efeitos
 * reais no banco (notificações in-app + reminder_last_sent_at).
 */
describe("Cron / send-bill-reminders (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;
  const secret = process.env["CRON_SECRET"] ?? "";

  function tick() {
    return request(app.getHttpServer())
      .post("/internal/cron/tick")
      .set("x-cron-secret", secret);
  }

  async function notificationCount(): Promise<number> {
    const res = await pool.query(
      `SELECT count(*)::int AS n FROM public.notifications n
       JOIN public.users u ON u.id = n.user_id
       WHERE n.type = 'bill_reminder' AND u.email LIKE '%@e2e.larmony.local'`,
    );
    return res.rows[0].n;
  }

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "cron.owner");
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Cron" })
      .expect(201);
    householdId = created.body.id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("tick sem secret é bloqueado (401)", async () => {
    await request(app.getHttpServer()).post("/internal/cron/tick").expect(401);
  });

  it("tick lista o job send-bill-reminders com status ok", async () => {
    const res = await tick().expect(200);
    expect(res.body.ok).toBe(true);
    const names = res.body.jobs.map((j: { name: string }) => j.name);
    expect(names).toContain("send-bill-reminders");
    for (const job of res.body.jobs) expect(job.status).toBe("ok");
  });

  it("dispara o lembrete na janela e NÃO duplica no tick seguinte (dedup bill×mês)", async () => {
    // Bill vencendo em 3 dias com lembrete de 3 dias → janela exata hoje.
    const due = new Date();
    due.setDate(due.getDate() + 3);
    await pool.query(
      `INSERT INTO public.bills (household_id, name, amount_cents, due_day, is_active, reminder_days_before)
       VALUES ($1, 'E2E Conta de Luz', 12345, $2, true, 3)`,
      [householdId, due.getDate()],
    );

    const before = await notificationCount();

    await tick().expect(200);
    const afterFirst = await notificationCount();
    expect(afterFirst).toBe(before + 1); // 1 membro (owner) → 1 notificação

    const marked = await pool.query(
      `SELECT reminder_last_sent_at FROM public.bills
       WHERE household_id = $1 AND name = 'E2E Conta de Luz'`,
      [householdId],
    );
    expect(marked.rows[0].reminder_last_sent_at).not.toBeNull();

    // Tick repetido no mesmo mês → nenhum novo envio.
    await tick().expect(200);
    const afterSecond = await notificationCount();
    expect(afterSecond).toBe(afterFirst);
  });
});
