import { randomBytes } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { HouseholdEntity } from "../../domain/household.entity";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import { AuditService } from "../../../audit/audit.service";

/**
 * Generates a 20-character random lowercase alphabetic slug.
 * Matches the style used by Supabase (e.g. "wmnqustozicaluqgmvnr").
 * 26^20 ≈ 2×10^28 possible values — collision probability is negligible.
 */
function generateSlug(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(20);
  return Array.from(bytes)
    .map((b) => alphabet[b % 26])
    .join("");
}

@Injectable()
export class CreateHouseholdUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(name: string, creatorAuthId: string, timezone?: string): Promise<HouseholdEntity> {
    const slug = generateSlug();
    const household = await this.householdRepo.create(name, slug, creatorAuthId, timezone);

    await this.auditService.logByAuthId(creatorAuthId, {
      householdId: household.id,
      action: "create",
      entityType: "household",
      entityId: household.id,
      metadata: { name: household.name, slug: household.slug },
    });

    return household;
  }
}
