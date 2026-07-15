import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";
import { EntitlementsService } from "../../application/entitlements.service";
import { SubscriptionRequiredException } from "../../domain/exceptions/subscription-required.exception";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Bloqueia ESCRITA (POST/PATCH/PUT/DELETE) em rotas household-scoped quando o
 * lar não tem assinatura ativa (plano `locked` — M16): sem assinatura = acesso
 * somente-leitura. Leituras passam livres.
 *
 * Aplicado por-controller **depois** de `AuthGuard` + `HouseholdMembershipGuard`
 * (NUNCA global: um guard global roda antes do Auth e o `resolve`→`getOrCreate`
 * inseriria linha pré-auth para qualquer UUID). O checkout/portal ficam livres
 * por construção — não se aplica este guard no subscription controller.
 *
 * Passa quando não há `householdId` no param (ex.: criar o 1º lar): o próprio
 * lar novo nasce locked e é o gate de trial do onboarding que conduz à
 * assinatura; as escritas DENTRO do lar é que ficam bloqueadas aqui.
 */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(private readonly entitlements: EntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (READ_METHODS.has(request.method)) return true;

    const householdId = request.params?.householdId;
    if (typeof householdId !== "string" || !householdId) return true;

    const ent = await this.entitlements.resolve(householdId);
    if (ent.plan === "locked") {
      throw new SubscriptionRequiredException();
    }
    return true;
  }
}
