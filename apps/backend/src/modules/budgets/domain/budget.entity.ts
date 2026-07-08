export interface BudgetEntityProps {
  id: string;
  householdId: string;
  categoryId: string;
  month: number;
  year: number;
  amountCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BudgetEntity {
  readonly id: string;
  readonly householdId: string;
  readonly categoryId: string;
  readonly month: number;
  readonly year: number;
  readonly amountCents: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BudgetEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.categoryId = props.categoryId;
    this.month = props.month;
    this.year = props.year;
    this.amountCents = props.amountCents;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: BudgetEntityProps): BudgetEntity {
    return new BudgetEntity(props);
  }
}
