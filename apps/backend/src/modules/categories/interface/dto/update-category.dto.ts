import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import type { CategoryType } from "../../domain/category.entity";

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsIn(["income", "expense", "both"])
  type?: CategoryType;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "color must be a hex color (#RRGGBB)" })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string | null;
}
