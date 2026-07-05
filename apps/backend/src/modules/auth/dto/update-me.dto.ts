import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMeDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @IsIn(["pt-BR", "en"])
  @IsOptional()
  locale?: string;
}
