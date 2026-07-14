import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Alvo (household ou usuário) inexistente numa operação de plataforma. */
export class PlatformTargetNotFoundException extends DomainException {
  readonly code = "PLATFORM_TARGET_NOT_FOUND";

  constructor(what: string) {
    super(`Platform target not found: ${what}`);
  }
}

/** Um super_admin não pode rebaixar a si mesmo (evita lockout). */
export class CannotChangeOwnPlatformRoleException extends DomainException {
  readonly code = "CANNOT_CHANGE_OWN_PLATFORM_ROLE";

  constructor() {
    super("You cannot change your own platform role");
  }
}

/**
 * Suspender um lar com assinatura Stripe VIVA sem cancelá-la manteria a
 * cobrança com o acesso bloqueado (inaceitável — CDC). O 409 é a rede de
 * segurança: o admin precisa pedir explicitamente o cancelamento junto
 * (`cancelStripeSubscription: true`).
 */
export class HouseholdHasActiveSubscriptionException extends DomainException {
  readonly code = "HOUSEHOLD_HAS_ACTIVE_SUBSCRIPTION";

  constructor() {
    super(
      "Household has an active Stripe subscription — cancel it (cancelStripeSubscription: true) to suspend",
    );
  }
}
