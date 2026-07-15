import { IsInt, IsUUID, Min } from "class-validator";

/** Sem month/year — a série sempre nasce ancorada no mês corrente (M10). */
export class CreateBudgetDto {
  @IsUUID()
  categoryId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;
}
