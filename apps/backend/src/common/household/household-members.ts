import { and, eq } from "drizzle-orm";
import type { DrizzleDB } from "../../database/database.module";
import * as schema from "../../database/schema";

/**
 * IDs de todos os membros HABILITADOS do lar — usado para fan-out de
 * notificações (M11: goals, budgets, reports; já existia duplicado em
 * scheduled-transactions). Função pura sobre uma conexão já resolvida pelo
 * caller (DRIZZLE em request context, DRIZZLE_ADMIN em cron) — cada
 * repositório que precisa disto expõe seu próprio método na interface
 * (regra de domain-rules: use-cases nunca importam DRIZZLE direto) e delega
 * para esta função internamente, em vez de duplicar a query.
 */
export async function findHouseholdMemberUserIds(
  db: DrizzleDB,
  householdId: string,
): Promise<string[]> {
  const rows = await db
    .select({ userId: schema.householdMemberships.userId })
    .from(schema.householdMemberships)
    .where(
      and(
        eq(schema.householdMemberships.householdId, householdId),
        eq(schema.householdMemberships.enabled, true),
      ),
    );
  return rows.map((r) => r.userId);
}
