import type { StatementImportSource } from "../statement-import-job.entity";

export interface SubmitStatementImportJobInput {
  jobId: string;
  householdId: string;
  source: StatementImportSource;
  fileBase64: string;
  context: {
    categories: { code?: string; id: string; name: string; type: string }[];
    merchantMemory: { merchantKey: string; categoryCode: string }[];
    householdMembers: { name: string; userId: string }[];
  };
}

export type SubmitStatementImportJobResult =
  | { accepted: true }
  | { accepted: false; errorCode: string; errorMessage: string };

export interface IStatementProcessor {
  submitJob(input: SubmitStatementImportJobInput): Promise<SubmitStatementImportJobResult>;
}

export const STATEMENT_PROCESSOR = Symbol("STATEMENT_PROCESSOR");
