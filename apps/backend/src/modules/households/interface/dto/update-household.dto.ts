import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { IANA_TIMEZONES } from "../../../../common/time/timezones";

export class UpdateHouseholdDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  /** Fuso IANA do lar (M12). */
  @IsOptional()
  @IsIn(IANA_TIMEZONES, { message: "timezone deve ser um fuso IANA válido" })
  timezone?: string;

  /** Hora local (0–23) a partir da qual lembrete/relatório podem sair (M12). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  notificationHour?: number;
}
