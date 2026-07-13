import { Injectable } from "@nestjs/common";
import { buildCsv, csvMoneyCents, type CsvColumn } from "../../../../common/csv/csv.util";
import type { MonthPoint } from "../../domain/report.repository.interface";
import { GetAnnualReportUseCase } from "./get-annual-report.use-case";
import type { CsvExport } from "./export-monthly-report.use-case";

const COLUMNS: CsvColumn<MonthPoint>[] = [
  { key: "year", header: "Ano", value: (r) => r.year },
  { key: "month", header: "Mês", value: (r) => r.month },
  { key: "income", header: "Receitas (R$)", value: (r) => csvMoneyCents(r.incomeCents) },
  { key: "expense", header: "Despesas (R$)", value: (r) => csvMoneyCents(r.expenseCents) },
  {
    key: "balance",
    header: "Saldo (R$)",
    value: (r) => csvMoneyCents(r.incomeCents - r.expenseCents),
  },
];

/**
 * Export CSV do relatório anual (Family-only — `report_export`, já implícito
 * em `advanced_reports` pois o anual em si já é premium, mas usa a mesma
 * capability de export por consistência). Reusa `GetAnnualReportUseCase` —
 * exporta a série mensal (12 meses) do ano.
 */
@Injectable()
export class ExportAnnualReportUseCase {
  constructor(private readonly getAnnualReport: GetAnnualReportUseCase) {}

  async execute(householdId: string, year: number, fields?: string[]): Promise<CsvExport> {
    const report = await this.getAnnualReport.execute(householdId, year);
    const csv = buildCsv(report.months, COLUMNS, fields);
    const filename = `relatorio-anual-${report.year}.csv`;
    return { filename, csv };
  }
}
