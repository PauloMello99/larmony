import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * A regra "exatamente um de percent/amountCents" e "repeating exige
 * durationInMonths" é validada no use-case (InvalidDiscountException) — aqui só
 * validação de campo.
 */
export class ApplyDiscountDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsIn(["once", "repeating", "forever"])
  duration!: "once" | "repeating" | "forever";

  @IsOptional()
  @IsInt()
  @Min(1)
  durationInMonths?: number;
}
