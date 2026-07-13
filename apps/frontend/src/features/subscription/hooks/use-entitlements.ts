"use client"

import { useSubscription } from "./use-subscription"
import type { Capabilities, PlanLimits } from "../types"

const NO_CAPABILITIES: Capabilities = {
  advanced_reports: false,
  report_export: false,
  custom_categories: false,
}

/** Limites do Free — usado como default enquanto carrega (mais restritivo). */
const FREE_LIMITS: PlanLimits = {
  maxHouseholdsOwned: 1,
  maxMembersPerHousehold: 2,
  maxActiveGoals: 3,
  maxActiveBudgets: 3,
}

/**
 * Entitlements resolvidos do lar, para gating de UI (paywall proativo). Reflete
 * o backend — nunca decide acesso no cliente (spec §"nunca gatear no cliente").
 * Enquanto carrega, assume o mais restritivo (sem capabilities, limites do
 * Free) para não vazar conteúdo premium num flash antes da resposta.
 */
export function useEntitlements(householdId: string) {
  const { entitlements, loading } = useSubscription(householdId)
  return {
    plan: entitlements?.plan ?? null,
    capabilities: entitlements?.capabilities ?? NO_CAPABILITIES,
    limits: entitlements?.limits ?? FREE_LIMITS,
    loading,
  }
}
