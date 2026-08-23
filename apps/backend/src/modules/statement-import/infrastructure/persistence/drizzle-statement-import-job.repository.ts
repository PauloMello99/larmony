import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  CreateStatementImportJobData,
  IStatementImportJobRepository,
} from "../../domain/statement-import-job.repository.interface";
import type { StatementImportJobEntity } from "../../domain/statement-import-job.entity";
import { StatementImportJobMapper } from "./statement-import.mapper";

@Injectable()
export class DrizzleStatementImportJobRepository implements IStatementImportJobRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(
    householdId: string,
    data: CreateStatementImportJobData,
  ): Promise<StatementImportJobEntity> {
    const [row] = await this.db
      .insert(schema.statementImportJobs)
      .values({
        householdId,
        createdBy: data.createdBy,
        source: data.source,
        status: data.status,
      })
      .returning();

    if (!row) throw new Error("Failed to create statement import job");
    return StatementImportJobMapper.toDomain(row);
  }

  async findById(id: string, householdId: string): Promise<StatementImportJobEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.statementImportJobs)
      .where(
        and(
          eq(schema.statementImportJobs.id, id),
          eq(schema.statementImportJobs.householdId, householdId),
        ),
      )
      .limit(1);

    return row ? StatementImportJobMapper.toDomain(row) : null;
  }

  async markFailedSync(
    id: string,
    householdId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    await this.db
      .update(schema.statementImportJobs)
      .set({ status: "failed", errorCode, errorMessage, completedAt: new Date() })
      .where(
        and(
          eq(schema.statementImportJobs.id, id),
          eq(schema.statementImportJobs.householdId, householdId),
        ),
      );
  }
}
