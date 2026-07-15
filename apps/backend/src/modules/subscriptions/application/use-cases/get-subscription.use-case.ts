import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import type { SubscriptionEntity } from "../../domain/subscription.entity";
import {
  EntitlementsService,
  type ResolvedEntitlements,
} from "../entitlements.service";

export type SubscriptionWithEntitlements = SubscriptionEntity & {
  entitlements: ResolvedEntitlements;
};

@Injectable()
export class GetSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    private readonly entitlements: EntitlementsService,
  ) {}

  async execute(householdId: string): Promise<SubscriptionWithEntitlements> {
    // Campos top-level da entidade preservados (contrato dos e2e de B-2/B-3);
    // `entitlements` é o estado resolvido que o paywall do B-6 consome.
    const subscription = await this.repo.getOrCreate(householdId);
    const entitlements = await this.entitlements.resolve(householdId);
    return { ...subscription, entitlements };
  }
}
