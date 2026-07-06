import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetAmountCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  /** `null` limpa a data alvo. */
  @IsOptional()
  @IsDateString()
  targetDate?: string | null;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;
}
