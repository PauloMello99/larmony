import { Inject, Injectable } from "@nestjs/common";
import {
  STATEMENT_IMPORT_CANDIDATE_REPOSITORY,
  type IStatementImportCandidateRepository,
} from "../../domain/statement-import-candidate.repository.interface";
import { StatementImportCandidateNotFoundException } from "../../domain/exceptions/statement-import-candidate-not-found.exception";
import { StatementImportCandidateNotPendingException } from "../../domain/exceptions/statement-import-candidate-not-pending.exception";

@Injectable()
export class DismissStatementImportCandidateUseCase {
  constructor(
    @Inject(STATEMENT_IMPORT_CANDIDATE_REPOSITORY)
    private readonly candidateRepo: IStatementImportCandidateRepository,
  ) {}

  async execute(candidateId: string, householdId: string): Promise<void> {
    const candidate = await this.candidateRepo.findById(candidateId, householdId);
    if (!candidate) throw new StatementImportCandidateNotFoundException(candidateId);
    if (candidate.status !== "pending_review") {
      throw new StatementImportCandidateNotPendingException(candidateId);
    }

    await this.candidateRepo.markDismissed(candidateId, householdId);
  }
}
