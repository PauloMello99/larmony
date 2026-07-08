import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import type { TransactionType } from "../../domain/transaction.entity";
import { TransactionMemberDto } from "./transaction-member.dto";

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

  /** Se presente, substitui o rateio da transação (lista vazia remove o rateio). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TransactionMemberDto)
  members?: TransactionMemberDto[];
}
