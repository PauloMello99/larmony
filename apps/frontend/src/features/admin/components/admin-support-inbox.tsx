"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { LifeBuoy } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { EmptyState } from "@/shared/components/ui/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { useAdminSupportTickets } from "../hooks/use-admin"
import { Pager } from "./pager"
import type { AdminSupportTicketStatus } from "../types"

function fmtDate(iso: string, t: TFunction): string {
  return new Date(iso).toLocaleDateString(t("format.dateLocale"), {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

const STATUS_TABS: (AdminSupportTicketStatus | "all")[] = ["all", "open", "answered", "closed"]

export function AdminSupportInbox() {
  const { t } = useTranslation("admin")
  const router = useRouter()
  const [status, setStatus] = React.useState<AdminSupportTicketStatus | "all">("open")
  const [page, setPage] = React.useState(1)

  const { page: result, loading, error } = useAdminSupportTickets({
    page,
    limit: 20,
    status: status === "all" ? undefined : status,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{t("supportInbox.title")}</h1>
        <p className="mt-0.5 text-sm text-foreground/50">{t("supportInbox.subtitle")}</p>
      </div>

      <div className="flex gap-1">
        {STATUS_TABS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            className="h-8"
            onClick={() => {
              setStatus(s)
              setPage(1)
            }}
          >
            {t(`supportInbox.tab${s.charAt(0).toUpperCase() + s.slice(1)}`)}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-foreground/40">
          {t("supportInbox.loading")}
        </div>
      ) : !result || result.data.length === 0 ? (
        <EmptyState icon={LifeBuoy} title={t("supportInbox.empty")} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("supportInbox.colSubject")}</TableHead>
                  <TableHead>{t("supportInbox.colAuthor")}</TableHead>
                  <TableHead>{t("supportInbox.colCategory")}</TableHead>
                  <TableHead>{t("supportInbox.colStatus")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("supportInbox.colUpdated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer"
                    onClick={() => void router.push(`/admin/support/${ticket.id}`)}
                  >
                    <TableCell className="max-w-xs truncate font-medium">
                      {ticket.subject}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{ticket.authorName}</p>
                        <p className="truncate text-xs text-foreground/40">{ticket.authorEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground/60">
                      {t(`supportInbox.category.${ticket.category}`)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/60">
                      {t(`supportInbox.status.${ticket.status}`)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-foreground/50">
                      {fmtDate(ticket.updatedAt, t)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pager page={result.page} pages={result.pages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
