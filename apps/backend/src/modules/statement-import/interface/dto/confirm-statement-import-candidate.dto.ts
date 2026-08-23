import { IsOptional, IsUUID } from "class-validator";

export class ConfirmStatementImportCandidateDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
