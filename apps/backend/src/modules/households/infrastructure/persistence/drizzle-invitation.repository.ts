import { Inject, Injectable } from "@nestjs/common";
import { eq, and, sql } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  IInvitationRepository,
  CreateInvitationData,
  InvitationWithHousehold,
} from "../../domain/invitation.repository.interface";
import type { InvitationEntity } from "../../domain/invitation.entity";
import { InvitationMapper } from "./invitation.mapper";

@Injectable()
export class DrizzleInvitationRepository implements IInvitationRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // findByToken/markAccepted rodam antes de o usuário ser membro → bypass RLS.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async create(data: CreateInvitationData): Promise<InvitationEntity> {
    const inserted = await this.db
      .insert(schema.householdInvitations)
      .values({
        householdId: data.householdId,
        invitedBy: data.invitedBy,
        email: data.email,
        role: data.role,
      })
      .onConflictDoUpdate({
        target: [schema.householdInvitations.householdId, schema.householdInvitations.email],
        set: {
          invitedBy: data.invitedBy,
          role: data.role,
          status: "pending",
          token: sql`replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')`,
          expiresAt: sql`now() + interval '7 days'`,
          acceptedAt: null,
        },
      })
      .returning();

    const row = inserted[0];
    if (!row) throw new Error("Failed to create invitation");
    return InvitationMapper.toDomain(row);
  }

  async findPendingByHousehold(householdId: string): Promise<InvitationEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.householdInvitations)
      .where(
        and(
          eq(schema.householdInvitations.householdId, householdId),
          eq(schema.householdInvitations.status, "pending"),
        ),
      );

    return rows.map(InvitationMapper.toDomain);
  }

  async findById(id: string, householdId: string): Promise<InvitationEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.householdInvitations)
      .where(
        and(
          eq(schema.householdInvitations.id, id),
          eq(schema.householdInvitations.householdId, householdId),
        ),
      )
      .limit(1);

    return row ? InvitationMapper.toDomain(row) : null;
  }

  async findByToken(token: string): Promise<InvitationWithHousehold | null> {
    const [row] = await this.admin
      .select({
        invitation: schema.householdInvitations,
        householdName: schema.households.name,
        householdSlug: schema.households.slug,
      })
      .from(schema.householdInvitations)
      .innerJoin(
        schema.households,
        eq(schema.households.id, schema.householdInvitations.householdId),
      )
      .where(eq(schema.householdInvitations.token, token))
      .limit(1);

    if (!row) return null;
    return {
      invitation: InvitationMapper.toDomain(row.invitation),
      householdName: row.householdName,
      householdSlug: row.householdSlug,
    };
  }

  async markAccepted(id: string): Promise<void> {
    await this.admin
      .update(schema.householdInvitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(schema.householdInvitations.id, id));
  }

  async cancel(id: string): Promise<void> {
    await this.db
      .update(schema.householdInvitations)
      .set({ status: "cancelled" })
      .where(eq(schema.householdInvitations.id, id));
  }

  async delete(id: string): Promise<void> {
    // Recusa do convidado: o convite é removido (e não só cancelado) para que o
    // owner possa reenviar o fluxo. Roda via admin (convidado ainda não é membro).
    await this.admin
      .delete(schema.householdInvitations)
      .where(eq(schema.householdInvitations.id, id));
  }
}
