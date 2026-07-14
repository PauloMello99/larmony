"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/lib/utils"
import { translateApiError } from "@/shared/lib/api-error"
import {
  useAdminSupportTicket,
  useReplyAsAdmin,
  useSetSupportTicketStatus,
} from "../hooks/use-admin"
import type { AdminSupportTicketStatus } from "../types"

function fmtDateTime(iso: string, t: TFunction): string {
  return new Date(iso).toLocaleString(t("format.dateLocale"), {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AdminSupportTicketDetail({ id }: { id: string | undefined }) {
  const { t } = useTranslation("admin")
  const { ticket, loading, error } = useAdminSupportTicket(id)
  const reply = useReplyAsAdmin(id ?? "")
  const setStatus = useSetSupportTicketStatus(id ?? "")
  const [body, setBody] = React.useState("")
  const [actionError, setActionError] = React.useState<string | null>(null)

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || reply.isPending) return
    setActionError(null)
    try {
      await reply.mutateAsync(body.trim())
      setBody("")
    } catch (err) {
      setActionError(err instanceof Error ? translateApiError(err, t) : t("supportInbox.detail.genericError"))
    }
  }

  async function handleStatusChange(status: AdminSupportTicketStatus) {
    setActionError(null)
    try {
      await setStatus.mutateAsync(status)
    } catch (err) {
      setActionError(err instanceof Error ? translateApiError(err, t) : t("supportInbox.detail.genericError"))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/support"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("supportInbox.detail.back")}
      </Link>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-foreground/40">
          {t("supportInbox.loading")}
        </div>
      ) : ticket ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold">{ticket.subject}</h1>
                <Badge className="bg-foreground/[0.08] text-foreground/60">
                  {t(`supportInbox.status.${ticket.status}`)}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-foreground/40">
                {t(`supportInbox.category.${ticket.category}`)}
              </p>
            </div>
            <div className="flex gap-2">
              {ticket.status !== "closed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setStatus.isPending}
                  onClick={() => void handleStatusChange("closed")}
                >
                  {t("supportInbox.detail.close")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setStatus.isPending}
                  onClick={() => void handleStatusChange("open")}
                >
                  {t("supportInbox.detail.reopen")}
                </Button>
              )}
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {ticket.messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-xl border px-4 py-3",
                  m.isAdmin
                    ? "self-end border-sky-400/20 bg-sky-400/[0.06]"
                    : "self-start border-foreground/[0.08] bg-foreground/[0.03]",
                )}
              >
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{m.body}</p>
                <p className="mt-1.5 text-[11px] text-foreground/40">
                  {m.authorName} · {fmtDateTime(m.createdAt, t)}
                </p>
              </li>
            ))}
          </ul>

          {ticket.status === "closed" ? (
            <p className="rounded-lg border border-dashed border-foreground/10 py-4 text-center text-sm text-foreground/40">
              {t("supportInbox.detail.closedNotice")}
            </p>
          ) : (
            <form onSubmit={handleReply} className="flex flex-col gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("supportInbox.detail.replyPlaceholder")}
                rows={3}
                maxLength={5000}
              />
              <Button
                type="submit"
                disabled={!body.trim() || reply.isPending}
                className="w-fit self-end"
              >
                {reply.isPending
                  ? t("supportInbox.detail.replySubmitting")
                  : t("supportInbox.detail.replySubmit")}
              </Button>
            </form>
          )}
        </>
      ) : null}
    </div>
  )
}
