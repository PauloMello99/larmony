import { IsIn, IsOptional } from "class-validator";

/**
 * Body opcional do checkout/portal: locale ativo da UI — a página hospedada do
 * Stripe abre no idioma que o usuário está vendo (adendo ADR-0018). Ausente →
 * default pt-BR. Espelho manual de SUPPORTED_LOCALES
 * (apps/frontend/src/shared/lib/locale.ts).
 */
export class SessionLocaleDto {
  @IsIn(["pt-BR", "en-US", "es-ES", "zh-CN", "de-DE", "fr-FR", "ja-JP"])
  @IsOptional()
  locale?: string;
}
