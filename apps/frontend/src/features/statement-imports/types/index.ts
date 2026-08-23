export type StatementImportSource = "csv" | "ofx" | "pdf"

export type StatementImportStatus = "pending" | "processing" | "completed" | "failed"

export interface StatementImportStats {
  total: number
  resolvedByRules: number
  resolvedByLlm: number
  unresolved: number
  processingMs: number
}

export interface StatementImportJob {
  id: string
  householdId: string
  createdBy: string
  source: StatementImportSource
  status: StatementImportStatus
  errorCode: string | null
  errorMessage: string | null
  stats: StatementImportStats | null
  createdAt: string
  completedAt: string | null
}

export type StatementImportCandidateType = "income" | "expense"

export type StatementImportCandidateConfidence = "high" | "medium" | "low"

export type StatementImportCandidateStatus =
  | "pending_review"
  | "confirmed"
  | "dismissed"
  | "duplicate"

export interface StatementImportCandidate {
  id: string
  jobId: string
  householdId: string
  externalId: string
  date: string
  amountCents: number
  type: StatementImportCandidateType
  description: string
  categoryId: string | null
  categoryConfidence: StatementImportCandidateConfidence | null
  resolvedBy: string
  merchantKey: string | null
  status: StatementImportCandidateStatus
  transactionId: string | null
  createdAt: string
}
