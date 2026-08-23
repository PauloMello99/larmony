import { Inject, Injectable } from "@nestjs/common";
import {
  STATEMENT_IMPORT_JOB_REPOSITORY,
  type IStatementImportJobRepository,
} from "../../domain/statement-import-job.repository.interface";
import type { StatementImportJobEntity } from "../../domain/statement-import-job.entity";
import { StatementImportJobNotFoundException } from "../../domain/exceptions/statement-import-job-not-found.exception";

@Injectable()
export class GetStatementImportJobUseCase {
  constructor(
    @Inject(STATEMENT_IMPORT_JOB_REPOSITORY)
    private readonly jobRepo: IStatementImportJobRepository,
  ) {}

  async execute(jobId: string, householdId: string): Promise<StatementImportJobEntity> {
    const job = await this.jobRepo.findById(jobId, householdId);
    if (!job) throw new StatementImportJobNotFoundException(jobId);
    return job;
  }
}
