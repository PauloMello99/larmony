"use client"

import { useOnboarding } from "../providers/onboarding-provider"
import { TourModalStep } from "./tour-modal-step"
import { TourSpotlightStep } from "./tour-spotlight-step"

/** Renders the active onboarding tour's current step, if any. Mount once per household layout. */
export function TourRenderer() {
  const { activeTour, stepIndex } = useOnboarding()
  const step = activeTour?.steps[stepIndex]
  if (!activeTour || !step) return null

  // Remount on step change so each step starts from a clean measure/position state.
  const key = `${activeTour.key}-${stepIndex}`

  if (step.kind === "modal") {
    return <TourModalStep key={key} step={step} stepIndex={stepIndex} totalSteps={activeTour.steps.length} />
  }
  return <TourSpotlightStep key={key} step={step} stepIndex={stepIndex} totalSteps={activeTour.steps.length} />
}
