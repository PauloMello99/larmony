"use client"

import * as React from "react"
import type { HouseholdSummary } from "@/features/dashboard/hooks/use-households"

interface HouseholdContextValue {
  /** The resolved household (from the URL slug). */
  household: HouseholdSummary
  /** The household UUID — use this for API calls (`/households/:householdId/...`). */
  householdId: string
  /** True quando um super_admin gerencia uma household da qual NÃO é membro. */
  actingAsAdmin: boolean
}

const HouseholdContext = React.createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({
  household,
  actingAsAdmin = false,
  children,
}: {
  household: HouseholdSummary
  actingAsAdmin?: boolean
  children: React.ReactNode
}) {
  const value = React.useMemo(
    () => ({ household, householdId: household.id, actingAsAdmin }),
    [household, actingAsAdmin],
  )
  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
}

/** Access the current household (UUID + summary), resolved from the URL slug by HouseholdLayout. */
export function useCurrentHousehold(): HouseholdContextValue {
  const ctx = React.useContext(HouseholdContext)
  if (!ctx) {
    throw new Error("useCurrentHousehold must be used within an HouseholdProvider (HouseholdLayout)")
  }
  return ctx
}
