import * as React from "react"
import { cn } from "@/shared/lib/utils"

interface BackgroundGridProps {
  variant?: "dots" | "none"
  glows?: boolean
  className?: string
}

export function BackgroundGrid({
  variant = "dots",
  glows = true,
  className,
}: BackgroundGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      {variant === "dots" && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff' fill-opacity='0.25'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
      )}

      {glows && (
        <>
          {/* Blob teal (marca) */}
          <div
            className="absolute -left-44 -top-36 h-[560px] w-[560px] rounded-full blur-[110px]"
            style={{ background: "oklch(0.6 0.118 184.704 / 0.13)" }}
          />
          {/* Blob laranja quente — decoração exclusiva da landing (readme do DS) */}
          <div
            className="absolute -right-28 top-72 h-[440px] w-[440px] rounded-full blur-[100px]"
            style={{ background: "rgba(234,88,12,0.06)" }}
          />
        </>
      )}
    </div>
  )
}
