import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  MinLength,
} from "class-validator";
import type { TransactionType } from "../../domain/transaction.entity";

export class CreateTransactionDto {
  @IsIn(["income", "expense"])
  type!: TransactionType;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  /** Data da ocorrência (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  date!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Quem gastou/recebeu — default: o próprio autor da transação. */
  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
