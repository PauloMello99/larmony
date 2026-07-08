import { IsInt, Min } from "class-validator";

/** Só o limite é editável — categoria e período são imutáveis (mover = deletar+criar). */
export class UpdateBudgetDto {
  @IsInt()
  @Min(1)
  amountCents!: number;
}
