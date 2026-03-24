import { createFileRoute } from '@tanstack/react-router'
import TransactionsPage from '@/pages/TransactionsPage'

export const Route = createFileRoute('/_auth/transactions')({
  component: TransactionsPage,
})
