import { Inject, Injectable } from "@nestjs/common";
import {
  IScheduledEntryRepository,
  SCHEDULED_ENTRY_REPOSITORY,
  type ScheduledEntryListItem,
} from "../../domain/scheduled-entry.repository.interface";

@Injectable()
export class ListScheduledEntriesUseCase {
  constructor(
    @Inject(SCHEDULED_ENTRY_REPOSITORY)
    private readonly entryRepo: IScheduledEntryRepository,
  ) {}

  execute(householdId: string): Promise<ScheduledEntryListItem[]> {
    return this.entryRepo.findAllByHousehold(householdId, new Date());
  }
}
