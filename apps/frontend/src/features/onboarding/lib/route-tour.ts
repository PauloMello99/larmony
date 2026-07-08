import type { TourKey } from "./tours"

/**
 * Mapeia o segmento base da rota (após `/[householdSlug]/`) para o tour da aba.
 * `""` = índice = Visão geral. `transaction-form` fica de fora (dispara ao abrir o Sheet).
 */
const SEGMENT_TO_TOUR: Record<string, TourKey> = {
  "": "overview",
  transactions: "transactions",
  categories: "categories",
  budgets: "budgets",
  goals: "goals",
  bills: "bills",
  recurrences: "recurrences",
  reports: "reports",
  settings: "settings",
}

/** Extrai o tour da aba a partir do `router.pathname`, ou null se não houver. */
export function routeTourKey(pathname: string): TourKey | null {
  const afterHousehold = pathname.split("/[householdSlug]/")[1] ?? ""
  const base = afterHousehold.split("/")[0] ?? ""
  return SEGMENT_TO_TOUR[base] ?? null
}
