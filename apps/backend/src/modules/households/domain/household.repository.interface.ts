import type { HouseholdEntity } from "./household.entity";

export const ORGANIZATION_REPOSITORY = Symbol("ORGANIZATION_REPOSITORY");

export interface IHouseholdRepository {
  // Read
  findAllByAuthId(authId: string): Promise<HouseholdEntity[]>;
  /**
   * Household visível ao ator: membro (role real) OU super_admin (role sintetizado
   * "owner"). Null se não-membro e não super_admin.
   */
  findByIdAndAuthId(householdId: string, authId: string): Promise<HouseholdEntity | null>;
  /** Idem por slug — usado no deep-link do super_admin para uma household alheia. */
  findBySlugAndAuthId(slug: string, authId: string): Promise<HouseholdEntity | null>;
  /** True se o ator pode agir como owner: owner-membro OU super_admin. */
  isOwner(householdId: string, authId: string): Promise<boolean>;

  // Mutations
  create(
    name: string,
    slug: string,
    creatorAuthId: string,
    timezone?: string,
  ): Promise<HouseholdEntity>;
  update(
    householdId: string,
    data: { name?: string; timezone?: string; notificationHour?: number },
  ): Promise<HouseholdEntity>;
  delete(householdId: string): Promise<void>;
}
