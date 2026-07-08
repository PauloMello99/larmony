"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { TransactionMember } from "../types"

/** Rateio de uma transação — buscado só ao editar uma transação rateada. */
export function useTransactionMembers(householdId: string, transactionId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.transactions.members(householdId, transactionId ?? ""),
    queryFn: () =>
      apiRequest<TransactionMember[]>(
        `/households/${householdId}/transactions/${transactionId}/members`,
      ),
    enabled: !!householdId && !!transactionId,
  })

  return { members: query.data ?? [], loading: query.isLoading }
}
