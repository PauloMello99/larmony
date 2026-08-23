import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../../../database/database.module";
import { STATEMENT_IMPORT_CONTEXT_REPOSITORY } from "../domain/statement-import-context.repository.interface";
import { STATEMENT_IMPORT_JOB_REPOSITORY } from "../domain/statement-import-job.repository.interface";
import { STATEMENT_IMPORT_CANDIDATE_REPOSITORY } from "../domain/statement-import-candidate.repository.interface";
import { STATEMENT_IMPORT_ADMIN_REPOSITORY } from "../domain/statement-import-admin.repository.interface";
import { MERCHANT_CATEGORY_MEMORY_REPOSITORY } from "../domain/merchant-category-memory.repository.interface";
import { STATEMENT_PROCESSOR } from "../domain/ports/statement-processor.port";
import { DrizzleStatementImportContextRepository } from "./persistence/drizzle-statement-import-context.repository";
import { DrizzleStatementImportJobRepository } from "./persistence/drizzle-statement-import-job.repository";
import { DrizzleStatementImportCandidateRepository } from "./persistence/drizzle-statement-import-candidate.repository";
import { DrizzleStatementImportAdminRepository } from "./persistence/drizzle-statement-import-admin.repository";
import { DrizzleMerchantCategoryMemoryRepository } from "./persistence/drizzle-merchant-category-memory.repository";
import { HttpStatementProcessor } from "./http-statement-processor";

@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [
    {
      provide: STATEMENT_IMPORT_CONTEXT_REPOSITORY,
      useClass: DrizzleStatementImportContextRepository,
    },
    { provide: STATEMENT_IMPORT_JOB_REPOSITORY, useClass: DrizzleStatementImportJobRepository },
    {
      provide: STATEMENT_IMPORT_CANDIDATE_REPOSITORY,
      useClass: DrizzleStatementImportCandidateRepository,
    },
    {
      provide: STATEMENT_IMPORT_ADMIN_REPOSITORY,
      useClass: DrizzleStatementImportAdminRepository,
    },
    {
      provide: MERCHANT_CATEGORY_MEMORY_REPOSITORY,
      useClass: DrizzleMerchantCategoryMemoryRepository,
    },
    { provide: STATEMENT_PROCESSOR, useClass: HttpStatementProcessor },
  ],
  exports: [
    STATEMENT_IMPORT_CONTEXT_REPOSITORY,
    STATEMENT_IMPORT_JOB_REPOSITORY,
    STATEMENT_IMPORT_CANDIDATE_REPOSITORY,
    STATEMENT_IMPORT_ADMIN_REPOSITORY,
    MERCHANT_CATEGORY_MEMORY_REPOSITORY,
    STATEMENT_PROCESSOR,
  ],
})
export class StatementImportInfrastructureModule {}
