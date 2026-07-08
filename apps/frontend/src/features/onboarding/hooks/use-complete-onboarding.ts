"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Me } from "@/features/auth/types"

interface CompleteOnboardingBody {
  key: string
  version: number
}

/**
 * Marca um tour como concluído no backend (merge atômico em `users.onboarding`)
 * e atualiza o cache de `me` com a resposta. Espelha o padrão de use-me.ts.
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (body: CompleteOnboardingBody) =>
      apiRequest<Me>("/auth/me/onboarding", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated)
    },
  })

  return {
    completeOnboarding: (key: string, version: number) =>
      mutation.mutateAsync({ key, version }),
  }
}
