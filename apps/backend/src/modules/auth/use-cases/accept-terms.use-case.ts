import { Inject, Injectable } from "@nestjs/common";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../user/domain/user.repository.interface";
import { UserEntity } from "../../user/domain/user.entity";
import { UserNotFoundException } from "../../user/domain/exceptions/user-not-found.exception";
import { AuditService } from "../../audit/audit.service";
import { AuthUser } from "../application/ports/auth-provider.interface";
import { TERMS_VERSION } from "../terms-version";

@Injectable()
export class AcceptTermsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(authUser: AuthUser): Promise<UserEntity> {
    const current = await this.userRepo.findByAuthId(authUser.id);
    if (!current) throw new UserNotFoundException(authUser.id);

    const previousVersion = current.termsVersion;
    const updated = await this.userRepo.acceptTerms(authUser.id, TERMS_VERSION);

    // Reusa a action "update" do enum (audit_action) em vez de criar uma nova:
    // re-aceite de termos é um evento de baixa frequência que não justifica
    // uma migration de schema só para nomear a action.
    await this.auditService.log({
      actorId: updated.id,
      action: "update",
      entityType: "terms_acceptance",
      entityId: updated.id,
      metadata: { termsVersion: TERMS_VERSION, previousVersion },
    });

    return updated;
  }
}
