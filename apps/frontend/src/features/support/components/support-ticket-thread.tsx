"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/shared/lib/utils"
import { translateApiError } from "@/shared/lib/api-error"
import { useMySupportTicket, useReplyToMySupportTicket } from "../hooks/use-support"
import { TicketStatusBadge } from "./ticket-status-badge"

function fmtDateTime(iso: string, t: TFunction): string {
  return new Date(iso).toLocaleString(t("format.dateLocale"), {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SupportTicketThread({ id }: { id: string | undefined }) {
  const { t } = useTranslation("support")
  const { ticket, loading, error } = useMySupportTicket(id)
  const reply = useReplyToMySupportTicket(id ?? "")
  const [body, setBody] = React.useState("")
  const [replyError, setReplyError] = React.useState<string | null>(null)

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || reply.isPending) return
    setReplyError(null)
    try {
      await reply.mutateAsync(body.trim())
      setBody("")
    } catch (err) {
      setReplyError(err instanceof Error ? translateApiError(err, t) : t("thread.genericError"))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/support"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("thread.back")}
      </Link>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-foreground/40">
          {t("thread.loading")}
        </div>
      ) : ticket ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{ticket.subject}</h1>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <p className="text-xs text-foreground/40">{t(`category.${ticket.category}`)}</p>

          <ul className="flex flex-col gap-3">
            {ticket.messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-xl border px-4 py-3",
                  m.isAdmin
                    ? "self-start border-sky-400/20 bg-sky-400/[0.06]"
                    : "self-end border-foreground/[0.08] bg-foreground/[0.03]",
                )}
              >
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{m.body}</p>
                <p className="mt-1.5 text-[11px] text-foreground/40">
                  {m.isAdmin ? t("thread.supportAuthor") : m.authorName} ·{" "}
                  {fmtDateTime(m.createdAt, t)}
                </p>
              </li>
            ))}
          </ul>

          {ticket.status === "closed" ? (
            <p className="rounded-lg border border-dashed border-foreground/10 py-4 text-center text-sm text-foreground/40">
              {t("thread.closedNotice")}
            </p>
          ) : (
            <form onSubmit={handleReply} className="flex flex-col gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("thread.replyPlaceholder")}
                rows={3}
                maxLength={5000}
              />
              {replyError && <p className="text-sm text-destructive">{replyError}</p>}
              <Button
                type="submit"
                disabled={!body.trim() || reply.isPending}
                className="w-fit self-end"
              >
                {reply.isPending ? t("thread.replySubmitting") : t("thread.replySubmit")}
              </Button>
            </form>
          )}
        </>
      ) : null}
    </div>
  )
}
