import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { HandleStripeWebhookUseCase } from "../application/use-cases/handle-stripe-webhook.use-case";

/**
 * Webhook do Stripe (B-3) — público (verificação por assinatura, não guard de
 * auth). `@SkipThrottle()` porque o Stripe pode disparar picos de retry que o
 * throttler global (120/min) bloquearia. Lê o RAW body (habilitado em
 * main.ts/helpers via `{ rawBody: true }`) exigido pela verificação.
 */
@Controller("webhooks/stripe")
@SkipThrottle()
export class StripeWebhookController {
  constructor(private readonly handleWebhook: HandleStripeWebhookUseCase) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ): Promise<{ received: boolean }> {
    // rawBody ausente → payload vazio → verificação falha → 400 (correto).
    await this.handleWebhook.execute(req.rawBody ?? "", signature);
    return { received: true };
  }
}
