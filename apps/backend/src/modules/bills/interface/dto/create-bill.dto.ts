import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateBillDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDay!: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Dias antes do vencimento para lembrar. Ausente/null = sem lembrete. */
  @IsOptional()
  @IsIn([1, 3, 7, 15])
  reminderDaysBefore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
