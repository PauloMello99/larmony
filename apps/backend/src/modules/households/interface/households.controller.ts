import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { ListUserHouseholdsUseCase } from "../application/use-cases/list-user-households.use-case";
import { GetHouseholdUseCase } from "../application/use-cases/get-household.use-case";
import { GetHouseholdOverviewUseCase } from "../application/use-cases/get-household-overview.use-case";
import { ResolveHouseholdBySlugUseCase } from "../application/use-cases/resolve-household-by-slug.use-case";
import { CreateHouseholdUseCase } from "../application/use-cases/create-household.use-case";
import { UpdateHouseholdUseCase } from "../application/use-cases/update-household.use-case";
import { DeleteHouseholdUseCase } from "../application/use-cases/delete-household.use-case";
import { TransferOwnershipUseCase } from "../application/use-cases/transfer-ownership.use-case";
import { ListMembersUseCase } from "../application/use-cases/list-members.use-case";
import { InviteMemberUseCase } from "../application/use-cases/invite-member.use-case";
import { UpdateMemberRoleUseCase } from "../application/use-cases/update-member-role.use-case";
import { UpdateMemberPermissionsUseCase } from "../application/use-cases/update-member-permissions.use-case";
import { SetMemberStatusUseCase } from "../application/use-cases/set-member-status.use-case";
import { RemoveMemberUseCase } from "../application/use-cases/remove-member.use-case";
import { ListInvitationsUseCase } from "../application/use-cases/list-invitations.use-case";
import { CancelInvitationUseCase } from "../application/use-cases/cancel-invitation.use-case";
import { CreateHouseholdDto } from "./dto/create-household.dto";
import { UpdateHouseholdDto } from "./dto/update-household.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import { UpdateMemberPermissionsDto } from "./dto/update-member-permissions.dto";
import { SetMemberStatusDto } from "./dto/set-member-status.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";

@Controller("households")
@UseGuards(AuthGuard)
export class HouseholdsController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listUserHouseholds: ListUserHouseholdsUseCase,
    private readonly getHousehold: GetHouseholdUseCase,
    private readonly getHouseholdOverview: GetHouseholdOverviewUseCase,
    private readonly resolveHouseholdBySlug: ResolveHouseholdBySlugUseCase,
    private readonly createHousehold: CreateHouseholdUseCase,
    private readonly updateHousehold: UpdateHouseholdUseCase,
    private readonly deleteHousehold: DeleteHouseholdUseCase,
    private readonly transferOwnership: TransferOwnershipUseCase,
    private readonly listMembers: ListMembersUseCase,
    private readonly inviteMember: InviteMemberUseCase,
    private readonly updateMemberRole: UpdateMemberRoleUseCase,
    private readonly updateMemberPermissions: UpdateMemberPermissionsUseCase,
    private readonly setMemberStatus: SetMemberStatusUseCase,
    private readonly removeMember: RemoveMemberUseCase,
    private readonly listInvitations: ListInvitationsUseCase,
    private readonly cancelInvitation: CancelInvitationUseCase,
  ) {}

  /* ─── Household CRUD ──────────────────────────────────────────────── */

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.listUserHouseholds.execute(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHouseholdDto) {
    return this.createHousehold.execute(dto.name, user.id);
  }

  /** Resolve por slug (membro ou super_admin). Antes de `:householdId` por ser path fixo. */
  @Get("by-slug/:slug")
  bySlug(@Param("slug") slug: string, @CurrentUser() user: AuthUser) {
    return this.resolveHouseholdBySlug.execute(slug, user.id);
  }

  @Get(":householdId")
  get(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getHousehold.execute(householdId, user.id);
  }

  /** KPIs do dashboard (mês corrente + anterior, metas, contas, orçamentos). */
  @Get(":householdId/overview")
  overview(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getHouseholdOverview.execute(householdId, user.id);
  }

  @Patch(":householdId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateHouseholdDto,
  ) {
    return this.updateHousehold.execute(householdId, user.id, dto);
  }

  @Delete(":householdId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteHousehold.execute(householdId, user.id);
  }

  @Post(":householdId/transfer-ownership")
  @HttpCode(HttpStatus.NO_CONTENT)
  async transfer(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: TransferOwnershipDto,
  ) {
    await this.transferOwnership.execute(householdId, dto.memberId, user.id);
  }

  /* ─── Members ───────────────────────────────────────────────── */

  @Get(":householdId/members")
  @UseGuards(HouseholdMembershipGuard)
  getMembers(@Param("householdId", ParseUUIDPipe) householdId: string) {
    return this.listMembers.execute(householdId);
  }

  @Post(":householdId/members/invite")
  async invite(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() authUser: AuthUser,
    @Body() dto: InviteMemberDto,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.inviteMember.execute({
      householdId,
      inviterAuthId: authUser.id,
      inviterUserId: user.id,
      email: dto.email,
      role: dto.role ?? "member",
    });
  }

  @Patch(":householdId/members/:memberId/role")
  updateRole(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.updateMemberRole.execute(householdId, memberId, user.id, dto.role);
  }

  @Patch(":householdId/members/:memberId/permissions")
  updatePermissions(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberPermissionsDto,
  ) {
    return this.updateMemberPermissions.execute(
      householdId,
      memberId,
      user.id,
      dto.permissions,
    );
  }

  @Patch(":householdId/members/:memberId/status")
  setStatus(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SetMemberStatusDto,
  ) {
    return this.setMemberStatus.execute(householdId, memberId, user.id, dto.enabled);
  }

  @Delete(":householdId/members/:memberId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOneMember(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.removeMember.execute(householdId, memberId, user.id);
  }

  /* ─── Invitations ───────────────────────────────────────────── */

  @Get(":householdId/invitations")
  getInvitations(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.listInvitations.execute(householdId, user.id);
  }

  @Delete(":householdId/invitations/:invId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOneInvitation(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("invId", ParseUUIDPipe) invId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.cancelInvitation.execute(householdId, invId, user.id);
  }
}
