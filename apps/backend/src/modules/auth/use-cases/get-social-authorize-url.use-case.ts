import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AUTH_PROVIDER, IAuthProvider } from "../application/ports/auth-provider.interface";
import { isSocialProvider } from "../domain/social-providers";
import { UnsupportedSocialProviderException } from "../domain/exceptions/unsupported-social-provider.exception";

@Injectable()
export class GetSocialAuthorizeUrlUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: IAuthProvider,
    private readonly config: ConfigService,
  ) {}

  async execute(provider: string): Promise<{ url: string }> {
    if (!isSocialProvider(provider)) {
      throw new UnsupportedSocialProviderException();
    }
    const frontendUrl = this.config.get<string>("FRONTEND_URL", "http://localhost:3000");
    const redirectTo = `${frontendUrl}/auth/callback`;
    const url = await this.auth.getSocialAuthorizeUrl(provider, redirectTo);
    return { url };
  }
}
