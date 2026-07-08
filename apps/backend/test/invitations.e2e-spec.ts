import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Pool } from "pg";
import { adminPool, authed, cleanupByEmailPattern, createTestApp, signUpUser, TestUser, uniqueEmail } from "./helpers";

describe("Invitations (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let owner: TestUser;
  let householdId: string;

  beforeAll(async () => {
    app = await createTestApp();
    pool = adminPool();
    owner = await signUpUser(app, "inv.owner");
    const created = await authed(app, "post", "/households", owner.accessToken)
      .send({ name: "E2E Lar Convites" })
      .expect(201);
    householdId = created.body.id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM public.households WHERE name LIKE 'E2E %'`);
    await cleanupByEmailPattern(pool);
    await pool.end();
    await app.close();
  });

  async function tokenFor(email: string): Promise<string> {
    const res = await pool.query(
      `SELECT token FROM public.household_invitations
       WHERE household_id = $1 AND email = $2 AND status = 'pending'`,
      [householdId, email],
    );
    return res.rows[0]?.token;
  }

  it("owner convida; convite aparece na lista e no lookup público", async () => {
    const inviteeEmail = uniqueEmail("inv.guest");
    await authed(app, "post", `/households/${householdId}/members/invite`, owner.accessToken)
      .send({ email: inviteeEmail })
      .expect(201);

    const pending = await authed(
      app,
      "get",
      `/households/${householdId}/invitations`,
      owner.accessToken,
    ).expect(200);
    expect(pending.body.map((i: { email: string }) => i.email)).toContain(inviteeEmail);

    const token = await tokenFor(inviteeEmail);
    expect(token).toBeTruthy();

    const lookup = await request(app.getHttpServer())
      .get(`/invitations/lookup?token=${token}`)
      .expect(200);
    expect(lookup.body.email).toBe(inviteeEmail);
  });

  it("convidado aceita e vira member; reuso do token é rejeitado", async () => {
    const invitee = await signUpUser(app, "inv.accept");
    await authed(app, "post", `/households/${householdId}/members/invite`, owner.accessToken)
      .send({ email: invitee.email })
      .expect(201);
    const token = await tokenFor(invitee.email);

    await authed(app, "post", "/invitations/accept", invitee.accessToken)
      .send({ token })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const membership = await pool.query(
      `SELECT hm.role FROM public.household_memberships hm
       JOIN public.users u ON u.id = hm.user_id
       WHERE hm.household_id = $1 AND u.email = $2`,
      [householdId, invitee.email],
    );
    expect(membership.rows[0]?.role).toBe("member");

    await authed(app, "post", "/invitations/accept", invitee.accessToken)
      .send({ token })
      .expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
  });

  it("owner cancela um convite pendente", async () => {
    const email = uniqueEmail("inv.cancel");
    await authed(app, "post", `/households/${householdId}/members/invite`, owner.accessToken)
      .send({ email })
      .expect(201);

    const pending = await authed(
      app,
      "get",
      `/households/${householdId}/invitations`,
      owner.accessToken,
    ).expect(200);
    const inv = pending.body.find((i: { email: string }) => i.email === email);
    expect(inv).toBeTruthy();

    await authed(
      app,
      "delete",
      `/households/${householdId}/invitations/${inv.id}`,
      owner.accessToken,
    ).expect((res) => expect([200, 204]).toContain(res.status));

    const after = await authed(
      app,
      "get",
      `/households/${householdId}/invitations`,
      owner.accessToken,
    ).expect(200);
    expect(after.body.map((i: { email: string }) => i.email)).not.toContain(email);
  });
});
