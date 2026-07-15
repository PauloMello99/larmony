import {
  IsBoolean,
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

// startDate é imutável (troca = deletar + criar). nextRunDate é gerido pelo
// use-case (toggle de modo/reativação), nunca pelo cliente.
export class UpdateScheduledEntryDto {
  /** Toggle entre geração automática (engine) e manual (lembrete + lançar). */
  @IsOptional()
  @IsIn(["auto", "manual"])
  postingMode?: ScheduledEntryPostingMode;

  @IsOptional()
  @IsIn(["income", "expense"])
  type?: TransactionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsIn(["weekly", "monthly", "yearly"])
  frequency?: ScheduledEntryFrequency;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  /** null limpa o fim da série. */
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  personId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Só considerado no modo manual. null limpa o lembrete. */
  @IsOptional()
  @IsIn([1, 3, 7, 15])
  reminderDaysBefore?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
