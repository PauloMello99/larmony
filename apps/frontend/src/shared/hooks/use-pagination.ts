"use client"

import { useMemo, useState } from "react"

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 10

export interface UsePaginationResult<T> {
  page: number
  pageSize: number
  totalPages: number
  total: number
  pageItems: T[]
  /** Índices 1-based do primeiro e último item exibidos (para "N–M de T"). */
  from: number
  to: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
}

/**
 * Paginação client-side sobre um array já carregado em memória. As listas do
 * app são naturalmente limitadas (transações pelo filtro de mês, categorias e
 * lançamentos são conjuntos pequenos), então não há paginação server-side —
 * ver plano de polimento de UI.
 *
 * `page` é 1-based. A página corrente é clampada ao total durante o render
 * (via useMemo) — se a lista-fonte encolher (ex.: filtro/exclusão), o slice
 * cai numa página válida sem esperar um efeito, evitando um frame vazio.
 */
export function usePagination<T>(
  items: T[],
  initialPageSize: number = DEFAULT_PAGE_SIZE,
): UsePaginationResult<T> {
  const [page, setPageRaw] = useState(1)
  const [pageSize, setPageSizeRaw] = useState(initialPageSize)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const clampedPage = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, clampedPage, pageSize])

  const from = total === 0 ? 0 : (clampedPage - 1) * pageSize + 1
  const to = Math.min(clampedPage * pageSize, total)

  function setPage(next: number) {
    setPageRaw(Math.max(1, next))
  }

  function setPageSize(size: number) {
    setPageSizeRaw(size)
    setPageRaw(1)
  }

  return {
    page: clampedPage,
    pageSize,
    totalPages,
    total,
    pageItems,
    from,
    to,
    setPage,
    setPageSize,
  }
}
