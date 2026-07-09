"use client"

import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { useOnboarding } from "../providers/onboarding-provider"
import type { TourStep } from "../types"

interface TourModalStepProps {
  step: TourStep
  stepIndex: number
  totalSteps: number
}

export function TourModalStep({ step, stepIndex, totalSteps }: TourModalStepProps) {
  const { t } = useTranslation("onboarding")
  const { next, back, close } = useOnboarding()
  const isLast = stepIndex === totalSteps - 1

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="z-[70] sm:max-w-md"
        data-tour-overlay
        showCloseButton={false}
        onEscapeKeyDown={close}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t(step.titleKey)}</DialogTitle>
          <DialogDescription>{t(step.bodyKey)}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="items-center gap-3 sm:flex-row sm:justify-between">
          {totalSteps > 1 && (
            <span className="text-xs text-foreground/40">
              {t("nav.step", { current: stepIndex + 1, total: totalSteps })}
            </span>
          )}
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={back}>
                {t("nav.back")}
              </Button>
            )}
            {!isLast && (
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                {t("nav.skip")}
              </Button>
            )}
            <Button type="button" size="sm" onClick={next}>
              {isLast ? t("nav.done") : t("nav.next")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
