import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { IMerchantCategoryMemoryRepository } from "../../domain/merchant-category-memory.repository.interface";

@Injectable()
export class DrizzleMerchantCategoryMemoryRepository
  implements IMerchantCategoryMemoryRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async upsert(householdId: string, merchantKey: string, categoryId: string): Promise<void> {
    await this.db
      .insert(schema.merchantCategoryMemory)
      .values({ householdId, merchantKey, categoryId })
      .onConflictDoUpdate({
        target: [
          schema.merchantCategoryMemory.householdId,
          schema.merchantCategoryMemory.merchantKey,
        ],
        set: { categoryId, updatedAt: new Date() },
      });
  }
}
