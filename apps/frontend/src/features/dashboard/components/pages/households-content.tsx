import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { PlusCircle, Building2, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { useHouseholds } from "@/features/dashboard/hooks/use-households"
import { CreateHouseholdForm, useHouseholdMutations } from "@/features/households"
import type { CreateHouseholdFormValues } from "@/features/households"

const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  member: "Membro",
}

export function HouseholdsContent() {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const { households, loading } = useHouseholds()
  const { createHousehold } = useHouseholdMutations()
  const isWelcome = router.query.welcome === "1"
  const autoOpened = React.useRef(false)

  // Onboarding (M1b): recém-cadastrado sem lares ainda → abre o Sheet de criar
  // lar automaticamente, uma única vez.
  React.useEffect(() => {
    if (!isWelcome || loading || autoOpened.current) return
    if (households.length === 0) {
      autoOpened.current = true
      setCreateOpen(true)
    }
  }, [isWelcome, loading, households])

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open)
    if (!open && isWelcome) {
      void router.replace("/dashboard/households", undefined, { shallow: true })
    }
  }

  async function handleCreate(values: CreateHouseholdFormValues) {
    await createHousehold(values)
    // invalidateQueries in useHouseholdMutations.onSuccess triggers automatic refetch
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Lares
          </h1>
          <p className="mt-1 text-sm text-foreground/40">
            Selecione um lar para continuar
          </p>
        </div>
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo lar
        </Button>
      </div>

      {/* Household list */}
      {households.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <Building2 className="mb-4 h-10 w-10 text-foreground/20" />
          {isWelcome ? (
            <>
              <p className="text-base font-medium text-foreground">
                Bem-vindo(a) ao Larmony!
              </p>
              <p className="mt-1 text-sm text-foreground/40">
                Vamos criar o primeiro lar para organizar as finanças da sua casa.
              </p>
            </>
          ) : (
            <p className="text-sm text-foreground/40">Nenhum lar ainda.</p>
          )}
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar lar
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {households.map((household) => (
            <li key={household.id}>
              <Link
                href={`/dashboard/household/${household.slug}`}
                className="group flex items-center justify-between rounded-xl border border-foreground/5 bg-foreground/[0.02] px-4 py-3.5 transition-all hover:border-foreground/10 hover:bg-foreground/[0.05] sm:px-5 sm:py-4"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary sm:h-10 sm:w-10 sm:text-base">
                    {household.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{household.name}</p>
                    <p className="truncate text-sm text-foreground/40">/{household.slug}</p>
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
                  <Badge
                    variant="outline"
                    className="hidden border-foreground/10 text-foreground/50 sm:inline-flex"
                  >
                    {ROLE_LABELS[household.role]}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-foreground/20 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/40" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateHouseholdForm
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
        onSubmit={handleCreate}
      />
    </div>
  )
}
