import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import type { TransactionType } from "../../domain/transaction.entity";
import { TransactionMemberDto } from "./transaction-member.dto";

export class CreateTransactionDto {
  @IsIn(["income", "expense"])
  type!: TransactionType;

  /** Valor único, ou TOTAL da série quando `installmentCount > 1`. */
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  /** Data da ocorrência / 1ª parcela (YYYY-MM-DD). */
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

  /** > 1 gera N parcelas (o `amountCents` vira o total da série). */
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(60)
  installmentCount?: number;

  /** Rateio (share null = divisão igual). Parcelado só aceita rateio igual. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TransactionMemberDto)
  members?: TransactionMemberDto[];
}
