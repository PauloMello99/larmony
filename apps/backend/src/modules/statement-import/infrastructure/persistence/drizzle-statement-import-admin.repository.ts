import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  CompleteJobPatch,
  IStatementImportAdminRepository,
  NewCandidateRow,
  StatementImportAdminCategory,
} from "../../domain/statement-import-admin.repository.interface";
import type {
  StatementImportJobEntity,
  StatementImportJobStatus,
} from "../../domain/statement-import-job.entity";
import { StatementImportJobMapper } from "./statement-import.mapper";

const OPEN_JOB_STATUSES: StatementImportJobStatus[] = ["pending", "processing"];

/** Sem RLS (DRIZZLE_ADMIN) — callback do processor + cron de timeout, sem sessão de usuário. */
@Injectable()
export class DrizzleStatementImportAdminRepository implements IStatementImportAdminRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findCategories(householdId: string): Promise<StatementImportAdminCategory[]> {
    return this.db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        isDefault: schema.categories.isDefault,
      })
      .from(schema.categories)
      .where(eq(schema.categories.householdId, householdId));
  }

  async findJobById(id: string): Promise<StatementImportJobEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.statementImportJobs)
      .where(eq(schema.statementImportJobs.id, id))
      .limit(1);

    return row ? StatementImportJobMapper.toDomain(row) : null;
  }

  async completeJob(
    id: string,
    patch: CompleteJobPatch,
  ): Promise<{ ok: boolean; job: StatementImportJobEntity | null }> {
    const [row] = await this.db
      .update(schema.statementImportJobs)
      .set({
        status: patch.status,
        errorCode: patch.errorCode,
        errorMessage: patch.errorMessage,
        stats: patch.stats,
        completedAt: patch.completedAt,
      })
      .where(
        and(
          eq(schema.statementImportJobs.id, id),
          inArray(schema.statementImportJobs.status, OPEN_JOB_STATUSES),
        ),
      )
      .returning();

    return row
      ? { ok: true, job: StatementImportJobMapper.toDomain(row) }
      : { ok: false, job: null };
  }

  async insertCandidates(
    jobId: string,
    householdId: string,
    rows: NewCandidateRow[],
  ): Promise<{ insertedCount: number; skippedCount: number }> {
    if (rows.length === 0) return { insertedCount: 0, skippedCount: 0 };

    const inserted = await this.db
      .insert(schema.statementImportCandidates)
      .values(
        rows.map((row) => ({
          jobId,
          householdId,
          externalId: row.externalId,
          date: row.date,
          amountCents: row.amountCents,
          type: row.type,
          description: row.description,
          categoryId: row.categoryId,
          categoryConfidence: row.categoryConfidence,
          resolvedBy: row.resolvedBy,
          merchantKey: row.merchantKey,
        })),
      )
      .onConflictDoNothing({
        target: [
          schema.statementImportCandidates.householdId,
          schema.statementImportCandidates.externalId,
        ],
      })
      .returning({ id: schema.statementImportCandidates.id });

    return { insertedCount: inserted.length, skippedCount: rows.length - inserted.length };
  }

  async completeJobWithCandidates(
    id: string,
    patch: CompleteJobPatch,
    householdId: string,
    rows: NewCandidateRow[],
  ): Promise<{
    ok: boolean;
    job: StatementImportJobEntity | null;
    insertedCount: number;
    skippedCount: number;
  }> {
    return this.db.transaction(async (tx) => {
      const [jobRow] = await tx
        .update(schema.statementImportJobs)
        .set({
          status: patch.status,
          errorCode: patch.errorCode,
          errorMessage: patch.errorMessage,
          stats: patch.stats,
          completedAt: patch.completedAt,
        })
        .where(
          and(
            eq(schema.statementImportJobs.id, id),
            inArray(schema.statementImportJobs.status, OPEN_JOB_STATUSES),
          ),
        )
        .returning();

      if (!jobRow) return { ok: false, job: null, insertedCount: 0, skippedCount: 0 };
      if (rows.length === 0) {
        return { ok: true, job: StatementImportJobMapper.toDomain(jobRow), insertedCount: 0, skippedCount: 0 };
      }

      const inserted = await tx
        .insert(schema.statementImportCandidates)
        .values(
          rows.map((row) => ({
            jobId: id,
            householdId,
            externalId: row.externalId,
            date: row.date,
            amountCents: row.amountCents,
            type: row.type,
            description: row.description,
            categoryId: row.categoryId,
            categoryConfidence: row.categoryConfidence,
            resolvedBy: row.resolvedBy,
            merchantKey: row.merchantKey,
          })),
        )
        .onConflictDoNothing({
          target: [
            schema.statementImportCandidates.householdId,
            schema.statementImportCandidates.externalId,
          ],
        })
        .returning({ id: schema.statementImportCandidates.id });

      return {
        ok: true,
        job: StatementImportJobMapper.toDomain(jobRow),
        insertedCount: inserted.length,
        skippedCount: rows.length - inserted.length,
      };
    });
  }

  async sweepTimeouts(
    csvOfxDeadline: string,
    pdfDeadline: string,
  ): Promise<{ id: string; householdId: string }[]> {
    return this.db
      .update(schema.statementImportJobs)
      .set({
        status: "failed",
        errorCode: "TIMEOUT",
        errorMessage: "O processor não respondeu dentro do prazo esperado.",
        completedAt: new Date(),
      })
      .where(
        and(
          inArray(schema.statementImportJobs.status, OPEN_JOB_STATUSES),
          sql`case when ${schema.statementImportJobs.source} = 'pdf'
                then ${schema.statementImportJobs.createdAt} < now() - ${pdfDeadline}::interval
                else ${schema.statementImportJobs.createdAt} < now() - ${csvOfxDeadline}::interval end`,
        ),
      )
      .returning({
        id: schema.statementImportJobs.id,
        householdId: schema.statementImportJobs.householdId,
      });
  }
}
