import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { HouseholdEntitlementGuard } from "../../subscriptions/interface/guards/household-entitlement.guard";
import { RequireCapability } from "../../subscriptions/interface/decorators/require-capability.decorator";
import { GetMonthlyReportUseCase } from "../application/use-cases/get-monthly-report.use-case";
import { GetAnnualReportUseCase } from "../application/use-cases/get-annual-report.use-case";
import { AnnualReportQueryDto } from "./dto/annual-report-query.dto";
import { MonthlyReportQueryDto } from "./dto/monthly-report-query.dto";

@Controller("households/:householdId/reports")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class ReportsController {
  constructor(
    private readonly getMonthlyReport: GetMonthlyReportUseCase,
    private readonly getAnnualReport: GetAnnualReportUseCase,
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
}
