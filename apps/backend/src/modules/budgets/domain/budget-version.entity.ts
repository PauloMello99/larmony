export interface BudgetVersionEntityProps {
  id: string;
  budgetId: string;
  amountCents: number;
  effectiveFrom: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Um limite vigente a partir de `effectiveFrom` na série (M10). */
export class BudgetVersionEntity {
  readonly id: string;
  readonly budgetId: string;
  readonly amountCents: number;
  readonly effectiveFrom: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BudgetVersionEntityProps) {
    this.id = props.id;
    this.budgetId = props.budgetId;
    this.amountCents = props.amountCents;
    this.effectiveFrom = props.effectiveFrom;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: BudgetVersionEntityProps): BudgetVersionEntity {
    return new BudgetVersionEntity(props);
  }
}
