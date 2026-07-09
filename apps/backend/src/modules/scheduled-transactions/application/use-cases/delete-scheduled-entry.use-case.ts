import { Inject, Injectable } from "@nestjs/common";
import { AuditService } from "../../../audit/audit.service";
import {
  IScheduledEntryRepository,
  SCHEDULED_ENTRY_REPOSITORY,
} from "../../domain/scheduled-entry.repository.interface";

@Injectable()
export class DeleteScheduledEntryUseCase {
  constructor(
    @Inject(SCHEDULED_ENTRY_REPOSITORY)
    private readonly entryRepo: IScheduledEntryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(entryId: string, householdId: string, authId: string): Promise<void> {
    // Transações já geradas sobrevivem (FK scheduled_transaction_entry_id ON DELETE SET NULL).
    await this.entryRepo.delete(entryId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "scheduled_transaction_entry",
      entityId: entryId,
    });
  }
}
