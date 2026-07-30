import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { SOCIAL_PROVIDERS, SocialProvider } from "../domain/social-providers";

export class SocialCallbackDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @IsNotEmpty()
  refreshToken!: string;

  @IsInt()
  expiresAt!: number;

  @IsIn(SOCIAL_PROVIDERS)
  socialProvider!: SocialProvider;

  /** Espelho manual de SUPPORTED_LOCALES (apps/frontend/src/shared/lib/locale.ts). */
  @IsIn(["pt-BR", "en-US", "es-ES", "zh-CN", "de-DE", "fr-FR", "ja-JP"])
  @IsOptional()
  locale?: string;
}
