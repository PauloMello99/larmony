import type { GoalEntity } from "./goal.entity";

export const GOAL_REPOSITORY = Symbol("GOAL_REPOSITORY");

/** Item de listagem — progresso derivado por SUM das contribuições (nunca persistido). */
export interface GoalListItem {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  targetAmountCents: number;
  targetDate: string | null;
  color: string;
  savedCents: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Aporte com o autor resolvido (join users). */
export interface GoalContributionItem {
  id: string;
  goalId: string;
  createdBy: string;
  authorName: string | null;
  amountCents: number;
  date: string;
  notes: string | null;
  createdAt: Date;
}

export interface CreateGoalData {
  name: string;
  targetAmountCents: number;
  description?: string | null;
  targetDate?: string | null;
  color?: string;
}

export interface UpdateGoalData {
  name?: string;
  targetAmountCents?: number;
  description?: string | null;
  /** `null` limpa a data alvo. */
  targetDate?: string | null;
  color?: string;
}

export interface CreateContributionData {
  amountCents: number;
  date: string;
  notes?: string | null;
}

export interface IGoalRepository {
  /** Todas as metas do lar com `savedCents` derivado, mais recente primeiro. */
  findAllByHousehold(householdId: string): Promise<GoalListItem[]>;

  findById(id: string, householdId: string): Promise<GoalEntity | null>;

  create(householdId: string, data: CreateGoalData): Promise<GoalEntity>;

  update(id: string, householdId: string, data: UpdateGoalData): Promise<GoalEntity>;

  /** Cascade apaga as contribuições (FK). */
  delete(id: string, householdId: string): Promise<void>;

  /** Aportes da meta, mais recente primeiro — escopados via goal pai. */
  findContributions(goalId: string, householdId: string): Promise<GoalContributionItem[]>;

  addContribution(
    goalId: string,
    householdId: string,
    createdBy: string,
    data: CreateContributionData,
  ): Promise<GoalContributionItem>;

  deleteContribution(
    contributionId: string,
    goalId: string,
    householdId: string,
  ): Promise<void>;
}
