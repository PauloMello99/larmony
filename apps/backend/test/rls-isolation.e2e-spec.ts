import { INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser } from "./helpers";

describe("Isolamento entre lares (RLS + guards) (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let alice: TestUser;
  let bob: TestUser;
  let larAlice: { id: string; slug: string };
  let larBob: { id: string; slug: string };

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    alice = await signUpUser(app, "rls.alice");
    bob = await signUpUser(app, "rls.bob");
    larAlice = (
      await authed(app, "post", "/households", alice.accessToken)
        .send({ name: "E2E Lar Alice" })
        .expect(201)
    ).body;
    larBob = (
      await authed(app, "post", "/households", bob.accessToken)
        .send({ name: "E2E Lar Bob" })
        .expect(201)
    ).body;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  it("a lista de lares não vaza lares alheios", async () => {
    const list = await authed(app, "get", "/households", alice.accessToken).expect(200);
    const ids = list.body.map((h: { id: string }) => h.id);
    expect(ids).toContain(larAlice.id);
    expect(ids).not.toContain(larBob.id);
  });

  it("acesso direto a lar alheio é bloqueado (403/404 — sem vazamento)", async () => {
    // 404 também é aceitável: o RLS faz o registro "não existir" para quem não é membro.
    const blocked = (res: { status: number }) =>
      expect([403, 404]).toContain(res.status);
    await authed(app, "get", `/households/${larBob.id}`, alice.accessToken).expect(blocked);
    await authed(app, "get", `/households/${larBob.id}/members`, alice.accessToken).expect(blocked);
    await authed(app, "patch", `/households/${larBob.id}`, alice.accessToken)
      .send({ name: "Invasão" })
      .expect(blocked);
  });

  it("resolver lar alheio por slug também é bloqueado", async () => {
    await authed(app, "get", `/households/by-slug/${larBob.slug}`, alice.accessToken).expect(
      (res) => expect([403, 404]).toContain(res.status),
    );
  });
});
