export type CategoryType = "income" | "expense" | "both";

export interface CategoryEntityProps {
  id: string;
  householdId: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CategoryEntity {
  readonly id: string;
  readonly householdId: string;
  readonly name: string;
  readonly type: CategoryType;
  readonly color: string;
  readonly icon: string | null;
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CategoryEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.name = props.name;
    this.type = props.type;
    this.color = props.color;
    this.icon = props.icon;
    this.isDefault = props.isDefault;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CategoryEntityProps): CategoryEntity {
    return new CategoryEntity(props);
  }
}
