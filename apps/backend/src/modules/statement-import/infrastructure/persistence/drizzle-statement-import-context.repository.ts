import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  IStatementImportContextRepository,
  StatementImportContextCategory,
  StatementImportHouseholdMember,
  StatementImportMerchantMemoryEntry,
} from "../../domain/statement-import-context.repository.interface";

@Injectable()
export class DrizzleStatementImportContextRepository
  implements IStatementImportContextRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findCategories(householdId: string): Promise<StatementImportContextCategory[]> {
    return this.db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        type: schema.categories.type,
        isDefault: schema.categories.isDefault,
      })
      .from(schema.categories)
      .where(eq(schema.categories.householdId, householdId));
  }

  async findMerchantMemory(
    householdId: string,
  ): Promise<StatementImportMerchantMemoryEntry[]> {
    return this.db
      .select({
        merchantKey: schema.merchantCategoryMemory.merchantKey,
        categoryId: schema.merchantCategoryMemory.categoryId,
      })
      .from(schema.merchantCategoryMemory)
      .where(eq(schema.merchantCategoryMemory.householdId, householdId));
  }

  async findHouseholdMembers(
    householdId: string,
  ): Promise<StatementImportHouseholdMember[]> {
    // householdMemberships.userId não tem FK pra users (ver schema/households.ts)
    // — join manual. Membro `enabled=false` perdeu acesso ao lar (mesmo
    // princípio do HouseholdMembershipGuard) e não entra no vocabulário de
    // categorização por membro do processor.
    return this.db
      .select({
        userId: schema.users.id,
        name: schema.users.name,
      })
      .from(schema.householdMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(
        and(
          eq(schema.householdMemberships.householdId, householdId),
          eq(schema.householdMemberships.enabled, true),
        ),
      );
  }
}
