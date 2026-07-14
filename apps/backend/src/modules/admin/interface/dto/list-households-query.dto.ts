import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Transform, Type } from "class-transformer";

/** Planos filtráveis — espelha SubscriptionPlan; lar sem linha de subscription conta como "free". */
const PLANS = ["free", "trial", "standard", "custom"] as const;
const STATUSES = ["active", "trialing", "past_due", "canceled"] as const;
const SORT_FIELDS = ["createdAt", "name", "memberCount"] as const;

export type HouseholdPlanFilter = (typeof PLANS)[number];
export type HouseholdStatusFilter = (typeof STATUSES)[number];
export type HouseholdSortField = (typeof SORT_FIELDS)[number];

export class ListHouseholdsQueryDto {
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

  /** Busca livre: nome do lar, slug ou e-mail do dono (ILIKE). */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(PLANS)
  plan?: HouseholdPlanFilter;

  @IsOptional()
  @IsIn(STATUSES)
  status?: HouseholdStatusFilter;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  suspended?: boolean;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy?: HouseholdSortField;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc";
}
