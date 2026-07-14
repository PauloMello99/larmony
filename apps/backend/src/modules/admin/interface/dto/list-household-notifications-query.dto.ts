import { IsOptional, IsString } from "class-validator";
import { PageQueryDto } from "./page-query.dto";

export class ListHouseholdNotificationsQueryDto extends PageQueryDto {
  /**
   * Tipo de notificação. String livre de propósito: o repo compara com
   * `::text` (valor fora do enum → conjunto vazio, não erro de cast) e o
   * enum cresce sem tocar este DTO.
   */
  @IsOptional()
  @IsString()
  type?: string;
}
