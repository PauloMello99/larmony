import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import * as categoriesApi from '@/api/categories'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'
import { queryKeys } from './keys'

export type { Category } from '@/api/categories'

export function useCategories() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: queryKeys.categories.all(householdId ?? ''),
    queryFn: () => categoriesApi.getCategories(householdId!),
    enabled: !!householdId,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: (payload: Omit<TablesInsert<'categories'>, 'household_id'>) =>
      categoriesApi.createCategory(householdId!, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories.all(householdId!) }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: ({ id, ...payload }: TablesUpdate<'categories'> & { id: string }) =>
      categoriesApi.updateCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories.all(householdId!) }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: categoriesApi.deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories.all(householdId!) }),
  })
}
