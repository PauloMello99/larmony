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
import type { RecurrenceFrequency } from "../../domain/recurrence.entity";

export class CreateRecurrenceDto {
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
  frequency!: RecurrenceFrequency;

  /** "a cada N períodos" (default 1). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  /** 1ª ocorrência (YYYY-MM-DD). Deve ser hoje ou no futuro (sem backfill). */
  @IsDateString({ strict: true })
  startDate!: string;

  /** Fim opcional da série (YYYY-MM-DD). Ausente = indefinida. */
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Pessoa a quem a transação gerada é atribuída — default: o autor da regra. */
  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
