import { IsIn, IsString, MaxLength, MinLength } from "class-validator";
import type { SupportTicketCategory } from "../../domain/support-ticket.entity";

const CATEGORIES: SupportTicketCategory[] = ["problem", "question", "suggestion", "billing"];

export class CreateSupportTicketDto {
  @IsIn(CATEGORIES)
  category!: SupportTicketCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
