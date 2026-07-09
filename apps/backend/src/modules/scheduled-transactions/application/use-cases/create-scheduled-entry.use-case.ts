import { Inject, Injectable } from "@nestjs/common";
import { toISODate } from "../../../../common/finance/due-date";
import { AuditService } from "../../../audit/audit.service";
import type { TransactionType } from "../../../transactions/domain/transaction.entity";
import type {
  ScheduledEntryFrequency,
  ScheduledEntryPostingMode,
} from "../../domain/scheduled-entry.entity";
import {
  IScheduledEntryRepository,
  SCHEDULED_ENTRY_REPOSITORY,
  type ScheduledEntryListItem,
} from "../../domain/scheduled-entry.repository.interface";
import { ScheduledEntryStartDateInPastException } from "../../domain/exceptions/scheduled-entry-start-date-in-past.exception";
import { ScheduledEntryInvalidDateRangeException } from "../../domain/exceptions/scheduled-entry-invalid-date-range.exception";

export interface CreateScheduledEntryInput {
  postingMode: ScheduledEntryPostingMode;
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: ScheduledEntryFrequency;
  interval?: number;
  startDate: string;
  endDate?: string | null;
  categoryId?: string;
  personId?: string;
  /** Só considerado no modo `manual` — ignorado (forçado a NULL) no `auto`. */
  reminderDaysBefore?: number | null;
  notes?: string;
}

@Injectable()
export class CreateScheduledEntryUseCase {
  constructor(
    @Inject(SCHEDULED_ENTRY_REPOSITORY)
    private readonly entryRepo: IScheduledEntryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    userId: string,
    input: CreateScheduledEntryInput,
    now: Date = new Date(),
  ): Promise<ScheduledEntryListItem> {
    // Sem backfill histórico no modo auto: a 1ª ocorrência não pode estar no
    // passado. No modo manual não há geração automática, então uma startDate
    // no passado é normal (ex.: uma conta que já existe há anos).
    if (input.postingMode === "auto" && input.startDate < toISODate(now)) {
      throw new ScheduledEntryStartDateInPastException(input.startDate);
    }
    // Fim antes do início se auto-encerraria vazia — rejeita explicitamente
    // (em ambos os modos).
    if (input.endDate && input.endDate < input.startDate) {
      throw new ScheduledEntryInvalidDateRangeException(input.startDate, input.endDate);
    }

    const entry = await this.entryRepo.create(householdId, {
      postingMode: input.postingMode,
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
      // Cursor do engine começa na 1ª ocorrência — só existe no modo auto.
      nextRunDate: input.postingMode === "auto" ? input.startDate : null,
      reminderDaysBefore: input.postingMode === "manual" ? input.reminderDaysBefore ?? null : null,
      notes: input.notes ?? null,
    });

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "scheduled_transaction_entry",
      entityId: entry.id,
      metadata: {
        postingMode: entry.postingMode,
        type: entry.type,
        amountCents: entry.amountCents,
        frequency: entry.frequency,
        interval: entry.interval,
      },
    });

    return entry;
  }
}
