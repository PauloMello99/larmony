import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import type { TransactionType } from "../../../transactions/domain/transaction.entity";
import type {
  ScheduledEntryFrequency,
  ScheduledEntryPostingMode,
} from "../../domain/scheduled-entry.entity";

export class CreateScheduledEntryDto {
  @IsIn(["auto", "manual"])
  postingMode!: ScheduledEntryPostingMode;

  @IsIn(["income", "expense"])
  type!: TransactionType;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @IsIn(["weekly", "monthly", "yearly"])
  frequency!: ScheduledEntryFrequency;

  /** "a cada N períodos" (default 1). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  /** Data de origem (YYYY-MM-DD). No modo auto, deve ser hoje ou no futuro
   *  (sem backfill); no modo manual pode ser no passado (ex.: conta antiga). */
  @IsDateString({ strict: true })
  startDate!: string;

  /** Fim opcional da série (YYYY-MM-DD). Ausente = indefinida. */
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Pessoa a quem a transação é atribuída — default: o autor. */
  @IsOptional()
  @IsUUID()
  personId?: string;

  /** Só considerado no modo manual. Ausente/null = sem lembrete. */
  @IsOptional()
  @IsIn([1, 3, 7, 15])
  reminderDaysBefore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
