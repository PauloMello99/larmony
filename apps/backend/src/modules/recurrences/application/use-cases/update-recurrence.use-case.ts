import { Inject, Injectable } from "@nestjs/common";
import { toISODate } from "../../../../common/finance/due-date";
import { AuditService } from "../../../audit/audit.service";
import type { TransactionType } from "../../../transactions/domain/transaction.entity";
import type { RecurrenceFrequency } from "../../domain/recurrence.entity";
import { nextRunOnOrAfter } from "../../domain/recurrence-schedule";
import {
  IRecurrenceRepository,
  RECURRENCE_REPOSITORY,
  type RecurrenceListItem,
  type UpdateRecurrenceData,
} from "../../domain/recurrence.repository.interface";
import { RecurrenceNotFoundException } from "../../domain/exceptions/recurrence-not-found.exception";

export interface UpdateRecurrenceInput {
  type?: TransactionType;
  amountCents?: number;
  description?: string;
  frequency?: RecurrenceFrequency;
  interval?: number;
  endDate?: string | null;
  categoryId?: string | null;
  personId?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

@Injectable()
export class UpdateRecurrenceUseCase {
  constructor(
    @Inject(RECURRENCE_REPOSITORY)
    private readonly recurrenceRepo: IRecurrenceRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    recurrenceId: string,
    householdId: string,
    authId: string,
    input: UpdateRecurrenceInput,
    now: Date = new Date(),
  ): Promise<RecurrenceListItem> {
    const patch: UpdateRecurrenceData = { ...input };

    // Reativação (false→true): re-ancora o cursor para a próxima ocorrência
    // >= hoje, evitando o engine gerar de uma vez tudo que ficou pausado.
    if (input.isActive === true) {
      const current = await this.recurrenceRepo.findById(recurrenceId, householdId);
      if (!current) throw new RecurrenceNotFoundException(recurrenceId);
      if (!current.isActive) {
        patch.nextRunDate = nextRunOnOrAfter(
          current.nextRunDate,
          toISODate(now),
          input.frequency ?? current.frequency,
          input.interval ?? current.interval,
        );
      }
    }

    const recurrence = await this.recurrenceRepo.update(recurrenceId, householdId, patch);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "recurrence",
      entityId: recurrenceId,
      metadata: { fields: Object.keys(input) },
    });

    return recurrence;
  }
}
