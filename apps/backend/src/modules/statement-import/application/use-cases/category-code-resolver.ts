import { DEFAULT_CATEGORY_CODES } from "../../domain/default-category-codes";

/**
 * Lookup reverso: só categorias default (`isDefault`) entram no vocabulário
 * fechado de 13 códigos que o processor entende (ADR-0034). Categoria custom
 * ou default renomeada (nome não bate com nenhum valor do mapa) volta
 * `undefined` — o caller decide o que fazer (omitir `code`/`categoryCode`).
 */
export function resolveCategoryCode(name: string, isDefault: boolean): string | undefined {
  if (!isDefault) return undefined;

  const entry = Object.entries(DEFAULT_CATEGORY_CODES).find(([, defaultName]) => defaultName === name);
  return entry?.[0];
}
