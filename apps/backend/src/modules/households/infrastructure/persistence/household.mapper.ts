import { HouseholdEntity, type HouseholdRole } from "../../domain/household.entity";

interface HouseholdRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: string;
  permissions?: string[] | null;
  timezone: string;
  notificationHour: number;
  createdAt: Date;
  updatedAt: Date;
}

export class HouseholdMapper {
  static toDomain(row: HouseholdRow): HouseholdEntity {
    return HouseholdEntity.create({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl,
      role: row.role as HouseholdRole,
      permissions: row.permissions ?? [],
      timezone: row.timezone,
      notificationHour: row.notificationHour,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
