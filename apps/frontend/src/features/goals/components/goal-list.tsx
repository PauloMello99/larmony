"use client"

import { GoalCard } from "./goal-card"
import type { Goal } from "../types"

interface GoalListProps {
  goals: Goal[]
  onContribute: (g: Goal) => void
  onEdit: (g: Goal) => void
  onDelete: (g: Goal) => void
}

export function GoalList({ goals, onContribute, onEdit, onDelete }: GoalListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onContribute={onContribute}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
