import { Inject, Injectable } from "@nestjs/common";
import { AuthUser } from "../../../auth/application/ports/auth-provider.interface";
import { UserEntity } from "../../domain/user.entity";
import { UserNotFoundException } from "../../domain/exceptions/user-not-found.exception";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../domain/user.repository.interface";

export interface CompleteOnboardingInput {
  /** Chave do tour concluído (ex.: "sidebar", "transaction-form"). */
  key: string;
  /** Versão do tour vista pelo usuário. */
  version: number;
}

/**
 * Marca um tour de onboarding como concluído para o usuário atual, fazendo merge
 * atômico `{ [key]: version }` no mapa `onboarding` (ver ADR de onboarding).
 */
@Injectable()
export class CompleteOnboardingUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    authUser: AuthUser,
    input: CompleteOnboardingInput,
  ): Promise<UserEntity> {
    const current = await this.userRepo.findByAuthId(authUser.id);
    if (!current) throw new UserNotFoundException(authUser.id);

    return this.userRepo.mergeOnboarding(authUser.id, {
      [input.key]: input.version,
    });
  }
}
