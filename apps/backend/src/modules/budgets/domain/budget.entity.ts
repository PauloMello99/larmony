export interface BudgetEntityProps {
  id: string;
  householdId: string;
  categoryId: string;
  endedFrom: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Série de orçamento por categoria (M10) — o limite vive em `BudgetVersion`. */
export class BudgetEntity {
  readonly id: string;
  readonly householdId: string;
  readonly categoryId: string;
  readonly endedFrom: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BudgetEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.categoryId = props.categoryId;
    this.endedFrom = props.endedFrom;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: BudgetEntityProps): BudgetEntity {
    return new BudgetEntity(props);
  }
}
