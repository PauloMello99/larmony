"use client"

import { useTranslation } from "react-i18next"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { resolveCategoryIcon } from "../lib/icon-options"
import type { Category } from "../types"

/** Chaves i18n (namespace `categories`) — resolvidas no render. */
const TYPE_LABEL_KEY: Record<Category["type"], string> = {
  income: "types.income",
  expense: "types.expense",
  both: "types.both",
}

const TYPE_CLASS: Record<Category["type"], string> = {
  income: "bg-success/10 text-success",
  expense: "bg-destructive/10 text-destructive",
  both: "bg-foreground/5 text-foreground/50",
}

interface CategoryListProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

function CategoryIcon({ category }: { category: Category }) {
  const Icon = resolveCategoryIcon(category.icon)
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${category.color}22`, color: category.color }}
    >
      <Icon className="h-4 w-4" />
    </div>
  )
}

function CategoryActions({ category, onEdit, onDelete }: {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  const { t: tCommon } = useTranslation("common")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(category)}>
          <Pencil className="mr-2 h-4 w-4" />
          {tCommon("actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-400 focus:text-red-400"
          onClick={() => onDelete(category)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {tCommon("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  const { t } = useTranslation("categories")
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-foreground/10 sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground/[0.02] hover:bg-transparent">
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("list.headerName")}
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("list.headerType")}
              </TableHead>
              <TableHead className="w-12 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={category} />
                    <span className="font-medium">
                      {category.name}
                      {category.isDefault && (
                        <span className="ml-2 text-xs text-foreground/30">
                          {t("list.defaultSuffix")}
                        </span>
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      TYPE_CLASS[category.type],
                    )}
                  >
                    {t(TYPE_LABEL_KEY[category.type])}
                  </span>
                </TableCell>
                <TableCell className="px-4">
                  <CategoryActions category={category} onEdit={onEdit} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3"
          >
            <CategoryIcon category={category} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {category.name}
                {category.isDefault && (
                  <span className="ml-1 text-xs text-foreground/30">
                    {t("list.defaultSuffix")}
                  </span>
                )}
              </p>
              <span
                className={cn(
                  "mt-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                  TYPE_CLASS[category.type],
                )}
              >
                {t(TYPE_LABEL_KEY[category.type])}
              </span>
            </div>
            <CategoryActions category={category} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </>
  )
}
