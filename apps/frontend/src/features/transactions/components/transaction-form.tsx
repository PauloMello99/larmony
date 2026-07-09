"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import { CurrencyInput } from "@/shared/components/ui/currency-input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { useMembers } from "@/features/households/hooks/use-members"
import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider"
import { makeTransactionSchema, type TransactionFormValues } from "../schemas/transaction.schemas"
import { useTransactionMembers } from "../hooks/use-transaction-members"
import { RateioField, type RateioMode } from "./rateio-field"
import type { Transaction, TransactionType } from "../types"

/** Chaves i18n (namespace `transactions`) por tipo — mesmo padrão de features/dashboard/lib/nav.ts. */
const TYPE_LABEL_KEY: Record<TransactionType, string> = {
  income: "form.typeIncome",
  expense: "form.typeExpense",
}

const DEFAULT_VALUES: TransactionFormValues = {
  type: "expense",
  amountCents: 0,
  description: "",
  date: new Date().toISOString().slice(0, 10),
  categoryId: undefined,
  personId: undefined,
  notes: undefined,
}

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  transaction?: Transaction | null
  onSubmit: (values: TransactionFormValues) => Promise<void>
}

export function TransactionForm({
  open,
  onOpenChange,
  householdId,
  transaction,
  onSubmit,
}: TransactionFormProps) {
  const { t } = useTranslation("transactions")
  const { t: tCommon } = useTranslation("common")
  const isEditing = !!transaction
  const { categories } = useCategories(householdId)
  const { members } = useMembers(householdId)
  const { startTour, isTourSeen, activeTour } = useOnboarding()

  // Rateio ao editar: carrega os aportes existentes da transação.
  const editingRateado = isEditing && (transaction?.memberCount ?? 0) > 0
  const { members: existingMembers } = useTransactionMembers(
    householdId,
    editingRateado && open ? (transaction?.id ?? null) : null,
  )

  // ── Estado local de parcelamento + rateio (fora do zod) ──
  const [parcelarOn, setParcelarOn] = useState(false)
  const [installmentCount, setInstallmentCount] = useState(2)
  const [rateioOn, setRateioOn] = useState(false)
  const [rateioMode, setRateioMode] = useState<RateioMode>("equal")
  const [selected, setSelected] = useState<string[]>([])
  const [shares, setShares] = useState<Record<string, number>>({})
  const [rateioInit, setRateioInit] = useState(false)

  const schema = useMemo(() => makeTransactionSchema(t), [t])
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const type = form.watch("type")
  const amountCents = form.watch("amountCents")
  const compatibleCategories = categories.filter((c) => c.type === "both" || c.type === type)

  useEffect(() => {
    if (open) {
      form.reset(
        transaction
          ? {
              type: transaction.type,
              amountCents: transaction.amountCents,
              description: transaction.description,
              date: transaction.date,
              categoryId: transaction.categoryId ?? undefined,
              personId: transaction.personId ?? undefined,
              notes: transaction.notes ?? undefined,
            }
          : DEFAULT_VALUES,
      )
      // Reset dos controles locais.
      setParcelarOn(false)
      setInstallmentCount(2)
      setRateioMode("equal")
      setRateioInit(false)
      if (!editingRateado) {
        setRateioOn(false)
        setSelected([])
        setShares({})
      }
    }
  }, [open, transaction, form, editingRateado])

  // Tour do formulário — só na criação, e só quando nenhum outro tour está ativo.
  useEffect(() => {
    if (!open || isEditing || activeTour || isTourSeen("transaction-form")) return
    const id = requestAnimationFrame(() => startTour("transaction-form"))
    return () => cancelAnimationFrame(id)
  }, [open, isEditing, activeTour, isTourSeen, startTour])

  // Inicializa o rateio ao editar, quando os aportes chegam.
  useEffect(() => {
    if (open && editingRateado && !rateioInit && existingMembers.length > 0) {
      const hasSpecific = existingMembers.some((m) => m.shareAmountCents !== null)
      setRateioOn(true)
      setRateioMode(hasSpecific ? "specific" : "equal")
      setSelected(existingMembers.map((m) => m.userId))
      setShares(
        Object.fromEntries(existingMembers.map((m) => [m.userId, m.effectiveShareCents])),
      )
      setRateioInit(true)
    }
  }, [open, editingRateado, existingMembers, rateioInit])

  const allowSpecific = !parcelarOn // parcela combinada só aceita rateio igual

  function toggleMember(userId: string) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  function buildMembers(): TransactionFormValues["members"] {
    if (!rateioOn) return isEditing ? [] : undefined // edit: [] limpa o rateio
    return selected.map((userId) => ({
      userId,
      shareAmountCents: allowSpecific && rateioMode === "specific" ? (shares[userId] ?? 0) : null,
    }))
  }

  // Validação leve do modo específico (o backend é a guarda final).
  const specificSum = selected.reduce((s, uid) => s + (shares[uid] ?? 0), 0)
  const rateioInvalid =
    rateioOn &&
    (selected.length < 1 ||
      (allowSpecific && rateioMode === "specific" && specificSum !== amountCents))

  const handleSubmit = form.handleSubmit(async (values) => {
    if (rateioInvalid) return
    await onSubmit({
      ...values,
      installmentCount: parcelarOn && !isEditing ? installmentCount : undefined,
      members: buildMembers(),
    })
    onOpenChange(false)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{isEditing ? t("form.titleEdit") : t("form.titleCreate")}</SheetTitle>
              <SheetDescription>{t("form.description")}</SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.typeLabel")}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v)
                          form.setValue("categoryId", undefined)
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(TYPE_LABEL_KEY) as TransactionType[]).map((v) => (
                            <SelectItem key={v} value={v}>
                              {t(TYPE_LABEL_KEY[v])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {parcelarOn ? t("form.amountTotalLabel") : t("form.amountLabel")}{" "}
                        <span className="text-red-400">*</span>
                      </FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.descriptionLabel")} <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("form.descriptionPlaceholder")}
                        autoComplete="off"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.dateLabel")}</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem data-tour="tx-field-category">
                      <FormLabel>{t("form.categoryLabel")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("form.categoryPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {compatibleCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personId"
                  render={({ field }) => (
                    <FormItem data-tour="tx-field-person">
                      <FormLabel>{t("form.personLabel")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("form.personPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.userName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.notesLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.notesPlaceholder")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parcelamento (só na criação) */}
              {!isEditing && (
                <div
                  data-tour="tx-field-installments"
                  className="flex flex-col gap-3 rounded-lg border border-foreground/[0.08] p-3"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tx-parcelar" className="text-sm font-normal">
                      {t("form.installmentsLabel")}
                    </Label>
                    <Switch id="tx-parcelar" checked={parcelarOn} onCheckedChange={setParcelarOn} />
                  </div>
                  {parcelarOn && (
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={2}
                        max={60}
                        value={installmentCount}
                        onChange={(e) =>
                          setInstallmentCount(Math.max(2, Math.min(60, Number(e.target.value) || 2)))
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-foreground/50">
                        {t("form.installmentsPreview", {
                          count: installmentCount,
                          amount: formatCentsToBRL(Math.floor(amountCents / installmentCount)),
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Rateio */}
              <div data-tour="tx-field-split" className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-lg border border-foreground/[0.08] p-3">
                  <Label htmlFor="tx-rateio" className="text-sm font-normal">
                    {t("form.splitLabel")}
                  </Label>
                  <Switch id="tx-rateio" checked={rateioOn} onCheckedChange={setRateioOn} />
                </div>
                {rateioOn && (
                  <RateioField
                    members={members.map((m) => ({ userId: m.userId, userName: m.userName }))}
                    selected={selected}
                    onToggle={toggleMember}
                    mode={rateioMode}
                    onModeChange={setRateioMode}
                    shares={shares}
                    onShareChange={(userId, cents) =>
                      setShares((prev) => ({ ...prev, [userId]: cents }))
                    }
                    amountCents={amountCents}
                    allowSpecific={allowSpecific}
                  />
                )}
              </div>
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  {tCommon("actions.cancel")}
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || rateioInvalid}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting
                  ? t("form.submitting")
                  : isEditing
                    ? t("form.submitEdit")
                    : parcelarOn
                      ? t("form.submitInstallments")
                      : t("form.submitCreate")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
