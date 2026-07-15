export type ScheduledEntryPostingMode = "auto" | "manual";
export type ScheduledEntryFrequency = "weekly" | "monthly" | "yearly";

/**
 * Lançamento programado (ADR-0020 — unifica bills + recurrences). Candidato de
 * lembrete: só o necessário para o job de lembrete (modo `manual`); o CRUD
 * completo é hidratado via `ScheduledEntryListItem` no repositório.
 */
export interface ScheduledEntryEntityProps {
  id: string;
  householdId: string;
  householdSlug: string;
  /** Fuso IANA do lar (M12) — o lembrete avalia dia/hora no relógio do lar. */
  householdTimezone: string;
  /** Hora local (0–23) a partir da qual o lembrete pode sair (M12). */
  householdNotificationHour: number;
  description: string;
  amountCents: number;
  frequency: ScheduledEntryFrequency;
  interval: number;
  /** Data de origem (yyyy-MM-dd) — carrega o dia-do-mês/semana da cadência. */
  startDate: string;
  isActive: boolean;
  /** Dias antes da ocorrência para lembrar (1/3/7/15). NULL = sem lembrete. */
  reminderDaysBefore: number | null;
  /** Último envio de lembrete — guarda anti-duplicata por dia. */
  reminderLastSentAt: Date | null;
}

export class ScheduledEntryEntity {
  readonly id: string;
  readonly householdId: string;
  readonly householdSlug: string;
  readonly householdTimezone: string;
  readonly householdNotificationHour: number;
  readonly description: string;
  readonly amountCents: number;
  readonly frequency: ScheduledEntryFrequency;
  readonly interval: number;
  readonly startDate: string;
  readonly isActive: boolean;
  readonly reminderDaysBefore: number | null;
  readonly reminderLastSentAt: Date | null;

  private constructor(props: ScheduledEntryEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.householdSlug = props.householdSlug;
    this.householdTimezone = props.householdTimezone;
    this.householdNotificationHour = props.householdNotificationHour;
    this.description = props.description;
    this.amountCents = props.amountCents;
    this.frequency = props.frequency;
    this.interval = props.interval;
    this.startDate = props.startDate;
    this.isActive = props.isActive;
    this.reminderDaysBefore = props.reminderDaysBefore;
    this.reminderLastSentAt = props.reminderLastSentAt;
  }

  static create(props: ScheduledEntryEntityProps): ScheduledEntryEntity {
    return new ScheduledEntryEntity(props);
  }
}
