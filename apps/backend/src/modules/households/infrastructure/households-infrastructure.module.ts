import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { ORGANIZATION_REPOSITORY } from "../domain/household.repository.interface";
import { MEMBER_REPOSITORY } from "../domain/member.repository.interface";
import { INVITATION_REPOSITORY } from "../domain/invitation.repository.interface";
import { HOUSEHOLD_OVERVIEW_REPOSITORY } from "../domain/household-overview.repository.interface";
import { DrizzleHouseholdRepository } from "./persistence/drizzle-household.repository";
import { DrizzleMemberRepository } from "./persistence/drizzle-member.repository";
import { DrizzleInvitationRepository } from "./persistence/drizzle-invitation.repository";
import { DrizzleHouseholdOverviewRepository } from "./persistence/drizzle-household-overview.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: ORGANIZATION_REPOSITORY, useClass: DrizzleHouseholdRepository },
    { provide: MEMBER_REPOSITORY, useClass: DrizzleMemberRepository },
    { provide: INVITATION_REPOSITORY, useClass: DrizzleInvitationRepository },
    { provide: HOUSEHOLD_OVERVIEW_REPOSITORY, useClass: DrizzleHouseholdOverviewRepository },
  ],
  exports: [
    ORGANIZATION_REPOSITORY,
    MEMBER_REPOSITORY,
    INVITATION_REPOSITORY,
    HOUSEHOLD_OVERVIEW_REPOSITORY,
  ],
})
export class HouseholdsInfrastructureModule {}
