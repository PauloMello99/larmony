import { Inject, Injectable } from "@nestjs/common";
import {
  IRecurrenceRepository,
  RECURRENCE_REPOSITORY,
  type RecurrenceListItem,
} from "../../domain/recurrence.repository.interface";

@Injectable()
export class ListRecurrencesUseCase {
  constructor(
    @Inject(RECURRENCE_REPOSITORY)
    private readonly recurrenceRepo: IRecurrenceRepository,
  ) {}

  execute(householdId: string): Promise<RecurrenceListItem[]> {
    return this.recurrenceRepo.findAllByHousehold(householdId);
  }
}
