import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import type { SubscriptionEntity } from "../../domain/subscription.entity";

@Injectable()
export class GetSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
  ) {}

  execute(householdId: string): Promise<SubscriptionEntity> {
    return this.repo.getOrCreate(householdId);
  }
}
