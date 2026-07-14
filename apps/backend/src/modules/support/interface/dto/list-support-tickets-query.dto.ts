import { IsIn, IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import type { SupportTicketCategory, SupportTicketStatus } from "../../domain/support-ticket.entity";

const STATUSES: SupportTicketStatus[] = ["open", "answered", "closed"];
const CATEGORIES: SupportTicketCategory[] = ["problem", "question", "suggestion", "billing"];

export class ListSupportTicketsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(STATUSES)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: SupportTicketCategory;
}
