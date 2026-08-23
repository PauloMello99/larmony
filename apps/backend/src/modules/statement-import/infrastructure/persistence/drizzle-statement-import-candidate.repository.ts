import { Inject, Injectable } from "@nestjs/common";
import { and, eq, asc } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { IStatementImportCandidateRepository } from "../../domain/statement-import-candidate.repository.interface";
import type { StatementImportCandidateEntity } from "../../domain/statement-import-candidate.entity";
import { StatementImportCandidateMapper } from "./statement-import.mapper";

@Injectable()
export class DrizzleStatementImportCandidateRepository
  implements IStatementImportCandidateRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(
    id: string,
    householdId: string,
  ): Promise<StatementImportCandidateEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.statementImportCandidates)
      .where(
        and(
          eq(schema.statementImportCandidates.id, id),
          eq(schema.statementImportCandidates.householdId, householdId),
        ),
      )
      .limit(1);

    return row ? StatementImportCandidateMapper.toDomain(row) : null;
  }

  async listByJob(
    jobId: string,
    householdId: string,
  ): Promise<StatementImportCandidateEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.statementImportCandidates)
      .where(
        and(
          eq(schema.statementImportCandidates.jobId, jobId),
          eq(schema.statementImportCandidates.householdId, householdId),
        ),
      )
      .orderBy(
        asc(schema.statementImportCandidates.date),
        asc(schema.statementImportCandidates.createdAt),
      );

    return rows.map((row) => StatementImportCandidateMapper.toDomain(row));
  }

  async markConfirmed(id: string, householdId: string, transactionId: string): Promise<void> {
    await this.db
      .update(schema.statementImportCandidates)
      .set({ status: "confirmed", transactionId })
      .where(
        and(
          eq(schema.statementImportCandidates.id, id),
          eq(schema.statementImportCandidates.householdId, householdId),
        ),
      );
  }

  async markDismissed(id: string, householdId: string): Promise<void> {
    await this.db
      .update(schema.statementImportCandidates)
      .set({ status: "dismissed" })
      .where(
        and(
          eq(schema.statementImportCandidates.id, id),
          eq(schema.statementImportCandidates.householdId, householdId),
        ),
      );
  }
}
