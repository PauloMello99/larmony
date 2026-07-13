"use client"

import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { PAGE_SIZE_OPTIONS } from "@/shared/hooks/use-pagination"

interface PaginationProps {
  page: number
  pageSize: number
  totalPages: number
  total: number
  from: number
  to: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

/**
 * Controles de paginação client-side reutilizáveis (ver `usePagination`):
 * range "N–M de T", seletor de tamanho (10/25/50/100) e navegação ‹ ›.
 * Não renderiza se há uma única página e o menor tamanho — mantém o rodapé
 * só quando há algo a paginar/configurar.
 */
export function Pagination({
  page,
  pageSize,
  totalPages,
  total,
  from,
  to,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { t } = useTranslation("common")

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-foreground/40">
        {t("pagination.range", { from, to, total })}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground/40">{t("pagination.perPage")}</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[4.5rem]" aria-label={t("pagination.perPage")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t("pagination.previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[5rem] text-center text-xs text-foreground/50">
            {t("pagination.pageOf", { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={t("pagination.next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
