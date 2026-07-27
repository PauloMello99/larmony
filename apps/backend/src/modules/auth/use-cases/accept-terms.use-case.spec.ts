import { AcceptTermsUseCase } from "./accept-terms.use-case";
import { UserNotFoundException } from "../../user/domain/exceptions/user-not-found.exception";
import { UserEntity } from "../../user/domain/user.entity";
import type { IUserRepository } from "../../user/domain/user.repository.interface";
import type { AuditService } from "../../audit/audit.service";
import { TERMS_VERSION } from "../terms-version";

function makeUser(overrides: Partial<{ id: string; termsVersion: string | null }> = {}) {
  return UserEntity.create({
    id: overrides.id ?? "user_1",
    authId: "auth_1",
    platformRole: "user",
    name: "Fulano",
    email: "fulano@example.com",
    phone: null,
    avatarUrl: null,
    birthDate: null,
    gender: null,
    locale: "pt-BR",
    onboarding: {},
    termsAcceptedAt: new Date("2026-01-01"),
    termsVersion:
      "termsVersion" in overrides ? (overrides.termsVersion ?? null) : "2026-01-01",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  });
}

function make() {
  const userRepo = {
    findByAuthId: jest.fn(),
    acceptTerms: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;
  const uc = new AcceptTermsUseCase(userRepo, audit);
  return { uc, userRepo, audit };
}

describe("AcceptTermsUseCase", () => {
  it("grava o re-aceite com a versão vigente e audita a versão anterior", async () => {
    const { uc, userRepo, audit } = make();
    const current = makeUser({ termsVersion: "2026-01-01" });
    const updated = makeUser({ termsVersion: TERMS_VERSION });
    userRepo.findByAuthId.mockResolvedValue(current);
    userRepo.acceptTerms.mockResolvedValue(updated);

    const result = await uc.execute({
      id: "auth_1",
      email: "fulano@example.com",
      emailVerified: true,
    });

    expect(userRepo.acceptTerms).toHaveBeenCalledWith("auth_1", TERMS_VERSION);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: updated.id,
        action: "update",
        entityType: "terms_acceptance",
        entityId: updated.id,
        metadata: { termsVersion: TERMS_VERSION, previousVersion: "2026-01-01" },
      }),
    );
    expect(result).toBe(updated);
  });

  it("usuário inexistente → 404 USER_NOT_FOUND, sem gravar nem auditar", async () => {
    const { uc, userRepo, audit } = make();
    userRepo.findByAuthId.mockResolvedValue(null);

    await expect(
      uc.execute({ id: "auth_missing", email: "x@example.com", emailVerified: true }),
    ).rejects.toBeInstanceOf(UserNotFoundException);
    expect(userRepo.acceptTerms).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});
