"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

/** Paginação compacta — mesmo padrão do admin (`admin/components/pager.tsx`), duplicado para não acoplar features. */
export function TicketPager({
  page,
  pages,
  onChange,
}: {
  page: number
  pages: number
  onChange: (page: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2 text-sm text-foreground/50">
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs">
        {page} / {pages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
