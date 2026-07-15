import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMeDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  // Espelho manual de SUPPORTED_LOCALES (apps/frontend/src/shared/lib/locale.ts).
  @IsIn(["pt-BR", "en-US", "es-ES", "zh-CN", "de-DE", "fr-FR", "ja-JP"])
  @IsOptional()
  locale?: string;
}
