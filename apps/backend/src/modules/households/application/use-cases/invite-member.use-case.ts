import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../../../mail/application/mail.service";
import type { HouseholdRole } from "../../domain/household.entity";
import type { InvitationEntity } from "../../domain/invitation.entity";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { HouseholdForbiddenException } from "../../domain/exceptions/household-forbidden.exception";
import { HouseholdNotFoundException } from "../../domain/exceptions/household-not-found.exception";
import { InvitationEmailFailedException } from "../../domain/exceptions/invitation-email-failed.exception";

export interface InviteMemberInput {
  householdId: string;
  inviterAuthId: string;
  inviterUserId: string;
  email: string;
  role: HouseholdRole;
}

export interface InviteMemberResult {
  invitation: InvitationEntity;
  /** Link de aceite com o token — exposto para teste manual em dev. */
  acceptUrl: string;
}

@Injectable()
export class InviteMemberUseCase {
  private readonly logger = new Logger(InviteMemberUseCase.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(input: InviteMemberInput): Promise<InviteMemberResult> {
    const household = await this.householdRepo.findByIdAndAuthId(
      input.householdId,
      input.inviterAuthId,
    );
    if (!household) throw new HouseholdNotFoundException(input.householdId);

    const isOwner = await this.householdRepo.isOwner(input.householdId, input.inviterAuthId);
    if (!isOwner) throw new HouseholdForbiddenException();

    const invitation = await this.invitationRepo.create({
      householdId: input.householdId,
      invitedBy: input.inviterUserId,
      email: input.email,
      role: input.role,
    });

    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    const acceptUrl = `${frontendUrl}/invite/accept?token=${invitation.token}`;

    // Envio CRÍTICO: o convidado só recebe o link por e-mail. Se o canal estiver
    // habilitado e o envio falhar, revertemos o convite (saga c/ compensação,
    // igual ao sign-up) e abortamos — o owner pode tentar de novo. Em dev o
    // canal é no-op (send retorna false) e o acceptUrl fica disponível p/ teste.
    try {
      await this.mail.sendHouseholdInvite({
        to: input.email,
        householdName: household.name,
        acceptUrl,
      });
    } catch (err) {
      await this.compensate(invitation.id);
      this.logger.error(
        `Falha ao enviar convite p/ ${input.email} (${household.name}); convite revertido: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new InvitationEmailFailedException(input.email);
    }

    await this.auditService.log({
      actorId: input.inviterUserId,
      householdId: input.householdId,
      action: "invite_sent",
      entityType: "org_invitation",
      entityId: invitation.id,
      metadata: { email: input.email, role: input.role },
    });

    this.logger.log(`Convite p/ ${input.email} (${household.name}): ${acceptUrl}`);
    return { invitation, acceptUrl };
  }

  /** Compensação best-effort: remove o convite órfão após falha de e-mail. */
  private async compensate(invitationId: string): Promise<void> {
    try {
      await this.invitationRepo.delete(invitationId);
    } catch (rollbackErr) {
      this.logger.error(
        `Falha ao reverter convite ${invitationId} após erro de e-mail`,
        rollbackErr instanceof Error ? rollbackErr.stack : undefined,
      );
    }
  }
}
