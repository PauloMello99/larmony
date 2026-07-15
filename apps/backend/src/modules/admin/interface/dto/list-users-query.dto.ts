import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

const ROLES = ["super_admin", "user"] as const;
const SORT_FIELDS = ["createdAt", "name", "householdCount"] as const;

export type UserSortField = (typeof SORT_FIELDS)[number];

export class ListUsersQueryDto {
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

  /** Busca livre: nome ou e-mail (ILIKE). */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(ROLES)
  platformRole?: (typeof ROLES)[number];

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy?: UserSortField;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc";
}
