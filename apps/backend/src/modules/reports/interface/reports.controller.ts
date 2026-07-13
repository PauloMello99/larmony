import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { parseFields } from "../../../common/csv/csv.util";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { HouseholdEntitlementGuard } from "../../subscriptions/interface/guards/household-entitlement.guard";
import { RequireCapability } from "../../subscriptions/interface/decorators/require-capability.decorator";
import { GetMonthlyReportUseCase } from "../application/use-cases/get-monthly-report.use-case";
import { GetAnnualReportUseCase } from "../application/use-cases/get-annual-report.use-case";
import { ExportMonthlyReportUseCase } from "../application/use-cases/export-monthly-report.use-case";
import { ExportAnnualReportUseCase } from "../application/use-cases/export-annual-report.use-case";
import { AnnualReportQueryDto } from "./dto/annual-report-query.dto";
import { MonthlyReportQueryDto } from "./dto/monthly-report-query.dto";

@Controller("households/:householdId/reports")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class ReportsController {
  constructor(
    private readonly getMonthlyReport: GetMonthlyReportUseCase,
    private readonly getAnnualReport: GetAnnualReportUseCase,
    private readonly exportMonthlyReport: ExportMonthlyReportUseCase,
    private readonly exportAnnualReport: ExportAnnualReportUseCase,
  ) {}

  @Get("monthly")
  monthly(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Query() query: MonthlyReportQueryDto,
  ) {
    // month/year andam juntos; sem eles (ou incompletos) usa o mês corrente.
    const ref =
      query.month && query.year ? new Date(query.year, query.month - 1, 1) : new Date();
    return this.getMonthlyReport.execute(householdId, ref);
  }

  // Relatório anual = "relatório avançado" (premium-only, B-4). O mensal
  // permanece disponível no Free. Gate por método → roda após Auth+Membership.
  @Get("annual")
  @RequireCapability("advanced_reports")
  @UseGuards(HouseholdEntitlementGuard)
  annual(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Query() query: AnnualReportQueryDto,
  ) {
    const year = query.year ?? new Date().getFullYear();
    return this.getAnnualReport.execute(householdId, year);
  }

  // Export CSV é Family-only (capability própria `report_export`, P-6, D-1) —
  // distinta de `advanced_reports`: o mensal em si é grátis para visualizar,
  // só o export é premium.
  @Get("monthly/export")
  @RequireCapability("report_export")
  @UseGuards(HouseholdEntitlementGuard)
  async monthlyExport(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Query() query: MonthlyReportQueryDto,
    @Query("fields") fieldsRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const ref =
      query.month && query.year ? new Date(query.year, query.month - 1, 1) : new Date();
    const { filename, csv } = await this.exportMonthlyReport.execute(
      householdId,
      ref,
      parseFields(fieldsRaw),
    );
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return csv;
  }

  @Get("annual/export")
  @RequireCapability("report_export")
  @UseGuards(HouseholdEntitlementGuard)
  async annualExport(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Query() query: AnnualReportQueryDto,
    @Query("fields") fieldsRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const year = query.year ?? new Date().getFullYear();
    const { filename, csv } = await this.exportAnnualReport.execute(
      householdId,
      year,
      parseFields(fieldsRaw),
    );
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return csv;
  }
}
