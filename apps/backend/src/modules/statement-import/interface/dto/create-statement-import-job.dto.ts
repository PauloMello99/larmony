import { IsIn, IsNotEmpty, IsString } from "class-validator";
import type { StatementImportSource } from "../../domain/statement-import-job.entity";

export class CreateStatementImportJobDto {
  @IsIn(["csv", "ofx", "pdf"])
  source!: StatementImportSource;

  @IsString()
  @IsNotEmpty()
  fileBase64!: string;
}
