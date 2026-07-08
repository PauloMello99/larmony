import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { MailModule } from "../mail/mail.module";
import { HouseholdsInfrastructureModule } from "./infrastructure/households-infrastructure.module";
import { ListUserHouseholdsUseCase } from "./application/use-cases/list-user-households.use-case";
import { GetHouseholdUseCase } from "./application/use-cases/get-household.use-case";
import { GetHouseholdOverviewUseCase } from "./application/use-cases/get-household-overview.use-case";
import { ResolveHouseholdBySlugUseCase } from "./application/use-cases/resolve-household-by-slug.use-case";
import { CreateHouseholdUseCase } from "./application/use-cases/create-household.use-case";
import { UpdateHouseholdUseCase } from "./application/use-cases/update-household.use-case";
import { DeleteHouseholdUseCase } from "./application/use-cases/delete-household.use-case";
import { TransferOwnershipUseCase } from "./application/use-cases/transfer-ownership.use-case";
import { ListMembersUseCase } from "./application/use-cases/list-members.use-case";
import { InviteMemberUseCase } from "./application/use-cases/invite-member.use-case";
import { UpdateMemberRoleUseCase } from "./application/use-cases/update-member-role.use-case";
import { UpdateMemberPermissionsUseCase } from "./application/use-cases/update-member-permissions.use-case";
import { SetMemberStatusUseCase } from "./application/use-cases/set-member-status.use-case";
import { RemoveMemberUseCase } from "./application/use-cases/remove-member.use-case";
import { ListInvitationsUseCase } from "./application/use-cases/list-invitations.use-case";
import { CancelInvitationUseCase } from "./application/use-cases/cancel-invitation.use-case";
import { GetInvitationByTokenUseCase } from "./application/use-cases/get-invitation-by-token.use-case";
import { AcceptInvitationUseCase } from "./application/use-cases/accept-invitation.use-case";
import { DeclineInvitationUseCase } from "./application/use-cases/decline-invitation.use-case";
import { HouseholdsController } from "./interface/households.controller";
import { InvitationsController } from "./interface/invitations.controller";

@Module({
  imports: [AuthModule, UserModule, MailModule, HouseholdsInfrastructureModule],
  controllers: [HouseholdsController, InvitationsController],
  providers: [
    ListUserHouseholdsUseCase,
    GetHouseholdUseCase,
    GetHouseholdOverviewUseCase,
    ResolveHouseholdBySlugUseCase,
    CreateHouseholdUseCase,
    UpdateHouseholdUseCase,
    DeleteHouseholdUseCase,
    TransferOwnershipUseCase,
    ListMembersUseCase,
    InviteMemberUseCase,
    UpdateMemberRoleUseCase,
    UpdateMemberPermissionsUseCase,
    SetMemberStatusUseCase,
    RemoveMemberUseCase,
    ListInvitationsUseCase,
    CancelInvitationUseCase,
    GetInvitationByTokenUseCase,
    AcceptInvitationUseCase,
    DeclineInvitationUseCase,
  ],
})
export class HouseholdsModule {}
