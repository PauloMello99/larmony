import { Module } from "@nestjs/common";
import { GetMeUseCase } from "./application/use-cases/get-me.use-case";
import { CompleteOnboardingUseCase } from "./application/use-cases/complete-onboarding.use-case";
import { UserInfrastructureModule } from "./infrastructure/user-infrastructure.module";

@Module({
  imports: [UserInfrastructureModule],
  providers: [GetMeUseCase, CompleteOnboardingUseCase],
  exports: [UserInfrastructureModule, GetMeUseCase, CompleteOnboardingUseCase],
})
export class UserModule {}
