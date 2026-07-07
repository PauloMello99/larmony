import { IsInt, IsOptional, IsUUID, Min } from "class-validator";

export class TransactionMemberDto {
  @IsUUID()
  userId!: string;

  /** null/ausente = divisão igual; valor = fatia específica (só em transação única). */
  @IsOptional()
  @IsInt()
  @Min(0)
  shareAmountCents?: number | null;
}
