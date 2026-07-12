import { IsNotEmpty, IsOptional, IsString, IsDateString, MaxLength } from "class-validator";

export class GrantCompDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  /** ISO date/datetime; ausente = isenção para sempre. */
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
