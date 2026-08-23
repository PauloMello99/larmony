// Mesmos nomes EXATOS de apps/backend/src/modules/households/infrastructure/persistence/drizzle-household.repository.ts::defaultCategories
// — se um nome mudar lá, a resolução categoryCode→categoryId aqui quebra
// silenciosamente (vira categoryId:null crescente, sem erro).
export const DEFAULT_CATEGORY_CODES: Record<string, string> = {
  SAL: "Salário",
  FRE: "Freelance",
  INV: "Investimentos",
  OIN: "Outros (entrada)",
  ALI: "Alimentação",
  MOR: "Moradia",
  TRA: "Transporte",
  SAU: "Saúde",
  EDU: "Educação",
  LAZ: "Lazer",
  VES: "Vestuário",
  ASS: "Assinaturas",
  OUT: "Outros (saída)",
};
