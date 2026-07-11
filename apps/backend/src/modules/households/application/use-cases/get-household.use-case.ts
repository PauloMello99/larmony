import { Inject, Injectable } from "@nestjs/common";
import type { HouseholdEntity } from "../../domain/household.entity";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import { HouseholdNotFoundException } from "../../domain/exceptions/household-not-found.exception";

@Injectable()
export class GetHouseholdUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
  ) {}

  async execute(householdId: string, authId: string): Promise<HouseholdEntity> {
    const household = await this.householdRepo.findByIdAndAuthId(householdId, authId);
    if (!household) throw new HouseholdNotFoundException(householdId);
    return household;
  }
}
