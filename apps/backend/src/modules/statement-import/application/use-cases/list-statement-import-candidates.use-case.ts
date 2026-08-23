import { Inject, Injectable } from "@nestjs/common";
import {
  STATEMENT_IMPORT_CANDIDATE_REPOSITORY,
  type IStatementImportCandidateRepository,
} from "../../domain/statement-import-candidate.repository.interface";
import type { StatementImportCandidateEntity } from "../../domain/statement-import-candidate.entity";

@Injectable()
export class ListStatementImportCandidatesUseCase {
  constructor(
    @Inject(STATEMENT_IMPORT_CANDIDATE_REPOSITORY)
    private readonly candidateRepo: IStatementImportCandidateRepository,
  ) {}

  execute(jobId: string, householdId: string): Promise<StatementImportCandidateEntity[]> {
    return this.candidateRepo.listByJob(jobId, householdId);
  }
}
