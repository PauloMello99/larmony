import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class SignUpDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  /** Aceite obrigatório dos Termos de Uso/Política de Privacidade (LGPD). */
  @IsBoolean()
  @Equals(true, {
    message: "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
  })
  termsAccepted!: boolean;

  /**
   * Locale ativo da UI no cadastro (ADR-0018 + adendo): vira o `users.locale`
   * inicial e o idioma do e-mail de boas-vindas. Ausente → default pt-BR.
   * Espelho manual de SUPPORTED_LOCALES (apps/frontend/src/shared/lib/locale.ts).
   */
  @IsIn(["pt-BR", "en-US", "es-ES", "zh-CN", "de-DE", "fr-FR", "ja-JP"])
  @IsOptional()
  locale?: string;
}
