import { createFileRoute } from '@tanstack/react-router'
import CategoriesPage from '@/pages/CategoriesPage'

export const Route = createFileRoute('/_auth/categories')({
  component: CategoriesPage,
})
