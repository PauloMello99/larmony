import "dotenv/config";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { TelemetryService } from "../src/common/telemetry/telemetry.service";

/** App Nest real (AppModule inteiro), com o mesmo bootstrap global do main.ts. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // rawBody: mesmo do main.ts — os e2e do webhook do Stripe precisam do
  // req.rawBody para a verificação de assinatura.
  const app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
  // CSV/OFX em base64 (import de extrato, ADR-0034) excede o default de
  // 100kb do body-parser do Express — mesmo ajuste do main.ts.
  app.useBodyParser("json", { limit: "10mb" });
  app.useGlobalFilters(new AllExceptionsFilter(app.get(TelemetryService)));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

/** Pool admin (BYPASSRLS) para seeds/inspeção/cleanup nos testes. */
export function adminPool(): Pool {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL não setada (apps/backend/.env)");
  return new Pool({ connectionString: url });
}

let seq = 0;
/** E-mail único por run+caso (evita colisão entre execuções no mesmo banco). */
export function uniqueEmail(prefix: string): string {
  seq += 1;
  return `${prefix}.${Date.now()}.${seq}@e2e.larmony.local`;
}

export interface TestUser {
  email: string;
  password: string;
  accessToken: string;
  userId: string;
}

/** Cadastra e autentica um usuário de teste; retorna o access token. */
export async function signUpUser(
  app: INestApplication,
  prefix: string,
): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const password = "SenhaForteE2e123!";
  const res = await request(app.getHttpServer())
    .post("/auth/sign-up")
    .send({ name: `E2E ${prefix}`, email, password, termsAccepted: true })
    .expect(201);

  const accessToken: string =
    res.body.session?.accessToken ?? res.body.accessToken;
  const userId: string = res.body.user?.id ?? res.body.id;
  if (!accessToken) throw new Error("sign-up não retornou accessToken");
  return { email, password, accessToken, userId };
}

export function authed(
  app: INestApplication,
  method: "get" | "post" | "patch" | "put" | "delete",
  url: string,
  token: string,
) {
  return request(app.getHttpServer())[method](url).set("Authorization", `Bearer ${token}`);
}

/**
 * Ativa a assinatura de um lar de teste (M16): sem isso o lar nasce `locked`
 * (sem assinatura) e o `ActiveSubscriptionGuard` bloqueia toda escrita com 402.
 * Usa `type='custom'` (comp) — resolve para o tier **completo** sem depender do
 * Stripe, liberando todas as features nos e2e de funcionalidade. Faz upsert
 * porque a linha de subscription é criada lazy (pode não existir ainda).
 * Passe `tier: "essencial"` para simular explicitamente o plano de entrada.
 */
export async function activateHousehold(
  pool: Pool,
  householdId: string,
  tier: "essencial" | "completo" = "completo",
): Promise<void> {
  if (tier === "completo") {
    await pool.query(
      `INSERT INTO public.subscriptions (household_id, type, status, tier, comp_reason)
       VALUES ($1, 'custom', 'active', 'completo', 'e2e-active')
       ON CONFLICT (household_id) DO UPDATE
         SET type = 'custom', status = 'active', tier = 'completo', comp_reason = 'e2e-active'`,
      [householdId],
    );
    return;
  }
  // Essencial: assinatura paga standard/active no tier de entrada (sem features Completo).
  await pool.query(
    `INSERT INTO public.subscriptions (household_id, type, status, tier, stripe_subscription_id, comp_reason)
     VALUES ($1, 'standard', 'active', 'essencial', $2, NULL)
     ON CONFLICT (household_id) DO UPDATE
       SET type = 'standard', status = 'active', tier = 'essencial',
           stripe_subscription_id = EXCLUDED.stripe_subscription_id, comp_reason = NULL`,
    [householdId, `sub_e2e_ess_${householdId.slice(0, 8)}`],
  );
}

/**
 * Remove os usuários de e2e criados (auth + public via DELETE /auth/me exige
 * token; aqui limpamos via SQL admin + admin API do GoTrue não é necessária —
 * o e-mail único evita colisão; a limpeza é best-effort do public.users, e o
 * cascade das FKs (memberships/households órfãos) é coberto pelo teste).
 */
export async function cleanupByEmailPattern(pool: Pool): Promise<void> {
  await pool.query(
    `DELETE FROM public.users WHERE email LIKE '%@e2e.larmony.local'`,
  );
}
