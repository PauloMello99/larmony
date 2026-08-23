"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, Loader2, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { formatDate, useActiveLocale } from "@/shared/lib/format"
import type { AppLocale } from "@/shared/lib/locale"
import type { Category } from "@/features/categories/types"
import type { StatementImportCandidate, StatementImportCandidateStatus } from "../types"

/** `candidate.date` é date-only (yyyy-mm-dd); o sufixo T00:00:00 força parse em
 * hora local (mesmo gotcha de transaction-list.tsx). */
function formatCandidateDate(iso: string, locale: AppLocale): string {
  return formatDate(`${iso}T00:00:00`, locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function StatusBadge({ status }: { status: StatementImportCandidateStatus }) {
  const { t } = useTranslation("statement-imports")
  if (status === "confirmed") {
    return (
      <Badge variant="outline" className="border-success/30 text-success">
        {t("status.confirmed")}
      </Badge>
    )
  }
  if (status === "dismissed") {
    return (
      <Badge variant="outline" className="text-foreground/40">
        {t("status.dismissed")}
      </Badge>
    )
  }
  if (status === "duplicate") {
    return (
      <Badge variant="outline" className="text-foreground/40">
        {t("status.duplicate")}
      </Badge>
    )
  }
  return <Badge variant="outline">{t("status.pendingReview")}</Badge>
}

function ConfidenceBadge({ confidence }: { confidence: StatementImportCandidate["categoryConfidence"] }) {
  const { t } = useTranslation("statement-imports")
  if (!confidence) return null
  return (
    <Badge variant="ghost" className="px-1.5 py-0 text-[10px] text-foreground/40">
      {t(`confidence.${confidence}`)}
    </Badge>
  )
}

interface CategorySelectProps {
  candidate: StatementImportCandidate
  categories: Category[]
  value: string | undefined
  onChange: (value: string) => void
  disabled: boolean
}

function CategorySelect({ candidate, categories, value, onChange, disabled }: CategorySelectProps) {
  const { t } = useTranslation("statement-imports")
  return (
    <div className="flex items-center gap-1.5">
      <Select value={value ?? candidate.categoryId ?? undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9 w-full min-w-[10rem]">
          <SelectValue placeholder={t("candidates.categoryPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ConfidenceBadge confidence={candidate.categoryConfidence} />
    </div>
  )
}

interface StatementImportCandidatesListProps {
  jobId: string
  candidates: StatementImportCandidate[]
  categories: Category[]
  onConfirm: (input: { jobId: string; candidateId: string; categoryId?: string }) => Promise<unknown>
  onDismiss: (input: { jobId: string; candidateId: string }) => Promise<unknown>
}

export function StatementImportCandidatesList({
  jobId,
  candidates,
  categories,
  onConfirm,
  onDismiss,
}: StatementImportCandidatesListProps) {
  const { t } = useTranslation("statement-imports")
  const locale = useActiveLocale()
  // Seleção de categoria tocada pelo usuário, por candidato — quando ausente,
  // o confirm omite `categoryId` e o backend mantém a sugestão original.
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<Set<string>>(new Set())

  function markPending(candidateId: string, active: boolean) {
    setPending((prev) => {
      const next = new Set(prev)
      if (active) next.add(candidateId)
      else next.delete(candidateId)
      return next
    })
  }

  async function handleConfirm(candidate: StatementImportCandidate) {
    markPending(candidate.id, true)
    try {
      await onConfirm({
        jobId,
        candidateId: candidate.id,
        categoryId: selections[candidate.id],
      })
    } finally {
      markPending(candidate.id, false)
    }
  }

  async function handleDismiss(candidate: StatementImportCandidate) {
    markPending(candidate.id, true)
    try {
      await onDismiss({ jobId, candidateId: candidate.id })
    } finally {
      markPending(candidate.id, false)
    }
  }

  function actionsDisabled(candidate: StatementImportCandidate) {
    return candidate.status !== "pending_review" || pending.has(candidate.id)
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-foreground/[0.07] sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground/[0.02] hover:bg-transparent">
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("candidates.headerDate")}
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("candidates.headerDescription")}
              </TableHead>
              <TableHead className="px-4 text-right text-foreground/50 normal-case tracking-normal">
                {t("candidates.headerAmount")}
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("candidates.headerCategory")}
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("candidates.headerStatus")}
              </TableHead>
              <TableHead className="px-4 text-right text-foreground/50 normal-case tracking-normal">
                {t("candidates.headerActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell className="px-4 text-foreground/60">
                  {formatCandidateDate(candidate.date, locale)}
                </TableCell>
                <TableCell className="px-4 font-medium">{candidate.description}</TableCell>
                <TableCell
                  className={cn(
                    "px-4 text-right font-medium",
                    candidate.type === "income" ? "text-success" : "text-destructive",
                  )}
                >
                  {candidate.type === "income" ? "+" : "-"}
                  {formatCentsToBRL(candidate.amountCents)}
                </TableCell>
                <TableCell className="px-4">
                  <CategorySelect
                    candidate={candidate}
                    categories={categories}
                    value={selections[candidate.id]}
                    onChange={(value) =>
                      setSelections((prev) => ({ ...prev, [candidate.id]: value }))
                    }
                    disabled={candidate.status !== "pending_review"}
                  />
                </TableCell>
                <TableCell className="px-4">
                  <StatusBadge status={candidate.status} />
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionsDisabled(candidate)}
                      onClick={() => void handleConfirm(candidate)}
                    >
                      {pending.has(candidate.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {t("candidates.confirm")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionsDisabled(candidate)}
                      onClick={() => void handleDismiss(candidate)}
                    >
                      <X className="h-4 w-4" />
                      {t("candidates.dismiss")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="grid gap-3 rounded-lg border border-foreground/[0.07] bg-foreground/[0.03] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{candidate.description}</p>
                <p className="truncate text-xs text-foreground/40">
                  {formatCandidateDate(candidate.date, locale)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold",
                  candidate.type === "income" ? "text-success" : "text-destructive",
                )}
              >
                {candidate.type === "income" ? "+" : "-"}
                {formatCentsToBRL(candidate.amountCents)}
              </span>
            </div>

            <CategorySelect
              candidate={candidate}
              categories={categories}
              value={selections[candidate.id]}
              onChange={(value) => setSelections((prev) => ({ ...prev, [candidate.id]: value }))}
              disabled={candidate.status !== "pending_review"}
            />

            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={candidate.status} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionsDisabled(candidate)}
                  onClick={() => void handleConfirm(candidate)}
                >
                  {pending.has(candidate.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {t("candidates.confirm")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionsDisabled(candidate)}
                  onClick={() => void handleDismiss(candidate)}
                >
                  <X className="h-4 w-4" />
                  {t("candidates.dismiss")}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
