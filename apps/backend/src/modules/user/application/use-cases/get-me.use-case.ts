import { Inject, Injectable } from "@nestjs/common";
import { AuthUser } from "../../../auth/application/ports/auth-provider.interface";
import { TERMS_VERSION } from "../../../auth/terms-version";
import { UserEntity } from "../../domain/user.entity";
import { UserNotFoundException } from "../../domain/exceptions/user-not-found.exception";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../domain/user.repository.interface";

/** `UserEntity` + flag computada indicando se o re-aceite de termos é necessário. */
export type MeResult = UserEntity & {
  /** true quando `termsVersion` do usuário difere da vigente (re-aceite bloqueante). */
  termsAcceptanceRequired: boolean;
};

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(authUser: AuthUser): Promise<MeResult> {
    const user = await this.userRepo.findByAuthId(authUser.id);
    if (!user) throw new UserNotFoundException(authUser.id);
    return {
      ...user,
      termsAcceptanceRequired: user.termsVersion !== TERMS_VERSION,
    };
  }
}
