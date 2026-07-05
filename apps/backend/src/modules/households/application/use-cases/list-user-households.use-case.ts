import { Inject, Injectable } from "@nestjs/common";
import type { HouseholdEntity } from "../../domain/household.entity";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";

@Injectable()
export class ListUserHouseholdsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
  ) {}

  execute(authId: string): Promise<HouseholdEntity[]> {
    return this.householdRepo.findAllByAuthId(authId);
  }
}
