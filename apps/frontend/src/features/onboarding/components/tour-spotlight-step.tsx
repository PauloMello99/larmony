"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/components/ui/button"
import { useOnboarding } from "../providers/onboarding-provider"
import type { TourStep } from "../types"

interface TourSpotlightStepProps {
  step: TourStep
  stepIndex: number
  totalSteps: number
}

const TARGET_PADDING = 8
const CARD_GAP = 14
const VIEWPORT_MARGIN = 12
/** Máx. de frames aguardando o alvo entrar na tela (cobre a transição do
 * drawer/sheet no mobile, ~200–300ms; RAF ~60fps). */
const MAX_LOCATE_ATTEMPTS = 40

interface Position {
  top: number
  left: number
}

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
}

/** O alvo está visível na viewport (não off-canvas dentro de um drawer/sheet
 * fechado ou em transição)? Um item de nav no drawer fechado tem `right <= 0`. */
function isOnScreen(rect: DOMRect): boolean {
  return rect.width > 0 && rect.right > 0 && rect.left < window.innerWidth
}

function computeCardPosition(
  target: DOMRect,
  cardWidth: number,
  cardHeight: number,
  placement: "top" | "right" | "bottom" | "left",
): Position {
  let top = 0
  let left = 0

  const place = (p: typeof placement) => {
    switch (p) {
      case "right":
        top = target.top + target.height / 2 - cardHeight / 2
        left = target.right + CARD_GAP
        break
      case "left":
        top = target.top + target.height / 2 - cardHeight / 2
        left = target.left - CARD_GAP - cardWidth
        break
      case "top":
        top = target.top - CARD_GAP - cardHeight
        left = target.left + target.width / 2 - cardWidth / 2
        break
      case "bottom":
      default:
        top = target.bottom + CARD_GAP
        left = target.left + target.width / 2 - cardWidth / 2
        break
    }
  }

  place(placement)

  // Flip to the opposite side when there's not enough room.
  if (placement === "right" && left + cardWidth > window.innerWidth - VIEWPORT_MARGIN) place("left")
  else if (placement === "left" && left < VIEWPORT_MARGIN) place("right")
  else if (placement === "bottom" && top + cardHeight > window.innerHeight - VIEWPORT_MARGIN) place("top")
  else if (placement === "top" && top < VIEWPORT_MARGIN) place("bottom")

  left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - cardWidth - VIEWPORT_MARGIN)
  top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - cardHeight - VIEWPORT_MARGIN)

  return { top, left }
}

export function TourSpotlightStep({ step, stepIndex, totalSteps }: TourSpotlightStepProps) {
  const { t } = useTranslation("onboarding")
  const { next, back, close } = useOnboarding()
  const cardRef = React.useRef<HTMLDivElement>(null)

  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null)
  const [targetMissing, setTargetMissing] = React.useState(false)
  const [cardPos, setCardPos] = React.useState<Position | null>(null)

  // Locate the target element. Retries across a couple of frames so elements that
  // mount right as the step activates (Sheet animation, toggled sections) are found
  // before we give up and skip the step.
  React.useEffect(() => {
    let cancelled = false
    let attempts = 0

    function locate() {
      if (cancelled) return
      const el = step.target
        ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
        : null
      if (el) {
        const rect = el.getBoundingClientRect()
        // Só aceita quando o alvo está de fato na tela. No mobile, itens da
        // sidebar vivem num drawer `-translate-x-full` (off-canvas): aceitar o
        // rect off-canvas colocaria o spotlight fora da tela. Aguarda o drawer
        // abrir/transicionar antes de medir.
        if (isOnScreen(rect)) {
          el.scrollIntoView({ block: "center", behavior: "auto" })
          setTargetRect(el.getBoundingClientRect())
          return
        }
      }
      attempts += 1
      if (attempts > MAX_LOCATE_ATTEMPTS) {
        setTargetMissing(true)
        return
      }
      requestAnimationFrame(locate)
    }

    requestAnimationFrame(locate)
    return () => {
      cancelled = true
    }
  }, [step.target])

  // Alvo ausente no DOM (ex.: item de menu oculto para membros) → pula o passo.
  React.useEffect(() => {
    if (targetMissing) next()
  }, [targetMissing, next])

  // Reposition on scroll/resize while the step is visible.
  React.useEffect(() => {
    if (!step.target) return
    function reflow() {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      if (el) setTargetRect(el.getBoundingClientRect())
    }
    window.addEventListener("resize", reflow)
    window.addEventListener("scroll", reflow, true)
    return () => {
      window.removeEventListener("resize", reflow)
      window.removeEventListener("scroll", reflow, true)
    }
  }, [step.target])

  // Once the target rect and the card's own rendered size are known, compute placement.
  React.useLayoutEffect(() => {
    if (!targetRect || !cardRef.current) return
    const cardBox = cardRef.current.getBoundingClientRect()
    // No mobile, os placements laterais ("right" da sidebar, "left" dos forms)
    // não cabem na largura estreita e o clamp acabaria sobrepondo o alvo —
    // força "bottom" (card abaixo do alvo; a lógica de flip trata alvos no
    // rodapé, virando para "top").
    const placement = isMobileViewport() ? "bottom" : (step.placement ?? "bottom")
    setCardPos(computeCardPosition(targetRect, cardBox.width, cardBox.height, placement))
  }, [targetRect, step.placement])

  if (!targetRect) return null

  const isLast = stepIndex === totalSteps - 1

  return (
    // data-tour-overlay: reconhecido por SheetContent/DialogContent para ignorar
    // este overlay na detecção de clique-fora (ver shared/components/ui/sheet.tsx).
    // pointer-events-auto: com um Sheet/Dialog modal aberto por baixo, o Radix força
    // document.body.style.pointerEvents = "none" (só reabilita no próprio Content dele,
    // por ser layer do Radix); sem essa classe, este overlay herdaria "none" do body e
    // o botão "Próximo" ficaria inclicável de verdade (o clique cairia no backdrop do
    // Sheet por trás, fechando-o).
    <div className="pointer-events-auto fixed inset-0 z-[70]" data-tour-overlay>
      <div
        className="pointer-events-none fixed rounded-md"
        style={{
          top: targetRect.top - TARGET_PADDING,
          left: targetRect.left - TARGET_PADDING,
          width: targetRect.width + TARGET_PADDING * 2,
          height: targetRect.height + TARGET_PADDING * 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
        }}
      />
      <div
        ref={cardRef}
        className="fixed rounded-lg border border-foreground/10 bg-popover p-4 text-foreground shadow-2xl w-[calc(100vw_-_28px)] sm:w-80"
        style={cardPos ? { top: cardPos.top, left: cardPos.left } : { top: -9999, left: -9999 }}
      >
        <h3 className="text-sm font-semibold">{t(step.titleKey)}</h3>
        <p className="mt-1.5 text-sm text-foreground/60">{t(step.bodyKey)}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-foreground/40">
            {t("nav.step", { current: stepIndex + 1, total: totalSteps })}
          </span>
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
        </div>
      </div>
    </div>
  )
}
