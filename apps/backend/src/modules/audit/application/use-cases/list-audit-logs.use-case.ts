import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { AuditAction } from "../../audit.service";

export interface AuditLogsFilter {
  page?: number;
  limit?: number;
  householdId?: string;
  actorId?: string;
  action?: AuditAction;
  entityType?: string;
  from?: string;
  to?: string;
}

export interface AuditLogRow {
  id: string;
  actor: { id: string; name: string; email: string } | null;
  household: { id: string; name: string; slug: string } | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogsPage {
  data: AuditLogRow[];
  total: number;
  page: number;
  pages: number;
}

@Injectable()
export class ListAuditLogsUseCase {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async execute(filter: AuditLogsFilter): Promise<AuditLogsPage> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filter.householdId) conditions.push(eq(schema.auditLogs.householdId, filter.householdId));
    if (filter.actorId) conditions.push(eq(schema.auditLogs.actorId, filter.actorId));
    if (filter.action) conditions.push(eq(schema.auditLogs.action, filter.action));
    if (filter.entityType) conditions.push(eq(schema.auditLogs.entityType, filter.entityType));
    if (filter.from) conditions.push(gte(schema.auditLogs.createdAt, new Date(filter.from)));
    if (filter.to) conditions.push(lte(schema.auditLogs.createdAt, new Date(filter.to)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows = await this.db
      .select({ total: count() })
      .from(schema.auditLogs)
      .where(whereClause);
    const total = countRows[0]?.total ?? 0;

    const rows = await this.db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        entityType: schema.auditLogs.entityType,
        entityId: schema.auditLogs.entityId,
        metadata: schema.auditLogs.metadata,
        createdAt: schema.auditLogs.createdAt,
        actorId: schema.auditLogs.actorId,
        actorName: schema.users.name,
        actorEmail: schema.users.email,
        householdId: schema.auditLogs.householdId,
        householdName: schema.households.name,
        householdSlug: schema.households.slug,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorId))
      .leftJoin(schema.households, eq(schema.households.id, schema.auditLogs.householdId))
      .where(whereClause)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map((r) => ({
        id: r.id,
        action: r.action as AuditAction,
        entityType: r.entityType,
        entityId: r.entityId ?? null,
        metadata: r.metadata as Record<string, unknown> | null,
        createdAt: r.createdAt.toISOString(),
        actor: r.actorId
          ? { id: r.actorId, name: r.actorName ?? "", email: r.actorEmail ?? "" }
          : null,
        household: r.householdId
          ? { id: r.householdId, name: r.householdName ?? "", slug: r.householdSlug ?? "" }
          : null,
      })),
      total: Number(total),
      page,
      pages: Math.ceil(Number(total) / limit),
    };
  }
}
