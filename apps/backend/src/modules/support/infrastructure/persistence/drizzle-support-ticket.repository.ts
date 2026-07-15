import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  AdminSupportTicketRow,
  SupportTicketDetail,
  SupportTicketMessageRow,
  SupportTicketStatus,
} from "../../domain/support-ticket.entity";
import type {
  CreateSupportTicketData,
  ISupportTicketRepository,
  ListAdminSupportTicketsFilter,
  Page,
  PageFilter,
} from "../../domain/support-ticket.repository.interface";

/** Normaliza page/limit com os mesmos defaults/tetos do painel admin (20, máx 100). */
function pageParams(filter: { page?: number; limit?: number }) {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Repositório do canal de suporte (M15 PR3). Tabelas sem RLS — mesmo padrão de
 * `notifications`: usa DRIZZLE_ADMIN, escopo por user_id sempre garantido no
 * código (findByIdForUser) ou pelo PlatformAdminGuard (findByIdAny/listAll).
 */
@Injectable()
export class DrizzleSupportTicketRepository implements ISupportTicketRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async create(data: CreateSupportTicketData): Promise<SupportTicketDetail> {
    const [ticket] = await this.db
      .insert(schema.supportTickets)
      .values({
        userId: data.userId,
        householdId: data.householdId,
        category: data.category,
        subject: data.subject,
      })
      .returning();
    if (!ticket) throw new Error("Failed to create support ticket");

    await this.db.insert(schema.supportTicketMessages).values({
      ticketId: ticket.id,
      authorUserId: data.userId,
      isAdmin: false,
      body: data.body,
    });

    const detail = await this.findByIdAny(ticket.id);
    if (!detail) throw new Error("Failed to reload created support ticket");
    return detail;
  }

  async findByIdForUser(ticketId: string, userId: string): Promise<SupportTicketDetail | null> {
    const detail = await this.findByIdAny(ticketId);
    return detail && detail.userId === userId ? detail : null;
  }

  async findByIdAny(ticketId: string): Promise<SupportTicketDetail | null> {
    const { rows: ticketRows } = await this.db.execute<{
      id: string;
      user_id: string;
      household_id: string | null;
      category: SupportTicketDetail["category"];
      status: SupportTicketStatus;
      subject: string;
      created_at: string;
      updated_at: string;
    }>(sql`
      SELECT id, user_id, household_id, category, status, subject, created_at, updated_at
      FROM support_tickets
      WHERE id = ${ticketId}
    `);
    const t = ticketRows[0];
    if (!t) return null;

    const { rows: messageRows } = await this.db.execute<{
      id: string;
      author_user_id: string;
      author_name: string;
      is_admin: boolean;
      body: string;
      created_at: string;
    }>(sql`
      SELECT m.id, m.author_user_id, u.name AS author_name, m.is_admin, m.body, m.created_at
      FROM support_ticket_messages m
      JOIN users u ON u.id = m.author_user_id
      WHERE m.ticket_id = ${ticketId}
      ORDER BY m.created_at ASC
    `);

    return {
      id: t.id,
      userId: t.user_id,
      householdId: t.household_id,
      category: t.category,
      status: t.status,
      subject: t.subject,
      createdAt: new Date(t.created_at),
      updatedAt: new Date(t.updated_at),
      messages: messageRows.map(
        (m): SupportTicketMessageRow => ({
          id: m.id,
          authorUserId: m.author_user_id,
          authorName: m.author_name,
          isAdmin: m.is_admin,
          body: m.body,
          createdAt: new Date(m.created_at),
        }),
      ),
    };
  }

  async listByUser(userId: string, filter: PageFilter) {
    const { page, limit, offset } = pageParams(filter);
    const { rows } = await this.db.execute<{
      id: string;
      category: SupportTicketDetail["category"];
      status: SupportTicketStatus;
      subject: string;
      created_at: string;
      updated_at: string;
      total_count: number;
    }>(sql`
      SELECT id, category, status, subject, created_at, updated_at,
        COUNT(*) OVER()::int AS total_count
      FROM support_tickets
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        category: r.category,
        status: r.status,
        subject: r.subject,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listAll(filter: ListAdminSupportTicketsFilter): Promise<Page<AdminSupportTicketRow>> {
    const { page, limit, offset } = pageParams(filter);

    const conditions = [sql`true`];
    if (filter.status) conditions.push(sql`t.status = ${filter.status}`);
    if (filter.category) conditions.push(sql`t.category = ${filter.category}`);
    const where = sql.join(conditions, sql` AND `);

    const { rows } = await this.db.execute<{
      id: string;
      category: SupportTicketDetail["category"];
      status: SupportTicketStatus;
      subject: string;
      created_at: string;
      updated_at: string;
      author_name: string;
      author_email: string;
      household_name: string | null;
      total_count: number;
    }>(sql`
      SELECT t.id, t.category, t.status, t.subject, t.created_at, t.updated_at,
        u.name AS author_name, u.email AS author_email, o.name AS household_name,
        COUNT(*) OVER()::int AS total_count
      FROM support_tickets t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN households o ON o.id = t.household_id
      WHERE ${where}
      ORDER BY t.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        category: r.category,
        status: r.status,
        subject: r.subject,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
        authorName: r.author_name,
        authorEmail: r.author_email,
        householdName: r.household_name,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async addMessage(
    ticketId: string,
    authorUserId: string,
    isAdmin: boolean,
    body: string,
  ): Promise<SupportTicketMessageRow> {
    const [row] = await this.db
      .insert(schema.supportTicketMessages)
      .values({ ticketId, authorUserId, isAdmin, body })
      .returning();
    if (!row) throw new Error("Failed to add support ticket message");

    await this.db
      .update(schema.supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(schema.supportTickets.id, ticketId));

    const [author] = await this.db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, authorUserId))
      .limit(1);

    return {
      id: row.id,
      authorUserId: row.authorUserId,
      authorName: author?.name ?? "",
      isAdmin: row.isAdmin,
      body: row.body,
      createdAt: row.createdAt,
    };
  }

  async setStatus(ticketId: string, status: SupportTicketStatus): Promise<void> {
    await this.db
      .update(schema.supportTickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.supportTickets.id, ticketId));
  }

  async countOpen(): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.supportTickets)
      .where(eq(schema.supportTickets.status, "open"));
    return row?.n ?? 0;
  }

  async findSuperAdminUserIds(): Promise<string[]> {
    const rows = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.platformRole, "super_admin"));
    return rows.map((r) => r.id);
  }
}
