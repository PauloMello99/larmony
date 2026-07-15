"use client"

import { useSubscription } from "./use-subscription"
import type { Capabilities } from "../types"

/** Sem capabilities avançadas — default enquanto carrega ou sem assinatura (locked). */
const NO_CAPABILITIES: Capabilities = {
  budgets: false,
  scheduled_entries: false,
  advanced_reports: false,
  report_export: false,
  custom_categories: false,
}

/**
 * Entitlements resolvidos do lar, para gating de UI (paywall proativo). Reflete
 * o backend — nunca decide acesso no cliente (spec §"nunca gatear no cliente").
 * Enquanto carrega, assume o mais restritivo (sem capabilities) para não vazar
 * conteúdo Completo-only num flash antes da resposta.
 */
export function useEntitlements(householdId: string) {
  const { entitlements, loading } = useSubscription(householdId)
  return {
    plan: entitlements?.plan ?? null,
    capabilities: entitlements?.capabilities ?? NO_CAPABILITIES,
    loading,
  }
}
