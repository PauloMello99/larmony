import type { TransactionType } from "../../transactions/domain/transaction.entity";

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export interface RecurrenceEntityProps {
  id: string;
  householdId: string;
  createdBy: string;
  personId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  isActive: boolean;
  notes: string | null;
}

/** Regra de recorrência (M9). Plain data holder, sem comportamento (a lógica de
 *  agenda vive em `recurrence-schedule.ts`, testável isoladamente). */
export class RecurrenceEntity {
  readonly id: string;
  readonly householdId: string;
  readonly createdBy: string;
  readonly personId: string | null;
  readonly categoryId: string | null;
  readonly type: TransactionType;
  readonly amountCents: number;
  readonly description: string;
  readonly frequency: RecurrenceFrequency;
  readonly interval: number;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly nextRunDate: string;
  readonly isActive: boolean;
  readonly notes: string | null;

  private constructor(props: RecurrenceEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.createdBy = props.createdBy;
    this.personId = props.personId;
    this.categoryId = props.categoryId;
    this.type = props.type;
    this.amountCents = props.amountCents;
    this.description = props.description;
    this.frequency = props.frequency;
    this.interval = props.interval;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.nextRunDate = props.nextRunDate;
    this.isActive = props.isActive;
    this.notes = props.notes;
  }

  static create(props: RecurrenceEntityProps): RecurrenceEntity {
    return new RecurrenceEntity(props);
  }
}
