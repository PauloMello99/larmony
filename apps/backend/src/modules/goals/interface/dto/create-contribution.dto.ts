import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateContributionDto {
  /** Aportes são sempre positivos no v1 — corrigir erro = deletar o aporte. */
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
