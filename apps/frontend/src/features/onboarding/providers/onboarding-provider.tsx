"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useMe } from "@/features/auth/hooks/use-me"
import { useCompleteOnboarding } from "../hooks/use-complete-onboarding"
import { TOURS, getTour, type TourKey } from "../lib/tours"
import { routeTourKey } from "../lib/route-tour"
import type { TourDef } from "../types"

interface OnboardingContextValue {
  activeTour: TourDef | null
  stepIndex: number
  startTour: (key: TourKey, opts?: { review?: boolean }) => void
  next: () => void
  back: () => void
  /** Encerra o tour atual (persiste conclusão, exceto em modo "rever"). */
  close: () => void
  isTourSeen: (key: TourKey) => boolean
}

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null)

export function useOnboarding(): OnboardingContextValue {
  const ctx = React.useContext(OnboardingContext)
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider")
  return ctx
}

interface OnboardingProviderProps {
  children: React.ReactNode
  /** Abre/fecha o drawer mobile (para o tour do menu no mobile). */
  onRequestMobileNav?: (open: boolean) => void
}

function isMobileViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  )
}

export function OnboardingProvider({
  children,
  onRequestMobileNav,
}: OnboardingProviderProps) {
  const router = useRouter()
  const { me, loading } = useMe()
  const { completeOnboarding } = useCompleteOnboarding()

  const [activeKey, setActiveKey] = React.useState<TourKey | null>(null)
  const [stepIndex, setStepIndex] = React.useState(0)
  const isReviewRef = React.useRef(false)
  // Tours concluídos nesta sessão — evita re-disparo antes do cache de `me` chegar.
  const completedRef = React.useRef<Set<string>>(new Set())

  const isTourSeen = React.useCallback(
    (key: TourKey): boolean => {
      if (completedRef.current.has(key)) return true
      const seenVersion = me?.onboarding?.[key] ?? 0
      return seenVersion >= TOURS[key].version
    },
    [me],
  )

  const startTour = React.useCallback(
    (key: TourKey, opts?: { review?: boolean }) => {
      isReviewRef.current = opts?.review ?? false
      setActiveKey(key)
      setStepIndex(0)
      if (key === "sidebar" && isMobileViewport()) onRequestMobileNav?.(true)
    },
    [onRequestMobileNav],
  )

  const close = React.useCallback(() => {
    setActiveKey((current) => {
      if (current) {
        if (!isReviewRef.current && !completedRef.current.has(current)) {
          completedRef.current.add(current)
          void completeOnboarding(current, TOURS[current].version)
        }
        if (current === "sidebar") onRequestMobileNav?.(false)
      }
      return null
    })
    setStepIndex(0)
    isReviewRef.current = false
  }, [completeOnboarding, onRequestMobileNav])

  const next = React.useCallback(() => {
    setStepIndex((i) => {
      const tour = activeKey ? getTour(activeKey) : null
      if (!tour) return i
      if (i < tour.steps.length - 1) return i + 1
      // Último passo → encerra.
      close()
      return i
    })
  }, [activeKey, close])

  const back = React.useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  // Auto-start: menu primeiro; ao concluir, encadeia o tour da aba atual.
  React.useEffect(() => {
    if (loading || !me || activeKey) return
    if (!isTourSeen("sidebar")) {
      startTour("sidebar")
      return
    }
    const tabKey = routeTourKey(router.pathname)
    if (tabKey && !isTourSeen(tabKey)) startTour(tabKey)
  }, [loading, me, activeKey, router.pathname, isTourSeen, startTour])

  const value = React.useMemo<OnboardingContextValue>(
    () => ({
      activeTour: activeKey ? getTour(activeKey) : null,
      stepIndex,
      startTour,
      next,
      back,
      close,
      isTourSeen,
    }),
    [activeKey, stepIndex, startTour, next, back, close, isTourSeen],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}
