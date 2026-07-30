import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AuthUser } from "../application/ports/auth-provider.interface";
import {
  AUTH_PROVIDER,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";
import {
  USER_REPOSITORY,
  IUserRepository,
} from "../../user/domain/user.repository.interface";
import {
  MEMBER_REPOSITORY,
  IMemberRepository,
} from "../../households/domain/member.repository.interface";
import { AuditService } from "../../audit/audit.service";
import { UserNotFoundException } from "../../user/domain/exceptions/user-not-found.exception";
import { OwnsHouseholdException } from "../../user/domain/exceptions/owns-household.exception";

@Injectable()
export class DeleteAccountUseCase {
  private readonly logger = new Logger(DeleteAccountUseCase.name);

  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(MEMBER_REPOSITORY) private readonly memberRepo: IMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(authUser: AuthUser): Promise<void> {
    const user = await this.userRepo.findByAuthId(authUser.id);
    if (!user) throw new UserNotFoundException(authUser.id);

    // Regra ACC-1: não pode haver household da qual o usuário ainda é proprietário.
    const owned = await this.memberRepo.countOwnedHouseholds(user.id);
    if (owned > 0) throw new OwnsHouseholdException();

    // Captura TODAS as identidades (senha, Google, Apple) ANTES de deletar o
    // usuário local — a FK cascade de user_identities apaga essas linhas
    // junto com `users`, então precisamos dos auth_id antes pra limpar cada
    // uma no provedor (senão ficam órfãs no GoTrue).
    const identityAuthIds = await this.userRepo.listIdentityAuthIds(user.id);
    const authIdsToClean =
      identityAuthIds.length > 0 ? identityAuthIds : [authUser.id];

    // Remove vínculos de funcionário em outras households, o registro do usuário
    // (cascade em user_identities) e cada identidade no provedor de auth.
    await this.memberRepo.removeAllByUserId(user.id);
    await this.userRepo.delete(authUser.id);
    await this.deleteAllProviderIdentities(authIdsToClean);

    await this.auditService.log({
      actorId: user.id,
      action: "delete",
      entityType: "user",
      entityId: user.id,
      metadata: { email: user.email },
    });
  }

  /** Best-effort: uma falha ao remover uma identidade não impede as demais. */
  private async deleteAllProviderIdentities(authIds: string[]): Promise<void> {
    for (const authId of authIds) {
      try {
        await this.authProvider.deleteUser(authId);
      } catch (err) {
        this.logger.error(
          `Falha ao remover identidade ${authId} no provedor durante exclusão de conta`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
  }
}
