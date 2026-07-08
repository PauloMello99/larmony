"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Category } from "../types"
import type { CategoryFormValues } from "../schemas/category.schemas"

export function useCategoryMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all(householdId) })

  const createCategoryMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      apiRequest<Category>(`/households/${householdId}/categories`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<CategoryFormValues> }) =>
      apiRequest<Category>(`/households/${householdId}/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/households/${householdId}/categories/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  return {
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: (id: string, values: Partial<CategoryFormValues>) =>
      updateCategoryMutation.mutateAsync({ id, values }),
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  }
}
