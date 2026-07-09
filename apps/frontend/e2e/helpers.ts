import type { Page } from "@playwright/test"

/**
 * Todas as chaves de tour de `features/onboarding/lib/tours.ts`. Manter em
 * sincronia ao adicionar tours novos (senão o tour novo volta a bloquear os
 * specs). Ver `suppressOnboardingTours`.
 */
const TOUR_KEYS = [
  "sidebar",
  "overview",
  "transactions",
  "transaction-form",
  "categories",
  "budgets",
  "goals",
  "scheduled-transactions",
  "scheduled-transaction-form",
  "reports",
  "settings",
]

/**
 * Suprime o onboarding nas telas autenticadas interceptando `GET /auth/me` e
 * marcando todos os tours como já vistos. Usuários de e2e são sempre novos, e o
 * OnboardingProvider (montado no household-layout) dispara o tour do sidebar —
 * cujo modal `z-[70]` intercepta os cliques e derruba os specs por timeout. Os
 * specs de feature testam a feature, não o onboarding (esse é o papel de
 * `onboarding.e2e.ts`), então suprimir o tour aqui é o comportamento correto.
 *
 * Chamar num `test.beforeEach` — a interceptação vale por toda a vida da page,
 * cobrindo todas as navegações do teste, sem depender de timing de modal.
 */
export async function suppressOnboardingTours(page: Page): Promise<void> {
  const seen: Record<string, number> = {}
  for (const key of TOUR_KEYS) seen[key] = 999

  await page.route("**/auth/me", async (route) => {
    // Só o GET carrega o perfil que alimenta o onboarding; deixa PATCH etc. passar.
    if (route.request().method() !== "GET") return route.continue()

    const res = await route.fetch()
    if (!res.ok()) return route.fulfill({ response: res })

    const body = (await res.json()) as { onboarding?: Record<string, number> }
    body.onboarding = { ...(body.onboarding ?? {}), ...seen }
    return route.fulfill({ response: res, json: body })
  })
}
