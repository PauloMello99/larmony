import { IsInt, IsString, MaxLength, Min } from "class-validator";

export class CompleteOnboardingDto {
  @IsString()
  @MaxLength(64)
  key!: string;

  @IsInt()
  @Min(1)
  version!: number;
}
