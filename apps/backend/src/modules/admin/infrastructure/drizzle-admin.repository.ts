import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../database/database.module";
import * as schema from "../../../database/schema";
import {
  AdminBudgetRow,
  AdminCategoryRow,
  AdminGoalRow,
  AdminHouseholdDetail,
  AdminHouseholdRow,
  AdminHouseholdSubscription,
  AdminNotificationRow,
  AdminScheduledEntryRow,
  AdminTransactionRow,
  AdminUserDetail,
  AdminUserHouseholdChip,
  AdminUserRow,
  GrowthPoint,
  IAdminRepository,
  ListHouseholdNotificationsFilter,
  ListHouseholdTransactionsFilter,
  ListHouseholdsFilter,
  ListUsersFilter,
  Page,
  PageFilter,
  PlatformRole,
  PlatformStats,
} from "../domain/admin.repository.interface";

/** Normaliza page/limit com os mesmos defaults/tetos do painel (20, máx 100). */
function pageParams(filter: { page?: number; limit?: number }) {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Repositório de leitura/gestão da plataforma (PLAT-1). Usa a conexão
 * privilegiada (BYPASSRLS) — o acesso já é restrito ao super_admin pelo
 * {@link PlatformAdminGuard}, e as consultas são cross-household por natureza.
 */
@Injectable()
export class DrizzleAdminRepository implements IAdminRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async getStats(): Promise<PlatformStats> {
    const { rows } = await this.db.execute<{
      total_orgs: number;
      suspended_orgs: number;
      total_users: number;
      super_admins: number;
      total_memberships: number;
    }>(sql`
      SELECT
        (SELECT COUNT(*) FROM households)::int AS total_orgs,
        (SELECT COUNT(*) FROM households WHERE suspended_at IS NOT NULL)::int AS suspended_orgs,
        (SELECT COUNT(*) FROM users)::int AS total_users,
        (SELECT COUNT(*) FROM users WHERE platform_role = 'super_admin')::int AS super_admins,
        (SELECT COUNT(*) FROM household_memberships)::int AS total_memberships
    `);
    const r = rows[0];
    return {
      totalHouseholds: Number(r?.total_orgs ?? 0),
      suspendedHouseholds: Number(r?.suspended_orgs ?? 0),
      totalUsers: Number(r?.total_users ?? 0),
      superAdmins: Number(r?.super_admins ?? 0),
      totalMemberships: Number(r?.total_memberships ?? 0),
    };
  }

  async getGrowthSeries(): Promise<GrowthPoint[]> {
    // Novos households/users por mês nos últimos 12 meses. generate_series garante os
    // meses vazios (sem cadastros) também apareçam, p/ um eixo contínuo.
    const { rows } = await this.db.execute<{
      month: string;
      new_orgs: number;
      new_users: number;
    }>(sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', now()) - interval '11 months',
          date_trunc('month', now()),
          interval '1 month'
        ) AS m
      )
      SELECT
        to_char(months.m, 'YYYY-MM') AS month,
        (SELECT COUNT(*) FROM households o
           WHERE date_trunc('month', o.created_at) = months.m)::int AS new_orgs,
        (SELECT COUNT(*) FROM users u
           WHERE date_trunc('month', u.created_at) = months.m)::int AS new_users
      FROM months
      ORDER BY months.m ASC
    `);
    return rows.map((r) => ({
      month: r.month,
      newHouseholds: Number(r.new_orgs),
      newUsers: Number(r.new_users),
    }));
  }

  async listHouseholds(filter: ListHouseholdsFilter): Promise<Page<AdminHouseholdRow>> {
    const { page, limit, offset } = pageParams(filter);

    // WHERE dinâmico com fragments parametrizados (nunca interpolação crua).
    const conditions = [sql`true`];
    if (filter.q) {
      const pattern = `%${filter.q}%`;
      conditions.push(
        sql`(o.name ILIKE ${pattern} OR o.slug ILIKE ${pattern} OR owner.email ILIKE ${pattern})`,
      );
    }
    // Lar sem linha de subscription é "free" por definição (getOrCreate é lazy).
    if (filter.plan) conditions.push(sql`COALESCE(s.type::text, 'free') = ${filter.plan}`);
    if (filter.status) conditions.push(sql`s.status::text = ${filter.status}`);
    if (filter.suspended !== undefined) {
      conditions.push(
        filter.suspended ? sql`o.suspended_at IS NOT NULL` : sql`o.suspended_at IS NULL`,
      );
    }
    const where = sql.join(conditions, sql` AND `);

    // ORDER BY de mapa fixo (o DTO já valida os valores; sql.raw é seguro aqui).
    const sortColumn = {
      createdAt: "o.created_at",
      name: "o.name",
      memberCount: "member_count",
    }[filter.sortBy ?? "createdAt"];
    const sortDir = filter.sortDir === "asc" ? sql.raw("ASC") : sql.raw("DESC");
    const orderBy = sql`${sql.raw(sortColumn)} ${sortDir}`;

    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      slug: string;
      suspended_at: string | null;
      created_at: string;
      member_count: number;
      owner_name: string | null;
      owner_email: string | null;
      plan: AdminHouseholdRow["plan"];
      subscription_status: string | null;
      total_count: number;
    }>(sql`
      SELECT o.id, o.name, o.slug, o.suspended_at, o.created_at,
        (SELECT COUNT(*) FROM household_memberships m WHERE m.household_id = o.id)::int AS member_count,
        owner.name AS owner_name,
        owner.email AS owner_email,
        COALESCE(s.type::text, 'free') AS plan,
        s.status::text AS subscription_status,
        COUNT(*) OVER()::int AS total_count
      FROM households o
      LEFT JOIN subscriptions s ON s.household_id = o.id
      LEFT JOIN LATERAL (
        SELECT u.name, u.email
        FROM household_memberships om
        JOIN users u ON u.id = om.user_id
        WHERE om.household_id = o.id AND om.role = 'owner'
        ORDER BY om.joined_at ASC LIMIT 1
      ) owner ON true
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        suspendedAt: r.suspended_at ? new Date(r.suspended_at) : null,
        memberCount: Number(r.member_count),
        ownerName: r.owner_name,
        ownerEmail: r.owner_email,
        plan: r.plan,
        subscriptionStatus: r.subscription_status,
        createdAt: new Date(r.created_at),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async listUsers(filter: ListUsersFilter): Promise<Page<AdminUserRow>> {
    const { page, limit, offset } = pageParams(filter);

    const conditions = [sql`true`];
    if (filter.q) {
      const pattern = `%${filter.q}%`;
      conditions.push(sql`(u.name ILIKE ${pattern} OR u.email ILIKE ${pattern})`);
    }
    if (filter.platformRole) {
      conditions.push(sql`u.platform_role = ${filter.platformRole}`);
    }
    const where = sql.join(conditions, sql` AND `);

    const sortColumn = {
      createdAt: "u.created_at",
      name: "u.name",
      householdCount: "org_count",
    }[filter.sortBy ?? "createdAt"];
    const sortDir = filter.sortDir === "asc" ? sql.raw("ASC") : sql.raw("DESC");
    const orderBy = sql`${sql.raw(sortColumn)} ${sortDir}`;

    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      email: string;
      platform_role: PlatformRole;
      created_at: string;
      org_count: number;
      households: AdminUserHouseholdChip[];
      total_count: number;
    }>(sql`
      SELECT u.id, u.name, u.email, u.platform_role, u.created_at,
        COUNT(m.id)::int AS org_count,
        COALESCE(
          json_agg(
            json_build_object('id', h.id, 'name', h.name, 'role', m.role)
            ORDER BY m.joined_at ASC
          ) FILTER (WHERE h.id IS NOT NULL),
          '[]'::json
        ) AS households,
        COUNT(*) OVER()::int AS total_count
      FROM users u
      LEFT JOIN household_memberships m ON m.user_id = u.id
      LEFT JOIN households h ON h.id = m.household_id
      WHERE ${where}
      GROUP BY u.id
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        platformRole: r.platform_role,
        householdCount: Number(r.org_count),
        households: r.households,
        createdAt: new Date(r.created_at),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getHouseholdDetail(householdId: string): Promise<AdminHouseholdDetail | null> {
    const { rows: householdRows } = await this.db.execute<{
      id: string;
      name: string;
      slug: string;
      suspended_at: string | null;
      timezone: string;
      notification_hour: number;
      created_at: string;
      owner_id: string | null;
      owner_name: string | null;
      owner_email: string | null;
    }>(sql`
      SELECT o.id, o.name, o.slug, o.suspended_at, o.timezone, o.notification_hour, o.created_at,
        owner.id AS owner_id, owner.name AS owner_name, owner.email AS owner_email
      FROM households o
      LEFT JOIN LATERAL (
        SELECT u.id, u.name, u.email
        FROM household_memberships om
        JOIN users u ON u.id = om.user_id
        WHERE om.household_id = o.id AND om.role = 'owner'
        ORDER BY om.joined_at ASC LIMIT 1
      ) owner ON true
      WHERE o.id = ${householdId}
      LIMIT 1
    `);
    const o = householdRows[0];
    if (!o) return null;

    const { rows: memberRows } = await this.db.execute<{
      user_id: string;
      name: string;
      email: string;
      role: string;
      enabled: boolean;
      joined_at: string;
    }>(sql`
      SELECT m.user_id, u.name, u.email, m.role, m.enabled, m.joined_at
      FROM household_memberships m
      JOIN users u ON u.id = m.user_id
      WHERE m.household_id = ${householdId}
      ORDER BY (m.role = 'owner') DESC, m.joined_at ASC
    `);

    const { rows: inviteRows } = await this.db.execute<{
      id: string;
      email: string;
      role: string;
      created_at: string;
      expires_at: string;
    }>(sql`
      SELECT id, email, role, created_at, expires_at
      FROM household_invitations
      WHERE household_id = ${householdId} AND status = 'pending'
      ORDER BY created_at DESC
    `);

    const { rows: subRows } = await this.db.execute<{
      type: AdminHouseholdSubscription["type"];
      status: string;
      billing_interval: string | null;
      price_cents: number | null;
      current_period_end: string | null;
      trial_ends_at: string | null;
      discount_percent: number | null;
      comp_reason: string | null;
      comp_expires_at: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
    }>(sql`
      SELECT type, status, billing_interval, price_cents, current_period_end,
        trial_ends_at, discount_percent, comp_reason, comp_expires_at,
        stripe_customer_id, stripe_subscription_id
      FROM subscriptions
      WHERE household_id = ${householdId}
      LIMIT 1
    `);
    const s = subRows[0];

    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      suspendedAt: o.suspended_at ? new Date(o.suspended_at) : null,
      timezone: o.timezone,
      notificationHour: Number(o.notification_hour),
      createdAt: new Date(o.created_at),
      owner: o.owner_id
        ? { id: o.owner_id, name: o.owner_name ?? "", email: o.owner_email ?? "" }
        : null,
      memberCount: memberRows.length,
      members: memberRows.map((m) => ({
        userId: m.user_id,
        name: m.name,
        email: m.email,
        role: m.role,
        enabled: m.enabled,
        joinedAt: new Date(m.joined_at),
      })),
      pendingInvitations: inviteRows.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        createdAt: new Date(i.created_at),
        expiresAt: new Date(i.expires_at),
      })),
      subscription: s
        ? {
            type: s.type,
            status: s.status,
            billingInterval: s.billing_interval,
            priceCents: s.price_cents !== null ? Number(s.price_cents) : null,
            currentPeriodEnd: s.current_period_end ? new Date(s.current_period_end) : null,
            trialEndsAt: s.trial_ends_at ? new Date(s.trial_ends_at) : null,
            discountPercent: s.discount_percent !== null ? Number(s.discount_percent) : null,
            compReason: s.comp_reason,
            compExpiresAt: s.comp_expires_at ? new Date(s.comp_expires_at) : null,
            stripeCustomerId: s.stripe_customer_id,
            stripeSubscriptionId: s.stripe_subscription_id,
          }
        : null,
    };
  }

  async householdExists(householdId: string): Promise<boolean> {
    const { rows } = await this.db.execute<{ ok: number }>(
      sql`SELECT 1 AS ok FROM households WHERE id = ${householdId} LIMIT 1`,
    );
    return rows.length > 0;
  }

  async listHouseholdTransactions(
    householdId: string,
    filter: ListHouseholdTransactionsFilter,
  ): Promise<Page<AdminTransactionRow>> {
    const { page, limit, offset } = pageParams(filter);

    const conditions = [sql`t.household_id = ${householdId}`];
    if (filter.from) conditions.push(sql`t.date >= ${filter.from}`);
    if (filter.to) conditions.push(sql`t.date <= ${filter.to}`);
    if (filter.type) conditions.push(sql`t.type::text = ${filter.type}`);
    const where = sql.join(conditions, sql` AND `);

    const { rows } = await this.db.execute<{
      id: string;
      description: string;
      type: string;
      amount_cents: number;
      date: string;
      category_name: string | null;
      category_color: string | null;
      created_by_name: string | null;
      person_name: string | null;
      installment_number: number | null;
      installment_count: number | null;
      is_scheduled: boolean;
      created_at: string;
      total_count: number;
    }>(sql`
      SELECT t.id, t.description, t.type::text AS type, t.amount_cents, t.date,
        c.name AS category_name, c.color AS category_color,
        cb.name AS created_by_name, p.name AS person_name,
        t.installment_number, t.installment_count,
        (t.scheduled_transaction_entry_id IS NOT NULL) AS is_scheduled,
        t.created_at,
        COUNT(*) OVER()::int AS total_count
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN users cb ON cb.id = t.created_by
      LEFT JOIN users p ON p.id = t.person_id
      WHERE ${where}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        description: r.description,
        type: r.type,
        amountCents: Number(r.amount_cents),
        date: r.date,
        categoryName: r.category_name,
        categoryColor: r.category_color,
        createdByName: r.created_by_name,
        personName: r.person_name,
        installmentNumber: r.installment_number,
        installmentCount: r.installment_count,
        isScheduled: r.is_scheduled,
        createdAt: new Date(r.created_at),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async listHouseholdCategories(
    householdId: string,
    filter: PageFilter,
  ): Promise<Page<AdminCategoryRow>> {
    const { page, limit, offset } = pageParams(filter);
    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      type: string;
      color: string;
      icon: string | null;
      is_default: boolean;
      created_at: string;
      total_count: number;
    }>(sql`
      SELECT id, name, type::text AS type, color, icon, is_default, created_at,
        COUNT(*) OVER()::int AS total_count
      FROM categories
      WHERE household_id = ${householdId}
      ORDER BY is_default DESC, name ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        color: r.color,
        icon: r.icon,
        isDefault: r.is_default,
        createdAt: new Date(r.created_at),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async listHouseholdBudgets(
    householdId: string,
    filter: PageFilter,
  ): Promise<Page<AdminBudgetRow>> {
    const { page, limit, offset } = pageParams(filter);
    // Limite vigente = versão de maior effective_from <= hoje (resolução
    // on-read do M10 — nunca materializada).
    const { rows } = await this.db.execute<{
      id: string;
      category_name: string;
      category_color: string;
      current_amount_cents: number | null;
      ended_from: string | null;
      created_at: string;
      total_count: number;
    }>(sql`
      SELECT b.id, c.name AS category_name, c.color AS category_color,
        v.amount_cents AS current_amount_cents,
        b.ended_from, b.created_at,
        COUNT(*) OVER()::int AS total_count
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      LEFT JOIN LATERAL (
        SELECT bv.amount_cents FROM budget_versions bv
        WHERE bv.budget_id = b.id AND bv.effective_from <= CURRENT_DATE
        ORDER BY bv.effective_from DESC LIMIT 1
      ) v ON true
      WHERE b.household_id = ${householdId}
      ORDER BY (b.ended_from IS NULL) DESC, b.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        categoryName: r.category_name,
        categoryColor: r.category_color,
        currentAmountCents:
          r.current_amount_cents !== null ? Number(r.current_amount_cents) : null,
        endedFrom: r.ended_from,
        createdAt: new Date(r.created_at),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async listHouseholdGoals(householdId: string, filter: PageFilter): Promise<Page<AdminGoalRow>> {
    const { page, limit, offset } = pageParams(filter);
    const { rows } = await this.db.execute<{
      id: string;
      name: string;
      target_amount_cents: number;
      current_amount_cents: number;
      target_date: string | null;
      color: string;
      created_at: string;
      total_count: number;
    }>(sql`
      SELECT g.id, g.name, g.target_amount_cents,
        (SELECT COALESCE(SUM(gc.amount_cents), 0) FROM goal_contributions gc
          WHERE gc.goal_id = g.id)::int AS current_amount_cents,
        g.target_date, g.color, g.created_at,
        COUNT(*) OVER()::int AS total_count
      FROM goals g
      WHERE g.household_id = ${householdId}
      ORDER BY g.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        targetAmountCents: Number(r.target_amount_cents),
        currentAmountCents: Number(r.current_amount_cents),
        targetDate: r.target_date,
        color: r.color,
        createdAt: new Date(r.created_at),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async listHouseholdScheduledEntries(
    householdId: string,
    filter: PageFilter,
  ): Promise<Page<AdminScheduledEntryRow>> {
    const { page, limit, offset } = pageParams(filter);
    const { rows } = await this.db.execute<{
      id: string;
      description: string;
      type: string;
      amount_cents: number;
      posting_mode: string;
      frequency: string;
      interval: number;
      start_date: string;
      end_date: string | null;
      next_run_date: string | null;
      is_active: boolean;
      category_name: string | null;
      created_at: string;
      total_count: number;
    }>(sql`
      SELECT e.id, e.description, e.type::text AS type, e.amount_cents,
        e.posting_mode::text AS posting_mode, e.frequency::text AS frequency,
        e.interval, e.start_date, e.end_date, e.next_run_date, e.is_active,
        c.name AS category_name, e.created_at,
        COUNT(*) OVER()::int AS total_count
      FROM scheduled_transaction_entries e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.household_id = ${householdId}
      ORDER BY e.is_active DESC, e.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        description: r.description,
        type: r.type,
        amountCents: Number(r.amount_cents),
        postingMode: r.posting_mode,
        frequency: r.frequency,
        interval: Number(r.interval),
        startDate: r.start_date,
        endDate: r.end_date,
        nextRunDate: r.next_run_date,
        isActive: r.is_active,
        categoryName: r.category_name,
        createdAt: new Date(r.created_at),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async listHouseholdNotifications(
    householdId: string,
    filter: ListHouseholdNotificationsFilter,
  ): Promise<Page<AdminNotificationRow>> {
    const { page, limit, offset } = pageParams(filter);
    const conditions = [sql`n.household_id = ${householdId}`];
    // ::text no filtro: valor fora do enum vira conjunto vazio, não erro de cast.
    if (filter.type) conditions.push(sql`n.type::text = ${filter.type}`);
    const where = sql.join(conditions, sql` AND `);

    const { rows } = await this.db.execute<{
      id: string;
      user_id: string;
      user_name: string | null;
      type: string;
      title: string;
      body: string;
      read_at: string | null;
      created_at: string;
      total_count: number;
    }>(sql`
      SELECT n.id, n.user_id, u.name AS user_name, n.type::text AS type,
        n.title, n.body, n.read_at, n.created_at,
        COUNT(*) OVER()::int AS total_count
      FROM notifications n
      LEFT JOIN users u ON u.id = n.user_id
      WHERE ${where}
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = Number(rows[0]?.total_count ?? 0);
    return {
      data: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        type: r.type,
        title: r.title,
        body: r.body,
        readAt: r.read_at ? new Date(r.read_at) : null,
        createdAt: new Date(r.created_at),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    const { rows: userRows } = await this.db.execute<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      platform_role: PlatformRole;
      created_at: string;
    }>(sql`
      SELECT id, name, email, phone, platform_role, created_at
      FROM users WHERE id = ${userId} LIMIT 1
    `);
    const u = userRows[0];
    if (!u) return null;

    const { rows: memberRows } = await this.db.execute<{
      household_id: string;
      org_name: string;
      household_slug: string;
      role: string;
      enabled: boolean;
      joined_at: string;
    }>(sql`
      SELECT m.household_id, o.name AS org_name, o.slug AS household_slug, m.role, m.enabled, m.joined_at
      FROM household_memberships m
      JOIN households o ON o.id = m.household_id
      WHERE m.user_id = ${userId}
      ORDER BY m.joined_at ASC
    `);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      platformRole: u.platform_role,
      createdAt: new Date(u.created_at),
      memberships: memberRows.map((m) => ({
        householdId: m.household_id,
        householdName: m.org_name,
        householdSlug: m.household_slug,
        role: m.role,
        enabled: m.enabled,
        joinedAt: new Date(m.joined_at),
      })),
    };
  }

  async setHouseholdSuspended(householdId: string, suspended: boolean): Promise<boolean> {
    const rows = await this.db
      .update(schema.households)
      .set({ suspendedAt: suspended ? new Date() : null, updatedAt: new Date() })
      .where(eq(schema.households.id, householdId))
      .returning({ id: schema.households.id });
    return rows.length > 0;
  }

  async getHouseholdBillingState(
    householdId: string,
  ): Promise<{ stripeSubscriptionId: string | null; type: string; status: string } | null> {
    const { rows } = await this.db.execute<{
      stripe_subscription_id: string | null;
      type: string;
      status: string;
    }>(sql`
      SELECT stripe_subscription_id, type::text AS type, status::text AS status
      FROM subscriptions
      WHERE household_id = ${householdId}
      LIMIT 1
    `);
    const r = rows[0];
    if (!r) return null;
    return {
      stripeSubscriptionId: r.stripe_subscription_id,
      type: r.type,
      status: r.status,
    };
  }

  async markSubscriptionCanceled(householdId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE subscriptions
      SET type = 'free', status = 'canceled', canceled_at = now(), updated_at = now()
      WHERE household_id = ${householdId}
    `);
  }

  async setUserPlatformRole(
    userId: string,
    role: PlatformRole,
  ): Promise<boolean> {
    const rows = await this.db
      .update(schema.users)
      .set({ platformRole: role, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning({ id: schema.users.id });
    return rows.length > 0;
  }

  async findUserById(
    userId: string,
  ): Promise<{ id: string; authId: string; platformRole: PlatformRole } | null> {
    const [row] = await this.db
      .select({
        id: schema.users.id,
        authId: schema.users.authId,
        platformRole: schema.users.platformRole,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return row ?? null;
  }
}
