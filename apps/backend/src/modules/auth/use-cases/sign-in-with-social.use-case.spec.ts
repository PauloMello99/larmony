import { ConfigService } from "@nestjs/config";
import {
  SignInWithSocialInput,
  SignInWithSocialUseCase,
} from "./sign-in-with-social.use-case";
import { SocialEmailAlreadyRegisteredException } from "../domain/exceptions/social-email-already-registered.exception";
import { AuthTokenExpiredException } from "../domain/exceptions/auth-token-expired.exception";
import { UserEntity } from "../../user/domain/user.entity";
import type { IUserRepository } from "../../user/domain/user.repository.interface";
import type { IAuthProvider } from "../application/ports/auth-provider.interface";
import type { AuditService } from "../../audit/audit.service";
import type { MailService } from "../../mail/application/mail.service";

function makeUser(overrides: Partial<{ id: string; authId: string }> = {}) {
  return UserEntity.create({
    id: overrides.id ?? "user_1",
    authId: overrides.authId ?? "auth_1",
    platformRole: "user",
    name: "Fulano",
    email: "fulano@example.com",
    phone: null,
    avatarUrl: null,
    birthDate: null,
    gender: null,
    locale: "pt-BR",
    onboarding: {},
    termsAcceptedAt: null,
    termsVersion: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  });
}

function makeInput(
  overrides: Partial<SignInWithSocialInput> = {},
): SignInWithSocialInput {
  return {
    accessToken: "access_1",
    refreshToken: "refresh_1",
    expiresAt: 12345,
    socialProvider: "google",
    locale: "pt-BR",
    ...overrides,
  };
}

function make() {
  const auth = {
    verifyToken: jest.fn(),
    deleteUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IAuthProvider>;
  const userRepo = {
    findByAuthId: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
  const mail = {
    sendWelcome: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<MailService>;
  const config = {
    get: jest.fn().mockReturnValue("https://app.larmony.me"),
  } as unknown as jest.Mocked<ConfigService>;
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;
  const uc = new SignInWithSocialUseCase(auth, userRepo, mail, config, audit);
  return { uc, auth, userRepo, mail, config, audit };
}

describe("SignInWithSocialUseCase", () => {
  it("usuário novo (verificado, sem colisão) → cria com termsVersion null e audita", async () => {
    const { uc, auth, userRepo, mail, audit } = make();
    auth.verifyToken.mockResolvedValue({
      id: "auth_new",
      email: "novo@example.com",
      emailVerified: true,
    });
    userRepo.findByAuthId.mockResolvedValue(null);
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.create.mockResolvedValue(makeUser({ id: "user_new", authId: "auth_new" }));

    const result = await uc.execute(makeInput());

    expect(userRepo.create).toHaveBeenCalledWith({
      authId: "auth_new",
      email: "novo@example.com",
      name: "novo",
      termsVersion: null,
      locale: "pt-BR",
    });
    expect(result.isNewUser).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "user_new",
        action: "create",
        entityType: "user",
        entityId: "user_new",
        metadata: expect.objectContaining({
          name: "novo",
          email: "novo@example.com",
          termsVersion: null,
          socialProvider: "google",
        }),
      }),
    );
    expect(mail.sendWelcome).toHaveBeenCalled();
  });

  it("usuário existente → não cria, não audita, não envia welcome", async () => {
    const { uc, auth, userRepo, mail, audit } = make();
    auth.verifyToken.mockResolvedValue({
      id: "auth_1",
      email: "fulano@example.com",
      emailVerified: true,
    });
    userRepo.findByAuthId.mockResolvedValue(makeUser());

    const result = await uc.execute(makeInput());

    expect(userRepo.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(mail.sendWelcome).not.toHaveBeenCalled();
    expect(result.isNewUser).toBe(false);
    expect(result.accessToken).toBe("access_1");
    expect(result.refreshToken).toBe("refresh_1");
    expect(result.expiresAt).toBe(12345);
  });

  it("token inválido/expirado → propaga AuthTokenExpiredException, create nunca é chamado", async () => {
    const { uc, auth, userRepo } = make();
    auth.verifyToken.mockRejectedValue(
      new AuthTokenExpiredException("Invalid or expired token"),
    );

    await expect(uc.execute(makeInput())).rejects.toBeInstanceOf(
      AuthTokenExpiredException,
    );
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("falha no welcome e-mail não quebra o login", async () => {
    const { uc, auth, userRepo, mail } = make();
    auth.verifyToken.mockResolvedValue({
      id: "auth_new",
      email: "novo@example.com",
      emailVerified: true,
    });
    userRepo.findByAuthId.mockResolvedValue(null);
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.create.mockResolvedValue(makeUser({ id: "user_new", authId: "auth_new" }));
    mail.sendWelcome.mockRejectedValue(new Error("smtp down"));

    const result = await uc.execute(makeInput());

    expect(result.isNewUser).toBe(true);
  });

  it("colisão de e-mail → lança SocialEmailAlreadyRegisteredException e compensa (deleteUser), create nunca é chamado", async () => {
    const { uc, auth, userRepo } = make();
    auth.verifyToken.mockResolvedValue({
      id: "auth_new",
      email: "existente@example.com",
      emailVerified: true,
    });
    userRepo.findByAuthId.mockResolvedValue(null);
    userRepo.findByEmail.mockResolvedValue(
      makeUser({ id: "user_other", authId: "auth_other" }),
    );

    await expect(uc.execute(makeInput())).rejects.toBeInstanceOf(
      SocialEmailAlreadyRegisteredException,
    );
    expect(auth.deleteUser).toHaveBeenCalledWith("auth_new");
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("emailVerified false → lança SocialEmailAlreadyRegisteredException sem checar colisão, create nunca é chamado", async () => {
    const { uc, auth, userRepo } = make();
    auth.verifyToken.mockResolvedValue({
      id: "auth_new",
      email: "novo@example.com",
      emailVerified: false,
    });
    userRepo.findByAuthId.mockResolvedValue(null);

    await expect(uc.execute(makeInput())).rejects.toBeInstanceOf(
      SocialEmailAlreadyRegisteredException,
    );
    expect(auth.deleteUser).toHaveBeenCalledWith("auth_new");
    expect(userRepo.create).not.toHaveBeenCalled();
  });
});
