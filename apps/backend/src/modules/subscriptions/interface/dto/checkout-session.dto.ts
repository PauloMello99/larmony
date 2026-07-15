import { IsIn, IsOptional } from "class-validator";
import { PLAN_CATALOG } from "../../domain/plan-catalog";

const PLAN_KEYS = PLAN_CATALOG.map((p) => p.key);

/**
 * Body do checkout (M16): o usuário escolhe o plano (Essencial/Completo ×
 * mensal/anual) — é esse plano que é cobrado ao fim do trial. Ausente →
 * `DEFAULT_PLAN_KEY` (ver `create-checkout-session.use-case.ts`).
 */
export class CheckoutSessionDto {
  @IsIn(["pt-BR", "en-US", "es-ES", "zh-CN", "de-DE", "fr-FR", "ja-JP"])
  @IsOptional()
  locale?: string;

  @IsIn(PLAN_KEYS)
  @IsOptional()
  planKey?: string;
}
