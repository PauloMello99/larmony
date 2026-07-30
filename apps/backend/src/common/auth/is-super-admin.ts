import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../../database/database.module";
import * as schema from "../../database/schema";

/**
 * True se o usuário (por auth_id de QUALQUER identidade vinculada — senha,
 * Google, Apple) tem `platform_role = 'super_admin'`.
 *
 * Usado no **caminho de miss** dos guards e do repo de household (quando não há
 * membership): o super_admin pode agir como owner de qualquer lar. Não
 * roda no caminho do membro comum, então não adiciona custo ao fluxo normal.
 * Recebe a conexão do chamador (tipicamente `DRIZZLE_ADMIN`, pois roda antes do
 * RlsInterceptor ou em contexto cross-household).
 */
export async function isSuperAdmin(
  db: DrizzleDB,
  authId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ platformRole: schema.users.platformRole })
    .from(schema.users)
    .innerJoin(
      schema.userIdentities,
      eq(schema.userIdentities.userId, schema.users.id),
    )
    .where(eq(schema.userIdentities.authId, authId))
    .limit(1);
  return row?.platformRole === "super_admin";
}
