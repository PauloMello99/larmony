import { IsBoolean, IsOptional } from "class-validator";

export class SetSuspendedDto {
  @IsBoolean()
  suspended!: boolean;

  /**
   * Exigido para suspender lar com assinatura Stripe viva: cancela no Stripe
   * (crédito proporcional) antes de suspender. Sem ele → 409
   * HOUSEHOLD_HAS_ACTIVE_SUBSCRIPTION (nunca bloquear acesso cobrando).
   */
  @IsOptional()
  @IsBoolean()
  cancelStripeSubscription?: boolean;
}
