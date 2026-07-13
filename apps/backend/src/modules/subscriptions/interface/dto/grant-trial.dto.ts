import { IsInt, Max, Min } from "class-validator";

export class GrantTrialDto {
  /** Duração do trial em meses (1–24). */
  @IsInt()
  @Min(1)
  @Max(24)
  months!: number;
}
