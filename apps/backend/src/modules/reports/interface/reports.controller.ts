import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { GetMonthlyReportUseCase } from "../application/use-cases/get-monthly-report.use-case";
import { GetAnnualReportUseCase } from "../application/use-cases/get-annual-report.use-case";
import { AnnualReportQueryDto } from "./dto/annual-report-query.dto";

@Controller("households/:householdId/reports")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class ReportsController {
  constructor(
    private readonly getMonthlyReport: GetMonthlyReportUseCase,
    private readonly getAnnualReport: GetAnnualReportUseCase,
  ) {}

  @Get("monthly")
  monthly(@Param("householdId", ParseUUIDPipe) householdId: string) {
    return this.getMonthlyReport.execute(householdId);
  }

  @Get("annual")
  annual(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Query() query: AnnualReportQueryDto,
  ) {
    const year = query.year ?? new Date().getFullYear();
    return this.getAnnualReport.execute(householdId, year);
  }
}
