import { createFileRoute } from '@tanstack/react-router'
import BudgetsPage from '@/pages/BudgetsPage'

export const Route = createFileRoute('/_auth/budgets')({
  component: BudgetsPage,
})
