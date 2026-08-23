import type { CategoryConfidence, StatementImportCandidateType } from "./statement-import-candidate.entity";
import type { StatementImportJobEntity, StatementImportJobStatus } from "./statement-import-job.entity";

export const STATEMENT_IMPORT_ADMIN_REPOSITORY = Symbol("STATEMENT_IMPORT_ADMIN_REPOSITORY");

export interface StatementImportAdminCategory {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface NewCandidateRow {
  externalId: string;
  date: string;
  amountCents: number;
  type: StatementImportCandidateType;
  description: string;
  categoryId: string | null;
  categoryConfidence: CategoryConfidence | null;
  resolvedBy: string;
  merchantKey: string | null;
}

export interface CompleteJobPatch {
  status: StatementImportJobStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  stats?: unknown;
  completedAt: Date;
}

/**
 * SEM RLS (DRIZZLE_ADMIN) — usado só pelo callback do processor e pelo job de
 * cron de timeout, que não têm sessão de usuário/request context.
 */
export interface IStatementImportAdminRepository {
  // Duplicado DE PROPÓSITO em relação a IStatementImportContextRepository
  // .findCategories: aqui roda sem RLS (fronteira de segurança diferente —
  // callback/cron, sem sessão de usuário); nunca reusar a mesma implementação.
  findCategories(householdId: string): Promise<StatementImportAdminCategory[]>;
  findJobById(id: string): Promise<StatementImportJobEntity | null>;
  /**
   * `UPDATE ... WHERE id=$ AND status IN ('pending','processing') RETURNING *`.
   * Zero rows = job já terminal (callback duplicado) → `{ok:false, job:null}`,
   * no-op (mesmo princípio de idempotência dos webhooks Stripe, ADR-0026).
   */
  completeJob(
    id: string,
    patch: CompleteJobPatch,
  ): Promise<{ ok: boolean; job: StatementImportJobEntity | null }>;
  /**
   * `onConflictDoNothing` no target `(household_id, external_id)` — proteção
   * real de dedup contra reimport. `rows.length === 0` retorna direto (Drizzle
   * rejeita `.values([])`).
   */
  insertCandidates(
    jobId: string,
    householdId: string,
    rows: NewCandidateRow[],
  ): Promise<{ insertedCount: number; skippedCount: number }>;
  /**
   * `completeJob` + `insertCandidates` numa ÚNICA transação — achado da
   * revisão final: as duas chamadas separadas deixavam uma janela onde um
   * crash entre elas gravava o job como `completed` com zero candidatos,
   * órfão (o sweep de timeout só varre `pending`/`processing`, nunca
   * alcança esse job). Usar SEMPRE este método no caminho de sucesso do
   * callback — nunca `completeJob` + `insertCandidates` separados.
   */
  completeJobWithCandidates(
    id: string,
    patch: CompleteJobPatch,
    householdId: string,
    rows: NewCandidateRow[],
  ): Promise<{
    ok: boolean;
    job: StatementImportJobEntity | null;
    insertedCount: number;
    skippedCount: number;
  }>;
  /** Jobs `pending`/`processing` além do deadline (por `source`) viram `failed`/`TIMEOUT`. */
  sweepTimeouts(
    csvOfxDeadline: string,
    pdfDeadline: string,
  ): Promise<{ id: string; householdId: string }[]>;
}
