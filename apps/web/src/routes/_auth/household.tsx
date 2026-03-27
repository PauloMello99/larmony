import { createFileRoute } from '@tanstack/react-router'
import HouseholdPage from '@/pages/HouseholdPage'

export const Route = createFileRoute('/_auth/household')({
  component: HouseholdPage,
})
