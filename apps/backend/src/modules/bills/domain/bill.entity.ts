/**
 * Conta fixa/recorrente do lar (fatia cron do M7 — só o necessário para o
 * lembrete; o CRUD completo chega com o M7).
 */
export interface BillEntityProps {
  id: string;
  householdId: string;
  householdSlug: string;
  name: string;
  amountCents: number;
  /** Dia do mês do vencimento (1–31; clampado ao fim do mês em meses curtos). */
  dueDay: number;
  isActive: boolean;
  /** Dias antes do vencimento para lembrar (1/3/7/15). NULL = sem lembrete. */
  reminderDaysBefore: number | null;
  /** Último envio de lembrete — guarda anti-duplicata por mês. */
  reminderLastSentAt: Date | null;
}

export class BillEntity {
  readonly id: string;
  readonly householdId: string;
  readonly householdSlug: string;
  readonly name: string;
  readonly amountCents: number;
  readonly dueDay: number;
  readonly isActive: boolean;
  readonly reminderDaysBefore: number | null;
  readonly reminderLastSentAt: Date | null;

  private constructor(props: BillEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.householdSlug = props.householdSlug;
    this.name = props.name;
    this.amountCents = props.amountCents;
    this.dueDay = props.dueDay;
    this.isActive = props.isActive;
    this.reminderDaysBefore = props.reminderDaysBefore;
    this.reminderLastSentAt = props.reminderLastSentAt;
  }

  static create(props: BillEntityProps): BillEntity {
    return new BillEntity(props);
  }
}
