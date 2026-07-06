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

export class UpdateTransactionDto {
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
  @IsDateString({ strict: true })
  date?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
