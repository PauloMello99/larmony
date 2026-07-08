import { Inject, Injectable } from "@nestjs/common";
import { toISODate } from "../../../../common/finance/due-date";
import { AuditService } from "../../../audit/audit.service";
import type { TransactionType } from "../../../transactions/domain/transaction.entity";
import type { RecurrenceFrequency } from "../../domain/recurrence.entity";
import {
  IRecurrenceRepository,
  RECURRENCE_REPOSITORY,
  type RecurrenceListItem,
} from "../../domain/recurrence.repository.interface";
import { RecurrenceStartDateInPastException } from "../../domain/exceptions/recurrence-start-date-in-past.exception";
import { RecurrenceInvalidDateRangeException } from "../../domain/exceptions/recurrence-invalid-date-range.exception";

export interface CreateRecurrenceInput {
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: RecurrenceFrequency;
  interval?: number;
  startDate: string;
  endDate?: string | null;
  categoryId?: string;
  personId?: string;
  notes?: string;
}

@Injectable()
export class CreateRecurrenceUseCase {
  constructor(
    @Inject(RECURRENCE_REPOSITORY)
    private readonly recurrenceRepo: IRecurrenceRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    userId: string,
    input: CreateRecurrenceInput,
    now: Date = new Date(),
  ): Promise<RecurrenceListItem> {
    // Sem backfill histórico: a 1ª ocorrência não pode estar no passado.
    if (input.startDate < toISODate(now)) {
      throw new RecurrenceStartDateInPastException(input.startDate);
    }
    // Fim antes do início se auto-encerraria vazia — rejeita explicitamente.
    if (input.endDate && input.endDate < input.startDate) {
      throw new RecurrenceInvalidDateRangeException(input.startDate, input.endDate);
    }

    const recurrence = await this.recurrenceRepo.create(householdId, {
      createdBy: userId,
      personId: input.personId ?? userId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      amountCents: input.amountCents,
      description: input.description,
      frequency: input.frequency,
      interval: input.interval ?? 1,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      // Cursor do engine começa na 1ª ocorrência.
      nextRunDate: input.startDate,
      notes: input.notes ?? null,
    });

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "recurrence",
      entityId: recurrence.id,
      metadata: {
        type: recurrence.type,
        amountCents: recurrence.amountCents,
        frequency: recurrence.frequency,
        interval: recurrence.interval,
      },
    });

    return recurrence;
  }
}
