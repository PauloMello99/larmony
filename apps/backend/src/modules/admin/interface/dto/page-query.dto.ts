import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

/** Paginação simples das abas de drill-down do admin. */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
