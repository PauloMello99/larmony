import { DeleteAccountUseCase } from "./delete-account.use-case";
import { UserNotFoundException } from "../../user/domain/exceptions/user-not-found.exception";
import { OwnsHouseholdException } from "../../user/domain/exceptions/owns-household.exception";
import { UserEntity } from "../../user/domain/user.entity";
import type { IUserRepository } from "../../user/domain/user.repository.interface";
import type { IMemberRepository } from "../../households/domain/member.repository.interface";
import type {
  IAuthProvider,
  AuthUser,
} from "../application/ports/auth-provider.interface";
import type { AuditService } from "../../audit/audit.service";

function makeUser(overrides: Partial<{ id: string }> = {}) {
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
    termsAcceptedAt: null,
    termsVersion: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  });
}

const authUser: AuthUser = {
  id: "auth_1",
  email: "fulano@example.com",
  emailVerified: true,
};

function make() {
  const authProvider = {
    deleteUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IAuthProvider>;
  const userRepo = {
    findByAuthId: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    listIdentityAuthIds: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>;
  const memberRepo = {
    countOwnedHouseholds: jest.fn(),
    removeAllByUserId: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IMemberRepository>;
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;
  const uc = new DeleteAccountUseCase(authProvider, userRepo, memberRepo, audit);
  return { uc, authProvider, userRepo, memberRepo, audit };
}

describe("DeleteAccountUseCase", () => {
  it("usuário com 2 identidades → remove cada uma no provedor", async () => {
    const { uc, authProvider, userRepo, memberRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(makeUser());
    memberRepo.countOwnedHouseholds.mockResolvedValue(0);
    userRepo.listIdentityAuthIds.mockResolvedValue(["auth_1", "auth_google_1"]);

    await uc.execute(authUser);

    expect(authProvider.deleteUser).toHaveBeenCalledTimes(2);
    expect(authProvider.deleteUser).toHaveBeenCalledWith("auth_1");
    expect(authProvider.deleteUser).toHaveBeenCalledWith("auth_google_1");
  });

  it("usuário com 1 identidade só → deleteUser chamado 1x (sem regressão)", async () => {
    const { uc, authProvider, userRepo, memberRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(makeUser());
    memberRepo.countOwnedHouseholds.mockResolvedValue(0);
    userRepo.listIdentityAuthIds.mockResolvedValue(["auth_1"]);

    await uc.execute(authUser);

    expect(authProvider.deleteUser).toHaveBeenCalledTimes(1);
    expect(authProvider.deleteUser).toHaveBeenCalledWith("auth_1");
  });

  it("uma das chamadas de deleteUser falha → a outra ainda é tentada, e execute não lança", async () => {
    const { uc, authProvider, userRepo, memberRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(makeUser());
    memberRepo.countOwnedHouseholds.mockResolvedValue(0);
    userRepo.listIdentityAuthIds.mockResolvedValue(["auth_1", "auth_google_1"]);
    authProvider.deleteUser.mockImplementation((authId: string) => {
      if (authId === "auth_1") return Promise.reject(new Error("provider down"));
      return Promise.resolve(undefined);
    });

    await expect(uc.execute(authUser)).resolves.toBeUndefined();

    expect(authProvider.deleteUser).toHaveBeenCalledTimes(2);
    expect(authProvider.deleteUser).toHaveBeenCalledWith("auth_1");
    expect(authProvider.deleteUser).toHaveBeenCalledWith("auth_google_1");
  });

  it("listIdentityAuthIds vazio → fallback usa o auth_id da sessão atual", async () => {
    const { uc, authProvider, userRepo, memberRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(makeUser());
    memberRepo.countOwnedHouseholds.mockResolvedValue(0);
    userRepo.listIdentityAuthIds.mockResolvedValue([]);

    await uc.execute(authUser);

    expect(authProvider.deleteUser).toHaveBeenCalledTimes(1);
    expect(authProvider.deleteUser).toHaveBeenCalledWith("auth_1");
  });

  it("usuário ainda dono de household → lança OwnsHouseholdException sem tocar em delete/deleteUser/listIdentityAuthIds", async () => {
    const { uc, authProvider, userRepo, memberRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(makeUser());
    memberRepo.countOwnedHouseholds.mockResolvedValue(1);

    await expect(uc.execute(authUser)).rejects.toBeInstanceOf(
      OwnsHouseholdException,
    );

    expect(userRepo.delete).not.toHaveBeenCalled();
    expect(authProvider.deleteUser).not.toHaveBeenCalled();
    expect(userRepo.listIdentityAuthIds).not.toHaveBeenCalled();
  });

  it("usuário não encontrado → lança UserNotFoundException", async () => {
    const { uc, userRepo } = make();
    userRepo.findByAuthId.mockResolvedValue(null);

    await expect(uc.execute(authUser)).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });
});
