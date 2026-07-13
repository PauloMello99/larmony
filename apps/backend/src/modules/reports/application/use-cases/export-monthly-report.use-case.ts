import { Injectable } from "@nestjs/common";
import { buildCsv, csvMoneyCents, type CsvColumn } from "../../../../common/csv/csv.util";
import type { CategorySlice } from "../../domain/report.repository.interface";
import { GetMonthlyReportUseCase } from "./get-monthly-report.use-case";

export interface CsvExport {
  filename: string;
  csv: string;
}

const COLUMNS: CsvColumn<CategorySlice>[] = [
  { key: "category", header: "Categoria", value: (r) => r.name },
  { key: "amount", header: "Valor (R$)", value: (r) => csvMoneyCents(r.amountCents) },
];

/**
 * Export CSV do relatório mensal (Family-only — capability `report_export`,
 * distinta de `advanced_reports`: o relatório mensal em si é grátis para
 * VISUALIZAR, só o export é premium). Reusa `GetMonthlyReportUseCase` — a
 * tabela exportada é a quebra por categoria do mês de referência (RPT-2,
 * `common/csv/csv.util.ts`).
 */
@Injectable()
export class ExportMonthlyReportUseCase {
  constructor(private readonly getMonthlyReport: GetMonthlyReportUseCase) {}

  async execute(householdId: string, now = new Date(), fields?: string[]): Promise<CsvExport> {
    const report = await this.getMonthlyReport.execute(householdId, now);
    const csv = buildCsv(report.byCategory, COLUMNS, fields);
    const { month, year } = report.refMonth;
    const filename = `relatorio-mensal-${year}-${String(month).padStart(2, "0")}.csv`;
    return { filename, csv };
  }
}
