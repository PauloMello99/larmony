import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../../mail/application/mail.service";
import {
  AUTH_PROVIDER,
  AuthSession,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../user/domain/user.repository.interface";
import { AuditService } from "../../audit/audit.service";
import { SocialProvider } from "../domain/social-providers";
import { SocialEmailAlreadyRegisteredException } from "../domain/exceptions/social-email-already-registered.exception";

export interface SignInWithSocialInput {
  accessToken: string;
  /**
   * Tokens já lidos pelo front do fragment da URL após o redirect do
   * Supabase (implicit flow). O backend não tem como re-obtê-los sem
   * queimar um refresh — apenas ecoa de volta na sessão devolvida.
   */
  refreshToken: string;
  expiresAt: number;
  /** Só para audit log/metadata — não influencia a lógica de identidade. */
  socialProvider: SocialProvider;
  locale?: string;
}

export type SignInWithSocialResult = AuthSession & { isNewUser: boolean };

@Injectable()
export class SignInWithSocialUseCase {
  private readonly logger = new Logger(SignInWithSocialUseCase.name);

  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(input: SignInWithSocialInput): Promise<SignInWithSocialResult> {
    // Verifica a identidade primeiro, sem side-effect: se o token for
    // inválido/expirado, verifyToken já lança a exceção de auth apropriada.
    const authUser = await this.auth.verifyToken(input.accessToken);

    const existing = await this.userRepo.findByAuthId(authUser.id);
    if (existing) {
      return {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        user: authUser,
        isNewUser: false,
      };
    }

    // Não dá pra confiar em e-mail não verificado para nenhuma decisão de
    // identidade — rejeitamos antes mesmo de checar colisão.
    if (!authUser.emailVerified) {
      await this.rollbackAuthUser(authUser.id);
      throw new SocialEmailAlreadyRegisteredException();
    }

    // Usuário genuinamente novo no GoTrue, mas o e-mail pode já ter conta
    // local com um auth_id diferente. Rejeitamos e não fundimos (rebind de
    // auth_id seria risco de account takeover); compensamos removendo a
    // identidade social recém-criada no provedor.
    const emailCollision = await this.userRepo.findByEmail(authUser.email);
    if (emailCollision) {
      await this.rollbackAuthUser(authUser.id);
      throw new SocialEmailAlreadyRegisteredException();
    }

    // AuthUser não carrega nome (Apple só manda na 1ª autorização, e não
    // temos acesso a esse claim aqui) — usamos a parte local do e-mail.
    const [localPart] = authUser.email.split("@");
    const name = localPart ?? authUser.email;

    let createdUserId: string | null = null;
    try {
      const created = await this.userRepo.create({
        authId: authUser.id,
        email: authUser.email,
        name,
        // ADR-0031: modal bloqueante de primeiro aceite intercepta.
        termsVersion: null,
        locale: input.locale,
      });
      createdUserId = created.id;
    } catch (err) {
      await this.rollbackAuthUser(authUser.id);
      throw err;
    }

    await this.auditService.log({
      actorId: createdUserId,
      action: "create",
      entityType: "user",
      entityId: createdUserId,
      metadata: {
        name,
        email: authUser.email,
        termsVersion: null,
        socialProvider: input.socialProvider,
      },
    });

    // E-mail de boas-vindas: best-effort — nunca quebra/bloqueia o login.
    try {
      const appUrl = this.config.get<string>("FRONTEND_URL");
      await this.mail.sendWelcome({
        to: authUser.email,
        name,
        appUrl,
        locale: input.locale,
      });
    } catch (mailErr) {
      this.logger.warn(
        `Falha ao enviar welcome para ${authUser.email}: ${
          mailErr instanceof Error ? mailErr.message : String(mailErr)
        }`,
      );
    }

    return {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      user: authUser,
      isNewUser: true,
    };
  }

  /** Compensação best-effort: remove a identidade órfã no provedor de auth. */
  private async rollbackAuthUser(authId: string): Promise<void> {
    try {
      await this.auth.deleteUser(authId);
    } catch (rollbackErr) {
      this.logger.error(
        `Falha ao reverter auth user órfão ${authId} após erro no login social`,
        rollbackErr instanceof Error ? rollbackErr.stack : undefined,
      );
    }
  }
}
