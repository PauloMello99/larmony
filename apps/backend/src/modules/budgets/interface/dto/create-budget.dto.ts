import { IsInt, IsUUID, Max, Min } from "class-validator";

export class CreateBudgetDto {
  @IsUUID()
  categoryId!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  year!: number;

  @IsInt()
  @Min(1)
  amountCents!: number;
}
