import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { ActiveSubscriptionGuard } from "../../subscriptions/interface/guards/active-subscription.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { CreateStatementImportJobUseCase } from "../application/use-cases/create-statement-import-job.use-case";
import { ListStatementImportCandidatesUseCase } from "../application/use-cases/list-statement-import-candidates.use-case";
import { ConfirmStatementImportCandidateUseCase } from "../application/use-cases/confirm-statement-import-candidate.use-case";
import { DismissStatementImportCandidateUseCase } from "../application/use-cases/dismiss-statement-import-candidate.use-case";
import { CreateStatementImportJobDto } from "./dto/create-statement-import-job.dto";
import { ConfirmStatementImportCandidateDto } from "./dto/confirm-statement-import-candidate.dto";

@Controller("households/:householdId/statement-imports")
@UseGuards(AuthGuard, HouseholdMembershipGuard, ActiveSubscriptionGuard)
export class StatementImportsController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly createJob: CreateStatementImportJobUseCase,
    private readonly listCandidates: ListStatementImportCandidatesUseCase,
    private readonly confirmCandidate: ConfirmStatementImportCandidateUseCase,
    private readonly dismissCandidate: DismissStatementImportCandidateUseCase,
  ) {}

  @Post()
  async create(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateStatementImportJobDto,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.createJob.execute({
      householdId,
      userId: user.id,
      source: dto.source,
      fileBase64: dto.fileBase64,
    });
  }

  @Get(":jobId/candidates")
  list(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("jobId", ParseUUIDPipe) jobId: string,
  ) {
    return this.listCandidates.execute(jobId, householdId);
  }

  @Post(":jobId/candidates/:candidateId/confirm")
  async confirm(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("candidateId", ParseUUIDPipe) candidateId: string,
    @CurrentUser() authUser: AuthUser,
    @Body() dto: ConfirmStatementImportCandidateDto,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.confirmCandidate.execute(candidateId, householdId, authUser.id, user.id, {
      categoryId: dto.categoryId,
    });
  }

  @Post(":jobId/candidates/:candidateId/dismiss")
  @HttpCode(HttpStatus.NO_CONTENT)
  async dismiss(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("candidateId", ParseUUIDPipe) candidateId: string,
  ) {
    await this.dismissCandidate.execute(candidateId, householdId);
  }
}
