import { Inject, Injectable } from "@nestjs/common";
import { AuditService } from "../../../audit/audit.service";
import {
  IRecurrenceRepository,
  RECURRENCE_REPOSITORY,
} from "../../domain/recurrence.repository.interface";

@Injectable()
export class DeleteRecurrenceUseCase {
  constructor(
    @Inject(RECURRENCE_REPOSITORY)
    private readonly recurrenceRepo: IRecurrenceRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(recurrenceId: string, householdId: string, authId: string): Promise<void> {
    // Transações já geradas sobrevivem (FK recurrence_id ON DELETE SET NULL).
    await this.recurrenceRepo.delete(recurrenceId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "recurrence",
      entityId: recurrenceId,
    });
  }
}
