import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * Mês de referência opcional da vista mensal. Ausente = mês corrente. `month`
 * e `year` andam juntos (o controller só usa a seleção quando ambos vêm).
 */
export class MonthlyReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;
}
