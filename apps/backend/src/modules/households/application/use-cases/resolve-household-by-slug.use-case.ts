import { Inject, Injectable } from "@nestjs/common";
import type { HouseholdEntity } from "../../domain/household.entity";
import {
  IHouseholdRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/household.repository.interface";
import { HouseholdNotFoundException } from "../../domain/exceptions/household-not-found.exception";

/**
 * Resolve uma household pela slug para o ator: membro (role real) ou super_admin
 * (role "owner" sintetizado). Usado pelo deep-link do super_admin para gerenciar
 * uma household alheia. 404 (sem vazar) para quem não é membro nem super_admin.
 */
@Injectable()
export class ResolveHouseholdBySlugUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly householdRepo: IHouseholdRepository,
  ) {}

  async execute(slug: string, authId: string): Promise<HouseholdEntity> {
    const household = await this.householdRepo.findBySlugAndAuthId(slug, authId);
    if (!household) throw new HouseholdNotFoundException(slug);
    return household;
  }
}
