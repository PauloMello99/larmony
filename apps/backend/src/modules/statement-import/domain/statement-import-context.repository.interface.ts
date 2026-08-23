export const STATEMENT_IMPORT_CONTEXT_REPOSITORY = Symbol(
  "STATEMENT_IMPORT_CONTEXT_REPOSITORY",
);

export interface StatementImportContextCategory {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  isDefault: boolean;
}

export interface StatementImportMerchantMemoryEntry {
  merchantKey: string;
  categoryId: string;
}

export interface StatementImportHouseholdMember {
  userId: string;
  name: string;
}

/**
 * RLS-enforced (request context do usuário). Alimenta o `context` enviado ao
 * processor Python — todas as categorias do household (custom incluídas); a
 * atribuição de `code` (vocabulário fechado das 13 default) acontece no
 * use-case, não aqui.
 */
export interface IStatementImportContextRepository {
  findCategories(householdId: string): Promise<StatementImportContextCategory[]>;
  findMerchantMemory(householdId: string): Promise<StatementImportMerchantMemoryEntry[]>;
  findHouseholdMembers(householdId: string): Promise<StatementImportHouseholdMember[]>;
}
