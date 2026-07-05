import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  /** CTA opcional: link + label */
  action?: { href: string; label: string }
  className?: string
}

/** Empty state padrão: ícone suave + título + dica + CTA opcional. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-8 text-center", className)}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.05]">
        <Icon className="h-5 w-5 text-foreground/30" />
      </span>
      <p className="text-sm font-medium text-foreground/60">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
