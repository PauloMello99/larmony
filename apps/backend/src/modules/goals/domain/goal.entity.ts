export interface GoalEntityProps {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  targetAmountCents: number;
  /** Data alvo opcional (ISO YYYY-MM-DD) — clearable. */
  targetDate: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GoalEntity {
  readonly id: string;
  readonly householdId: string;
  readonly name: string;
  readonly description: string | null;
  readonly targetAmountCents: number;
  readonly targetDate: string | null;
  readonly color: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: GoalEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.name = props.name;
    this.description = props.description;
    this.targetAmountCents = props.targetAmountCents;
    this.targetDate = props.targetDate;
    this.color = props.color;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: GoalEntityProps): GoalEntity {
    return new GoalEntity(props);
  }
}
