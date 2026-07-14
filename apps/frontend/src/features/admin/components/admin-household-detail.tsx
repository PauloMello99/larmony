"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Ban,
  RotateCcw,
  Users,
  Crown,
  Mail,
  Loader2,
  ExternalLink,
  Clock,
  Globe,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { ApiError } from "@/infrastructure/api/client"
import { translateApiError } from "@/shared/lib/api-error"
import { formatCentsToBRL } from "@/shared/lib/currency"
import {
  useAdminAuditLogs,
  useAdminHouseholdBudgets,
  useAdminHouseholdCategories,
  useAdminHouseholdDetail,
  useAdminHouseholdGoals,
  useAdminHouseholdNotifications,
  useAdminHouseholdScheduledEntries,
  useAdminHouseholdTransactions,
  useSetHouseholdSuspended,
} from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { ConfirmDialog } from "./confirm-dialog"
import { AdminSubscriptionPanel } from "./admin-subscription-panel"
import { PlanBadge } from "./plan-badge"
import { Pager } from "./pager"

type Tab = "overview" | "members" | "subscription" | "finance" | "activity" | "notifications"

const TABS: { value: Tab; labelKey: string }[] = [
  { value: "overview", labelKey: "householdDetail.tabOverview" },
  { value: "members", labelKey: "householdDetail.tabMembers" },
  { value: "subscription", labelKey: "householdDetail.tabSubscription" },
  { value: "finance", labelKey: "householdDetail.tabFinance" },
  { value: "activity", labelKey: "householdDetail.tabActivity" },
  { value: "notifications", labelKey: "householdDetail.tabNotifications" },
]

export function AdminHouseholdDetail({ id }: { id: string | undefined }) {
  const { t } = useTranslation("admin")
  const { t: tCommon } = useTranslation("common")
  const { household, loading, error } = useAdminHouseholdDetail(id)
  const setSuspended = useSetHouseholdSuspended()

  const [tab, setTab] = React.useState<Tab>("overview")
  const [confirming, setConfirming] = React.useState(false)
  const [needsCancel, setNeedsCancel] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  function closeDialog() {
    setConfirming(false)
    setNeedsCancel(false)
    setActionError(null)
  }

  async function confirmToggle() {
    if (!household) return
    setBusy(true)
    setActionError(null)
    try {
      await setSuspended(household.id, household.suspendedAt === null, needsCancel || undefined)
      closeDialog()
    } catch (err) {
      if (err instanceof ApiError && err.code === "HOUSEHOLD_HAS_ACTIVE_SUBSCRIPTION") {
        setNeedsCancel(true)
      } else {
        setActionError(
          err instanceof Error
            ? translateApiError(err, tCommon)
            : t("householdDetail.updateError"),
        )
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error || !household) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error ?? t("householdDetail.notFound")}
        </div>
      </div>
    )
  }

  const suspended = household.suspendedAt !== null

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">
              {household.name}
            </h1>
            <PlanBadge
              plan={household.subscription?.type ?? "free"}
              status={household.subscription?.status}
            />
            {suspended && (
              <Badge variant="destructive" className="bg-red-500/15 text-red-400">
                {t("householdDetail.suspendedBadge")}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-foreground/40">
            {t("householdDetail.slugCreatedAt", { slug: household.slug, date: fmtDate(household.createdAt, t) })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="default">
            <Link href={`/households/${household.slug}`}>
              <ExternalLink className="h-4 w-4" /> {t("householdDetail.manage")}
            </Link>
          </Button>
          <Button
            variant={suspended ? "outline" : "destructive"}
            onClick={() => {
              setActionError(null)
              setNeedsCancel(false)
              setConfirming(true)
            }}
          >
            {suspended ? (
              <>
                <RotateCcw className="h-4 w-4" /> {t("householdDetail.reactivate")}
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" /> {t("householdDetail.suspend")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto border-b border-foreground/[0.06]">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === item.value
                ? "border-primary text-foreground"
                : "border-transparent text-foreground/50 hover:text-foreground"
            }`}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab household={household} t={t} />}
      {tab === "members" && <MembersTab household={household} t={t} />}
      {tab === "subscription" && (
        <AdminSubscriptionPanel householdId={household.id} householdName={household.name} />
      )}
      {tab === "finance" && <FinanceTab householdId={household.id} />}
      {tab === "activity" && <ActivityTab householdId={household.id} />}
      {tab === "notifications" && <NotificationsTab householdId={household.id} />}

      <ConfirmDialog
        open={confirming}
        onOpenChange={(o) => !o && closeDialog()}
        title={
          needsCancel
            ? t("households.confirmCancelSuspendTitle", { name: household.name })
            : suspended
              ? t("householdDetail.confirmReactivateTitle", { name: household.name })
              : t("householdDetail.confirmSuspendTitle", { name: household.name })
        }
        description={
          needsCancel
            ? t("households.confirmCancelSuspendDescription")
            : suspended
              ? t("householdDetail.confirmReactivateDescription")
              : t("householdDetail.confirmSuspendDescription")
        }
        confirmLabel={
          needsCancel
            ? t("households.cancelAndSuspend")
            : suspended
              ? t("householdDetail.reactivate")
              : t("householdDetail.suspend")
        }
        destructive={!suspended}
        loading={busy}
        error={actionError}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  )
}

// ── Abas ─────────────────────────────────────────────────────────────────────

type Detail = NonNullable<ReturnType<typeof useAdminHouseholdDetail>["household"]>
type TFn = ReturnType<typeof useTranslation>["t"]

function OverviewTab({ household, t }: { household: Detail; t: TFn }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoCard icon={Users} label={t("householdDetail.infoMembers")} value={String(household.memberCount)} />
        <InfoCard
          icon={Crown}
          label={t("householdDetail.infoOwner")}
          value={household.owner?.name ?? "—"}
          sub={household.owner?.email}
        />
        <InfoCard
          icon={Mail}
          label={t("householdDetail.infoPendingInvitations")}
          value={String(household.pendingInvitations.length)}
        />
      </div>
      {/* Configurações gerais do lar (ADR-0024) */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={Globe} label={t("householdDetail.infoTimezone")} value={household.timezone.replace(/_/g, " ")} />
        <InfoCard
          icon={Clock}
          label={t("householdDetail.infoNotificationHour")}
          value={`${String(household.notificationHour).padStart(2, "0")}:00`}
        />
      </div>
    </div>
  )
}

function MembersTab({ household, t }: { household: Detail; t: TFn }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{t("householdDetail.membersTitle")}</h2>
        <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("householdDetail.colName")}</TableHead>
                <TableHead>{t("householdDetail.colRole")}</TableHead>
                <TableHead>{t("householdDetail.colStatus")}</TableHead>
                <TableHead>{t("householdDetail.colJoined")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {household.members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${m.userId}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {m.name}
                    </Link>
                    <span className="block text-xs text-foreground/40">{m.email}</span>
                  </TableCell>
                  <TableCell>
                    {m.role === "owner" ? (
                      <Badge className="bg-primary/15 text-primary">{t("householdDetail.roleOwner")}</Badge>
                    ) : (
                      <span className="text-foreground/60">{m.role}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.enabled ? (
                      <span className="text-foreground/60">{t("householdDetail.statusActive")}</span>
                    ) : (
                      <span className="text-red-400">{t("householdDetail.statusInactive")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground/50">{fmtDate(m.joinedAt, t)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {household.pendingInvitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">{t("householdDetail.invitationsTitle")}</h2>
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("householdDetail.colEmail")}</TableHead>
                  <TableHead>{t("householdDetail.colRole")}</TableHead>
                  <TableHead>{t("householdDetail.colSent")}</TableHead>
                  <TableHead>{t("householdDetail.colExpires")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {household.pendingInvitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-foreground/80">{inv.email}</TableCell>
                    <TableCell className="text-foreground/60">{inv.role}</TableCell>
                    <TableCell className="text-foreground/50">{fmtDate(inv.createdAt, t)}</TableCell>
                    <TableCell className="text-foreground/50">{fmtDate(inv.expiresAt, t)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  )
}

type FinanceSection = "transactions" | "categories" | "budgets" | "goals" | "scheduled"

const FINANCE_SECTIONS: { value: FinanceSection; labelKey: string }[] = [
  { value: "transactions", labelKey: "householdDetail.financeTransactions" },
  { value: "categories", labelKey: "householdDetail.financeCategories" },
  { value: "budgets", labelKey: "householdDetail.financeBudgets" },
  { value: "goals", labelKey: "householdDetail.financeGoals" },
  { value: "scheduled", labelKey: "householdDetail.financeScheduled" },
]

function FinanceTab({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const [section, setSection] = React.useState<FinanceSection>("transactions")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-md border border-foreground/[0.08] p-0.5 sm:inline-flex">
        {FINANCE_SECTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSection(s.value)}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              section === s.value
                ? "bg-foreground/[0.08] text-foreground"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      {section === "transactions" && <TransactionsSection householdId={householdId} />}
      {section === "categories" && <CategoriesSection householdId={householdId} />}
      {section === "budgets" && <BudgetsSection householdId={householdId} />}
      {section === "goals" && <GoalsSection householdId={householdId} />}
      {section === "scheduled" && <ScheduledSection householdId={householdId} />}
    </div>
  )
}

function TabShell({
  loading,
  error,
  empty,
  emptyLabel,
  children,
  pager,
}: {
  loading: boolean
  error: string | null
  empty: boolean
  emptyLabel: string
  children: React.ReactNode
  pager?: React.ReactNode
}) {
  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-foreground/[0.02]" />
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
        {error}
      </div>
    )
  }
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/10 px-4 py-10 text-center text-sm text-foreground/40">
        {emptyLabel}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">{children}</div>
      {pager}
    </div>
  )
}

function AmountCell({ type, amountCents }: { type: string; amountCents: number }) {
  return (
    <span className={`tabular-nums ${type === "income" ? "text-emerald-400" : "text-foreground/80"}`}>
      {type === "income" ? "+" : "-"}
      {formatCentsToBRL(amountCents)}
    </span>
  )
}

function TransactionsSection({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const [page, setPage] = React.useState(1)
  const [type, setType] = React.useState<"income" | "expense" | undefined>(undefined)
  const result = useAdminHouseholdTransactions(householdId, { page, type })

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border border-foreground/[0.08] p-0.5">
        {([undefined, "income", "expense"] as const).map((v) => (
          <button
            key={v ?? "all"}
            type="button"
            onClick={() => {
              setType(v)
              setPage(1)
            }}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              type === v
                ? "bg-foreground/[0.08] text-foreground"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            {v === undefined
              ? t("householdDetail.txAll")
              : v === "income"
                ? t("householdDetail.txIncome")
                : t("householdDetail.txExpense")}
          </button>
        ))}
      </div>
      <TabShell
        loading={result.loading}
        error={result.error}
        empty={(result.page?.data.length ?? 0) === 0}
        emptyLabel={t("householdDetail.financeEmpty")}
        pager={
          result.page && <Pager page={result.page.page} pages={result.page.pages} onChange={setPage} />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("householdDetail.colDate")}</TableHead>
              <TableHead>{t("householdDetail.colDescription")}</TableHead>
              <TableHead>{t("householdDetail.colCategory")}</TableHead>
              <TableHead className="text-right">{t("householdDetail.colAmount")}</TableHead>
              <TableHead>{t("householdDetail.colBy")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.page?.data.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="whitespace-nowrap text-foreground/50">{fmtDate(tx.date, t)}</TableCell>
                <TableCell>
                  <span className="text-foreground/80">{tx.description}</span>
                  <span className="ml-1.5 inline-flex gap-1">
                    {tx.installmentNumber && (
                      <Badge className="bg-foreground/[0.08] text-[10px] text-foreground/50">
                        {tx.installmentNumber}/{tx.installmentCount}
                      </Badge>
                    )}
                    {tx.isScheduled && (
                      <Badge className="bg-sky-400/10 text-[10px] text-sky-400">
                        {t("householdDetail.scheduledBadge")}
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  {tx.categoryName ? (
                    <span className="inline-flex items-center gap-1.5 text-foreground/60">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tx.categoryColor ?? undefined }}
                      />
                      {tx.categoryName}
                    </span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <AmountCell type={tx.type} amountCents={tx.amountCents} />
                </TableCell>
                <TableCell className="text-foreground/50">{tx.personName ?? tx.createdByName ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabShell>
    </div>
  )
}

function CategoriesSection({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const [page, setPage] = React.useState(1)
  const result = useAdminHouseholdCategories(householdId, page)

  return (
    <TabShell
      loading={result.loading}
      error={result.error}
      empty={(result.page?.data.length ?? 0) === 0}
      emptyLabel={t("householdDetail.financeEmpty")}
      pager={result.page && <Pager page={result.page.page} pages={result.page.pages} onChange={setPage} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("householdDetail.colName")}</TableHead>
            <TableHead>{t("householdDetail.colType")}</TableHead>
            <TableHead>{t("householdDetail.colDefault")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.page?.data.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-foreground/80">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
              </TableCell>
              <TableCell className="text-foreground/60">{c.type}</TableCell>
              <TableCell>
                {c.isDefault ? (
                  <Badge className="bg-foreground/[0.08] text-foreground/50">
                    {t("householdDetail.defaultBadge")}
                  </Badge>
                ) : (
                  <span className="text-foreground/30">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  )
}

function BudgetsSection({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const [page, setPage] = React.useState(1)
  const result = useAdminHouseholdBudgets(householdId, page)

  return (
    <TabShell
      loading={result.loading}
      error={result.error}
      empty={(result.page?.data.length ?? 0) === 0}
      emptyLabel={t("householdDetail.financeEmpty")}
      pager={result.page && <Pager page={result.page.page} pages={result.page.pages} onChange={setPage} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("householdDetail.colCategory")}</TableHead>
            <TableHead className="text-right">{t("householdDetail.colCurrentLimit")}</TableHead>
            <TableHead>{t("householdDetail.colStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.page?.data.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-foreground/80">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.categoryColor }} />
                  {b.categoryName}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-foreground/80">
                {b.currentAmountCents !== null ? formatCentsToBRL(b.currentAmountCents) : "—"}
              </TableCell>
              <TableCell>
                {b.endedFrom ? (
                  <span className="text-foreground/40">
                    {t("householdDetail.budgetEnded", { date: fmtDate(b.endedFrom, t) })}
                  </span>
                ) : (
                  <span className="text-emerald-400">{t("householdDetail.budgetOpen")}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  )
}

function GoalsSection({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const [page, setPage] = React.useState(1)
  const result = useAdminHouseholdGoals(householdId, page)

  return (
    <TabShell
      loading={result.loading}
      error={result.error}
      empty={(result.page?.data.length ?? 0) === 0}
      emptyLabel={t("householdDetail.financeEmpty")}
      pager={result.page && <Pager page={result.page.page} pages={result.page.pages} onChange={setPage} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("householdDetail.colName")}</TableHead>
            <TableHead className="text-right">{t("householdDetail.colProgress")}</TableHead>
            <TableHead>{t("householdDetail.colTargetDate")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.page?.data.map((g) => (
            <TableRow key={g.id}>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-foreground/80">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-foreground/80">
                {formatCentsToBRL(g.currentAmountCents)} / {formatCentsToBRL(g.targetAmountCents)}
              </TableCell>
              <TableCell className="text-foreground/50">
                {g.targetDate ? fmtDate(g.targetDate, t) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  )
}

function ScheduledSection({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const [page, setPage] = React.useState(1)
  const result = useAdminHouseholdScheduledEntries(householdId, page)

  return (
    <TabShell
      loading={result.loading}
      error={result.error}
      empty={(result.page?.data.length ?? 0) === 0}
      emptyLabel={t("householdDetail.financeEmpty")}
      pager={result.page && <Pager page={result.page.page} pages={result.page.pages} onChange={setPage} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("householdDetail.colDescription")}</TableHead>
            <TableHead className="text-right">{t("householdDetail.colAmount")}</TableHead>
            <TableHead>{t("householdDetail.colMode")}</TableHead>
            <TableHead>{t("householdDetail.colNextRun")}</TableHead>
            <TableHead>{t("householdDetail.colStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.page?.data.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <span className="text-foreground/80">{e.description}</span>
                {e.categoryName && (
                  <span className="block text-xs text-foreground/40">{e.categoryName}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <AmountCell type={e.type} amountCents={e.amountCents} />
              </TableCell>
              <TableCell>
                <Badge className="bg-foreground/[0.08] text-foreground/50">
                  {e.postingMode === "auto"
                    ? t("householdDetail.modeAuto")
                    : t("householdDetail.modeManual")}
                </Badge>
              </TableCell>
              <TableCell className="text-foreground/50">
                {e.nextRunDate ? fmtDate(e.nextRunDate, t) : "—"}
              </TableCell>
              <TableCell>
                {e.isActive ? (
                  <span className="text-emerald-400">{t("householdDetail.statusActive")}</span>
                ) : (
                  <span className="text-foreground/40">{t("householdDetail.statusInactive")}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  )
}

function ActivityTab({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const [page, setPage] = React.useState(1)
  const { page: result, loading, error } = useAdminAuditLogs({ householdId, page, limit: 20 })
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  return (
    <TabShell
      loading={loading}
      error={error}
      empty={(result?.data.length ?? 0) === 0}
      emptyLabel={t("auditLogs.empty")}
      pager={result && <Pager page={result.page} pages={result.pages} onChange={setPage} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("auditLogs.colDateTime")}</TableHead>
            <TableHead>{t("auditLogs.colActor")}</TableHead>
            <TableHead>{t("auditLogs.colAction")}</TableHead>
            <TableHead>{t("auditLogs.colEntity")}</TableHead>
            <TableHead className="text-right">{t("auditLogs.colMetadata")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result?.data.map((row) => (
            <React.Fragment key={row.id}>
              <TableRow
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                <TableCell className="whitespace-nowrap text-xs text-foreground/60">
                  {fmtDate(row.createdAt, t)}
                </TableCell>
                <TableCell>
                  {row.actor ? (
                    <span className="text-sm text-foreground/80">{row.actor.name || row.actor.email}</span>
                  ) : (
                    <span className="text-xs text-foreground/40">{t("auditLogs.system")}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className="bg-foreground/[0.08] text-xs text-foreground/60">{row.action}</Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-foreground/60">{row.entityType}</span>
                </TableCell>
                <TableCell className="text-right">
                  {row.metadata && Object.keys(row.metadata).length > 0 ? (
                    <span className="text-xs text-foreground/40 underline decoration-dotted">
                      {expandedId === row.id ? t("auditLogs.metadataClose") : t("auditLogs.metadataView")}
                    </span>
                  ) : (
                    <span className="text-xs text-foreground/20">—</span>
                  )}
                </TableCell>
              </TableRow>
              {expandedId === row.id && row.metadata && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-foreground/[0.02] py-2 pl-4">
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-foreground/70">
                      {JSON.stringify(row.metadata, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  )
}

function NotificationsTab({ householdId }: { householdId: string }) {
  const { t } = useTranslation("admin")
  const [page, setPage] = React.useState(1)
  const result = useAdminHouseholdNotifications(householdId, page)

  return (
    <TabShell
      loading={result.loading}
      error={result.error}
      empty={(result.page?.data.length ?? 0) === 0}
      emptyLabel={t("householdDetail.notificationsEmpty")}
      pager={result.page && <Pager page={result.page.page} pages={result.page.pages} onChange={setPage} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("householdDetail.colDate")}</TableHead>
            <TableHead>{t("householdDetail.colRecipient")}</TableHead>
            <TableHead>{t("householdDetail.colType")}</TableHead>
            <TableHead>{t("householdDetail.colNotification")}</TableHead>
            <TableHead>{t("householdDetail.colRead")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.page?.data.map((n) => (
            <TableRow key={n.id}>
              <TableCell className="whitespace-nowrap text-foreground/50">
                {fmtDate(n.createdAt, t)}
              </TableCell>
              <TableCell className="text-foreground/70">{n.userName ?? "—"}</TableCell>
              <TableCell>
                <span className="font-mono text-xs text-foreground/50">{n.type}</span>
              </TableCell>
              <TableCell>
                <span className="text-foreground/80">{n.title}</span>
                <span className="block max-w-md truncate text-xs text-foreground/40">{n.body}</span>
              </TableCell>
              <TableCell>
                {n.readAt ? (
                  <span className="text-foreground/40">{t("householdDetail.readYes")}</span>
                ) : (
                  <span className="text-orange-400">{t("householdDetail.readNo")}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  )
}

function BackLink() {
  const { t } = useTranslation("admin")
  return (
    <Link
      href="/admin/households"
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {t("householdDetail.backLink")}
    </Link>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4">
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold text-foreground">{value}</p>
      {sub && <p className="truncate text-xs text-foreground/40">{sub}</p>}
    </div>
  )
}
