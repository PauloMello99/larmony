"use client"

import { useTranslation } from "react-i18next"
import { Badge } from "@/shared/components/ui/badge"
import type { SupportTicketStatus } from "../types"

const STATUS_CLASSES: Record<SupportTicketStatus, string> = {
  open: "bg-amber-400/10 text-amber-400",
  answered: "bg-sky-400/10 text-sky-400",
  closed: "bg-foreground/[0.08] text-foreground/50",
}

export function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  const { t } = useTranslation("support")
  return <Badge className={STATUS_CLASSES[status]}>{t(`status.${status}`)}</Badge>
}
