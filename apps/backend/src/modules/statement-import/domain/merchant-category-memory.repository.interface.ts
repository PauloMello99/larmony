export const MERCHANT_CATEGORY_MEMORY_REPOSITORY = Symbol("MERCHANT_CATEGORY_MEMORY_REPOSITORY");

export interface IMerchantCategoryMemoryRepository {
  upsert(householdId: string, merchantKey: string, categoryId: string): Promise<void>;
}
