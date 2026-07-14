"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { LifeBuoy, Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { EmptyState } from "@/shared/components/ui/empty-state"
import { useMySupportTickets } from "../hooks/use-support"
import { NewTicketDialog } from "./new-ticket-dialog"
import { TicketStatusBadge } from "./ticket-status-badge"
import { TicketPager } from "./ticket-pager"

function fmtDate(iso: string, t: TFunction): string {
  return new Date(iso).toLocaleDateString(t("format.dateLocale"), {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

export function SupportTicketsPage() {
  const { t } = useTranslation("support")
  const router = useRouter()
  const [page, setPage] = React.useState(1)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const { page: result, loading, error } = useMySupportTickets(page)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("list.title")}</h1>
          <p className="mt-0.5 text-sm text-foreground/50">{t("list.subtitle")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t("list.newTicket")}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-foreground/40">
          {t("list.loading")}
        </div>
      ) : !result || result.data.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={t("list.empty")}
          description={t("list.emptyDescription")}
        />
      ) : (
        <>
          <ul className="divide-y divide-foreground/[0.06] rounded-lg border border-foreground/[0.06]">
            {result.data.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => void router.push(`/support/${ticket.id}`)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ticket.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/40">
                      {t(`category.${ticket.category}`)} · {fmtDate(ticket.updatedAt, t)}
                    </p>
                  </div>
                  <TicketStatusBadge status={ticket.status} />
                </button>
              </li>
            ))}
          </ul>

          <TicketPager page={result.page} pages={result.pages} onChange={setPage} />
        </>
      )}

      <NewTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(ticketId) => void router.push(`/support/${ticketId}`)}
      />
    </div>
  )
}
