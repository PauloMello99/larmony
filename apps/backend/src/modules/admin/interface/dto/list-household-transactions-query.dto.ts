import { IsDateString, IsIn, IsOptional } from "class-validator";
import { PageQueryDto } from "./page-query.dto";

export class ListHouseholdTransactionsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(["income", "expense"])
  type?: "income" | "expense";
}
