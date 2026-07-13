import { randomBytes } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { HouseholdEntity } from "../../domain/household.entity";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { EntitlementsService } from "../../../subscriptions/application/entitlements.service";
import { PLAN_LIMITS } from "../../../subscriptions/domain/entitlements";
import { HouseholdLimitReachedException } from "../../domain/exceptions/household-limit-reached.exception";

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
    private readonly entitlements: EntitlementsService,
  ) {}

  async execute(name: string, creatorAuthId: string, timezone?: string): Promise<HouseholdEntity> {
    await this.assertUnderHouseholdLimit(creatorAuthId);

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

  /**
   * Billing é por lar, não por usuário (ADR-0026) — não existe "plano do
   * usuário" a checar diretamente. A régua do Free (D-1) limita quantos lares
   * o usuário pode OWNER simultaneamente: conta os lares onde `role ===
   * "owner"`; se já no teto e NENHUM deles for premium/custom, bloqueia.
   * Upgrade de qualquer lar já possuído libera a criação do próximo.
   */
  private async assertUnderHouseholdLimit(authId: string): Promise<void> {
    const owned = (await this.householdRepo.findAllByAuthId(authId)).filter(
      (h) => h.role === "owner",
    );
    const maxFree = PLAN_LIMITS.free.maxHouseholdsOwned;
    if (owned.length < maxFree) return;

    const resolved = await Promise.all(
      owned.map((h) => this.entitlements.resolve(h.id)),
    );
    if (resolved.some((e) => e.plan !== "free")) return;

    throw new HouseholdLimitReachedException(maxFree);
  }
}
