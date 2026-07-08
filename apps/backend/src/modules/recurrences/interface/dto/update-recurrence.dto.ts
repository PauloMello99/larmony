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
import type { RecurrenceFrequency } from "../../domain/recurrence.entity";

// startDate é imutável (troca = deletar + criar). nextRunDate é gerido pelo
// engine/reativação, nunca pelo cliente.
export class UpdateRecurrenceDto {
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
  frequency?: RecurrenceFrequency;

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

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
