import { createFileRoute } from '@tanstack/react-router'
import BillsPage from '@/pages/BillsPage'

export const Route = createFileRoute('/_auth/bills')({
  component: BillsPage,
})
