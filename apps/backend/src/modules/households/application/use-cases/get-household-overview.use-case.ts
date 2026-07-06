import { Inject, Injectable } from "@nestjs/common";
import {
  ORGANIZATION_REPOSITORY,
  type IHouseholdRepository,
} from "../../domain/household.repository.interface";
import { HouseholdNotFoundException } from "../../domain/exceptions/household-not-found.exception";
import {
  HOUSEHOLD_OVERVIEW_REPOSITORY,
  type HouseholdOverviewData,
  type IHouseholdOverviewRepository,
} from "../../domain/household-overview.repository.interface";

@Injectable()
export class GetHouseholdOverviewUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    @Inject(HOUSEHOLD_OVERVIEW_REPOSITORY)
    private readonly overviewRepo: IHouseholdOverviewRepository,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    now: Date = new Date(),
  ): Promise<HouseholdOverviewData> {
    // Reaproveita a verificação de acesso do GetHouseholdUseCase (membership
    // ou super_admin no miss-path) — mesma regra em toda leitura escopada.
    const household = await this.householdRepo.findByIdAndAuthId(householdId, authId);
    if (!household) throw new HouseholdNotFoundException(householdId);

    return this.overviewRepo.getOverview(householdId, now);
  }
}
