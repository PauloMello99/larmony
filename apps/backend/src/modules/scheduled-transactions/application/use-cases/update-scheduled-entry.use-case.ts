import { Inject, Injectable } from "@nestjs/common";
import { toISODate } from "../../../../common/finance/due-date";
import { AuditService } from "../../../audit/audit.service";
import type { TransactionType } from "../../../transactions/domain/transaction.entity";
import type {
  ScheduledEntryFrequency,
  ScheduledEntryPostingMode,
} from "../../domain/scheduled-entry.entity";
import { nextRunOnOrAfter } from "../../domain/scheduled-entry-schedule";
import {
  IScheduledEntryRepository,
  SCHEDULED_ENTRY_REPOSITORY,
  type ScheduledEntryListItem,
  type UpdateScheduledEntryData,
} from "../../domain/scheduled-entry.repository.interface";
import { ScheduledEntryNotFoundException } from "../../domain/exceptions/scheduled-entry-not-found.exception";
import { ScheduledEntryInvalidDateRangeException } from "../../domain/exceptions/scheduled-entry-invalid-date-range.exception";

export interface UpdateScheduledEntryInput {
  postingMode?: ScheduledEntryPostingMode;
  type?: TransactionType;
  amountCents?: number;
  description?: string;
  frequency?: ScheduledEntryFrequency;
  interval?: number;
  endDate?: string | null;
  categoryId?: string | null;
  personId?: string | null;
  isActive?: boolean;
  reminderDaysBefore?: number | null;
  notes?: string | null;
}

@Injectable()
export class UpdateScheduledEntryUseCase {
  constructor(
    @Inject(SCHEDULED_ENTRY_REPOSITORY)
    private readonly entryRepo: IScheduledEntryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    entryId: string,
    householdId: string,
    authId: string,
    input: UpdateScheduledEntryInput,
    now: Date = new Date(),
  ): Promise<ScheduledEntryListItem> {
    const current = await this.entryRepo.findById(entryId, householdId);
    if (!current) throw new ScheduledEntryNotFoundException(entryId);

    if (input.endDate && input.endDate < current.startDate) {
      throw new ScheduledEntryInvalidDateRangeException(current.startDate, input.endDate);
    }

    const patch: UpdateScheduledEntryData = { ...input };
    const targetMode = input.postingMode ?? current.postingMode;
    const targetActive = input.isActive ?? current.isActive;

    if (targetMode === "auto") {
      // Precisa (re)ancorar o cursor quando: acabou de virar auto (manual→auto),
      // ou estava pausado e reativou agora — em ambos os casos, pula direto
      // pra próxima ocorrência >= hoje em vez de gerar tudo que ficou "parado".
      const becameAuto = current.postingMode !== "auto";
      const reactivated = current.postingMode === "auto" && !current.isActive && targetActive;
      if (becameAuto || reactivated) {
        patch.nextRunDate = nextRunOnOrAfter(
          current.startDate,
          toISODate(now),
          input.frequency ?? current.frequency,
          input.interval ?? current.interval,
        );
      }
    } else {
      // Modo manual não tem cursor — nunca é o engine que o consome.
      patch.nextRunDate = null;
      // Lembrete só existe no modo manual; se o campo não veio no patch, não
      // altera (permite editar outros campos sem apagar o lembrete existente).
    }

    const entry = await this.entryRepo.update(entryId, householdId, patch);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "scheduled_transaction_entry",
      entityId: entryId,
      metadata: { fields: Object.keys(input) },
    });

    return entry;
  }
}
