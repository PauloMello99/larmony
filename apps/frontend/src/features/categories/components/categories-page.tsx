"use client"

import { useState } from "react"
import { PlusCircle, Tags } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useCategories } from "../hooks/use-categories"
import { useCategoryMutations } from "../hooks/use-category-mutations"
import { CategoryForm } from "./category-form"
import { CategoryList } from "./category-list"
import { DeleteCategoryDialog } from "./delete-category-dialog"
import type { Category } from "../types"
import type { CategoryFormValues } from "../schemas/category.schemas"

export function CategoriesPage() {
  const { householdId } = useCurrentHousehold()
  const { categories, loading } = useCategories(householdId)
  const { createCategory, updateCategory, deleteCategory } = useCategoryMutations(householdId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setFormOpen(true)
  }

  async function handleSubmit(values: CategoryFormValues) {
    if (editing) {
      await updateCategory(editing.id, values)
    } else {
      await createCategory(values)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Categorias</h1>
          <p className="mt-1 text-sm text-foreground/40">
            Organize suas transações, orçamentos e contas por categoria
          </p>
        </div>
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          size="sm"
          onClick={openCreate}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <Tags className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">Nenhuma categoria ainda.</p>
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            onClick={openCreate}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar categoria
          </Button>
        </div>
      ) : (
        <CategoryList categories={categories} onEdit={openEdit} onDelete={setDeleting} />
      )}

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        onSubmit={handleSubmit}
      />

      <DeleteCategoryDialog
        category={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteCategory(deleting.id)
        }}
      />
    </div>
  )
}
