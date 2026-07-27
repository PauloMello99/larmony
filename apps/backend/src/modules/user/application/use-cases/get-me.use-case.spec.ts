import { GetMeUseCase } from "./get-me.use-case";
import { UserNotFoundException } from "../../domain/exceptions/user-not-found.exception";
import { UserEntity } from "../../domain/user.entity";
import type { IUserRepository } from "../../domain/user.repository.interface";
import { TERMS_VERSION } from "../../../auth/terms-version";

function makeUser(termsVersion: string | null) {
  return UserEntity.create({
    id: "user_1",
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
    termsAcceptedAt: termsVersion ? new Date("2026-01-01") : null,
    termsVersion,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  });
}

function make() {
  const userRepo = {
    findByAuthId: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
  const uc = new GetMeUseCase(userRepo);
  return { uc, userRepo };
}

describe("GetMeUseCase", () => {
  it("termsVersion igual à vigente → termsAcceptanceRequired: false", async () => {
    const { uc, userRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(makeUser(TERMS_VERSION));

    const result = await uc.execute({
      id: "auth_1",
      email: "fulano@example.com",
      emailVerified: true,
    });

    expect(result.termsAcceptanceRequired).toBe(false);
  });

  it("termsVersion desatualizada → termsAcceptanceRequired: true", async () => {
    const { uc, userRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(makeUser("2020-01-01"));

    const result = await uc.execute({
      id: "auth_1",
      email: "fulano@example.com",
      emailVerified: true,
    });

    expect(result.termsAcceptanceRequired).toBe(true);
  });

  it("termsVersion nula (conta pré-aceite) → termsAcceptanceRequired: true", async () => {
    const { uc, userRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(makeUser(null));

    const result = await uc.execute({
      id: "auth_1",
      email: "fulano@example.com",
      emailVerified: true,
    });

    expect(result.termsAcceptanceRequired).toBe(true);
  });

  it("usuário inexistente → 404 USER_NOT_FOUND", async () => {
    const { uc, userRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(null);

    await expect(
      uc.execute({ id: "auth_missing", email: "x@example.com", emailVerified: true }),
    ).rejects.toBeInstanceOf(UserNotFoundException);
  });
});
