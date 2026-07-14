"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { translateApiError } from "@/shared/lib/api-error"
import { useCreateSupportTicket } from "../hooks/use-support"
import type { SupportTicketCategory } from "../types"

const CATEGORIES: SupportTicketCategory[] = ["problem", "question", "suggestion", "billing"]

interface NewTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (ticketId: string) => void
}

export function NewTicketDialog({ open, onOpenChange, onCreated }: NewTicketDialogProps) {
  const { t } = useTranslation("support")
  const create = useCreateSupportTicket()

  const [category, setCategory] = React.useState<SupportTicketCategory>("question")
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setCategory("question")
      setSubject("")
      setBody("")
      setError(null)
    }
  }, [open])

  const canSubmit = subject.trim().length > 0 && body.trim().length > 0 && !create.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    try {
      const ticket = await create.mutateAsync({ category, subject: subject.trim(), body: body.trim() })
      onOpenChange(false)
      onCreated(ticket.id)
    } catch (err) {
      setError(err instanceof Error ? translateApiError(err, t) : t("newTicket.genericError"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newTicket.title")}</DialogTitle>
          <DialogDescription>{t("newTicket.subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-foreground/80">
              {t("newTicket.categoryLabel")}
            </label>
            <Select value={category} onValueChange={(v) => setCategory(v as SupportTicketCategory)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`category.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-foreground/80">
              {t("newTicket.subjectLabel")}
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("newTicket.subjectPlaceholder")}
              maxLength={150}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-foreground/80">
              {t("newTicket.bodyLabel")}
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("newTicket.bodyPlaceholder")}
              rows={5}
              maxLength={5000}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {create.isPending ? t("newTicket.submitting") : t("newTicket.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
