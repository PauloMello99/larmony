import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  STATEMENT_IMPORT_CONTEXT_REPOSITORY,
  type IStatementImportContextRepository,
} from "../../domain/statement-import-context.repository.interface";
import {
  STATEMENT_IMPORT_JOB_REPOSITORY,
  type IStatementImportJobRepository,
} from "../../domain/statement-import-job.repository.interface";
import {
  STATEMENT_PROCESSOR,
  type IStatementProcessor,
} from "../../domain/ports/statement-processor.port";
import { StatementImportJobEntity, type StatementImportSource } from "../../domain/statement-import-job.entity";
import { StatementImportDisabledException } from "../../domain/exceptions/statement-import-disabled.exception";
import { resolveCategoryCode } from "./category-code-resolver";

export interface CreateStatementImportJobInput {
  householdId: string;
  userId: string;
  source: StatementImportSource;
  fileBase64: string;
}

/**
 * Handshake síncrono com o processor (ADR-0034): o job é sempre criado
 * (201), mesmo quando o processor recusa o arquivo — a rejeição vira
 * `markFailedSync` em vez de exception, porque a criação do job em si teve
 * sucesso (o usuário revisa o erro na tela do job, não num 4xx do upload).
 */
@Injectable()
export class CreateStatementImportJobUseCase {
  constructor(
    @Inject(STATEMENT_IMPORT_CONTEXT_REPOSITORY)
    private readonly contextRepo: IStatementImportContextRepository,
    @Inject(STATEMENT_IMPORT_JOB_REPOSITORY)
    private readonly jobRepo: IStatementImportJobRepository,
    @Inject(STATEMENT_PROCESSOR)
    private readonly processor: IStatementProcessor,
    private readonly config: ConfigService,
  ) {}

  async execute(input: CreateStatementImportJobInput): Promise<StatementImportJobEntity> {
    if (this.config.get<string>("STATEMENT_IMPORT_ENABLED") !== "true") {
      throw new StatementImportDisabledException();
    }

    const [categories, merchantMemory, members] = await Promise.all([
      this.contextRepo.findCategories(input.householdId),
      this.contextRepo.findMerchantMemory(input.householdId),
      this.contextRepo.findHouseholdMembers(input.householdId),
    ]);

    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    const contextCategories = categories.map((category) => {
      const code = resolveCategoryCode(category.name, category.isDefault);
      return {
        id: category.id,
        name: category.name,
        type: category.type,
        ...(code ? { code } : {}),
      };
    });

    // Categoria custom ou default renomeada/apagada não resolve `code` — o
    // processor só entende o vocabulário fechado, então a entrada é omitida
    // (nunca manda uma memória sem `categoryCode`).
    const contextMerchantMemory = merchantMemory.flatMap((entry) => {
      const category = categoriesById.get(entry.categoryId);
      if (!category) return [];
      const code = resolveCategoryCode(category.name, category.isDefault);
      return code ? [{ merchantKey: entry.merchantKey, categoryCode: code }] : [];
    });

    const contextMembers = members.map((member) => ({ name: member.name, userId: member.userId }));

    const job = await this.jobRepo.create(input.householdId, {
      createdBy: input.userId,
      source: input.source,
      status: "pending",
    });

    const result = await this.processor.submitJob({
      jobId: job.id,
      householdId: input.householdId,
      source: input.source,
      fileBase64: input.fileBase64,
      context: {
        categories: contextCategories,
        merchantMemory: contextMerchantMemory,
        householdMembers: contextMembers,
      },
    });

    if (!result.accepted) {
      await this.jobRepo.markFailedSync(job.id, input.householdId, result.errorCode, result.errorMessage);
      return StatementImportJobEntity.create({
        id: job.id,
        householdId: job.householdId,
        createdBy: job.createdBy,
        source: job.source,
        status: "failed",
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        stats: job.stats,
        createdAt: job.createdAt,
        completedAt: new Date(),
      });
    }

    return job;
  }
}
