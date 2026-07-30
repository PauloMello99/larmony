import { GetSocialAuthorizeUrlUseCase } from "./get-social-authorize-url.use-case";
import { UnsupportedSocialProviderException } from "../domain/exceptions/unsupported-social-provider.exception";
import type { IAuthProvider } from "../application/ports/auth-provider.interface";
import type { ConfigService } from "@nestjs/config";

function make() {
  const auth = {
    getSocialAuthorizeUrl: jest.fn(),
  } as unknown as jest.Mocked<IAuthProvider>;
  const config = {
    get: jest.fn().mockReturnValue("http://localhost:3000"),
  } as unknown as jest.Mocked<ConfigService>;
  const uc = new GetSocialAuthorizeUrlUseCase(auth, config);
  return { uc, auth, config };
}

describe("GetSocialAuthorizeUrlUseCase", () => {
  it("provider válido → delega à porta com redirectTo terminando em /auth/callback", async () => {
    const { uc, auth } = make();
    auth.getSocialAuthorizeUrl.mockResolvedValue("https://provider.example/authorize");

    const result = await uc.execute("google");

    expect(auth.getSocialAuthorizeUrl).toHaveBeenCalledWith(
      "google",
      "http://localhost:3000/auth/callback",
    );
    expect(result).toEqual({ url: "https://provider.example/authorize" });
  });

  it("provider inválido → lança UnsupportedSocialProviderException sem chamar a porta", async () => {
    const { uc, auth } = make();

    await expect(uc.execute("facebook")).rejects.toBeInstanceOf(
      UnsupportedSocialProviderException,
    );
    expect(auth.getSocialAuthorizeUrl).not.toHaveBeenCalled();
  });
});
