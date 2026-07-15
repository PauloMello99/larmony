import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { IANA_TIMEZONES } from "../../../../common/time/timezones";

export class CreateHouseholdDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  /** Fuso IANA (M12) — auto-detectado no navegador do criador; default no backend. */
  @IsOptional()
  @IsIn(IANA_TIMEZONES, { message: "timezone deve ser um fuso IANA válido" })
  timezone?: string;
}
