"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, FileUp, Loader2, RefreshCw, Upload } from "lucide-react"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { ApiError } from "@/infrastructure/api/client"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { EmptyState } from "@/shared/components/ui/empty-state"
import { translateApiError } from "@/shared/lib/api-error"
import { useStatementImportJob } from "../hooks/use-statement-import-job"
import { useStatementImportCandidates } from "../hooks/use-statement-import-candidates"
import { useStatementImportMutations } from "../hooks/use-statement-import-mutations"
import { fileToBase64 } from "../lib/file-to-base64"
import { StatementImportCandidatesList } from "./statement-import-candidates-list"
import type { StatementImportSource } from "../types"

function detectSource(fileName: string): StatementImportSource | null {
  const ext = fileName.split(".").pop()?.toLowerCase()
  if (ext === "csv") return "csv"
  if (ext === "ofx" || ext === "qfx") return "ofx"
  if (ext === "pdf") return "pdf"
  return null
}

export function StatementImportsPage() {
  const { t } = useTranslation("statement-imports")
  const { t: tCommon } = useTranslation("common")
  const { householdId } = useCurrentHousehold()
  const { categories } = useCategories(householdId)
  const { createImportJob, confirmCandidate, dismissCandidate, isCreating } =
    useStatementImportMutations(householdId)

  const [jobId, setJobId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { job, loading: jobLoading } = useStatementImportJob(householdId, jobId)
  const jobCompleted = job?.status === "completed"
  const { candidates, loading: candidatesLoading } = useStatementImportCandidates(
    householdId,
    jobId,
    jobCompleted,
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadError(null)

    const source = detectSource(file.name)
    if (!source) {
      setUploadError(t("upload.invalidType"))
      return
    }

    try {
      const fileBase64 = await fileToBase64(file)
      const created = await createImportJob({ source, fileBase64 })
      setJobId(created.id)
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setUploadError(t("upload.featureDisabled"))
      } else {
        setUploadError(
          err instanceof Error ? translateApiError(err, tCommon) : t("upload.genericError"),
        )
      }
    }
  }

  function reset() {
    setJobId(null)
    setUploadError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("page.title")}</h1>
          <p className="mt-1 text-sm text-foreground/40">{t("page.description")}</p>
        </div>
        <div className="grid gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.ofx,.qfx,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            disabled={isCreating}
            onClick={() => fileInputRef.current?.click()}
          >
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isCreating ? t("upload.uploading") : t("upload.button")}
          </Button>
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>
      </div>

      {!jobId ? (
        <EmptyState
          icon={FileUp}
          title={t("upload.emptyTitle")}
          description={t("upload.emptyDescription")}
        />
      ) : job?.status === "failed" ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="max-w-sm text-sm text-foreground/70">
            {job.errorMessage || t("job.genericFailure")}
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("job.retry")}
          </Button>
        </div>
      ) : jobLoading || job?.status === "pending" || job?.status === "processing" ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-foreground/60">{t("job.processing")}</p>
        </div>
      ) : jobCompleted ? (
        candidatesLoading ? (
          <div className="grid gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <EmptyState
            icon={FileUp}
            title={t("candidates.emptyTitle")}
            description={t("candidates.emptyDescription")}
          />
        ) : (
          <StatementImportCandidatesList
            jobId={jobId}
            candidates={candidates}
            categories={categories}
            onConfirm={confirmCandidate}
            onDismiss={dismissCandidate}
          />
        )
      ) : null}
    </div>
  )
}
