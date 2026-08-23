import {
  LayoutGrid,
  ArrowLeftRight,
  Tags,
  PiggyBank,
  Target,
  CalendarClock,
  ChartPie,
  Settings,
  CreditCard,
  FileUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/** Módulos com permissão por membro (espelha o backend member-permissions).
 * v1 não usa permissões por módulo (ADR-0015) — roles owner/member bastam. */
export const MODULE_KEYS = [] as const
export type ModuleKey = (typeof MODULE_KEYS)[number]

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value)
}

/** Owner vê tudo; membro precisa do módulo. Itens sem módulo são livres. */
export function canAccessModule(
  role: "owner" | "member",
  permissions: readonly string[],
  module?: ModuleKey,
): boolean {
  if (!module) return true
  return role === "owner" || permissions.includes(module)
}

export interface NavItem {
  /** Chave i18n (namespace `dashboard`), ex.: "nav.transactions" */
  labelKey: string
  /** Path relativo a /households/[householdSlug]/ — "" = o próprio índice */
  href: string
  icon: LucideIcon
  /** When set, only users with one of these roles see this item. Omit = visible to all. */
  roles?: Array<"owner" | "member">
  /** When set, the member needs this module permission (owner ignores). */
  module?: ModuleKey
  /** `data-tour` attribute for the sidebar onboarding spotlight (see features/onboarding). */
  dataTour?: string
}

export interface NavSection {
  /** Chave i18n opcional do header da seção */
  labelKey?: string
  items: NavItem[]
}

/**
 * IA do produto (v1): as features do roadmap já aparecem — as não entregues
 * renderizam placeholders ricos (ver FEATURE_PAGES) até o milestone chegar.
 */
export const HOUSEHOLD_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { labelKey: "nav.overview", href: "", icon: LayoutGrid, dataTour: "nav-overview" },
      { labelKey: "nav.transactions", href: "transactions", icon: ArrowLeftRight, dataTour: "nav-transactions" },
      { labelKey: "nav.statementImports", href: "statement-imports", icon: FileUp, dataTour: "nav-statement-imports" },
      { labelKey: "nav.categories", href: "categories", icon: Tags, dataTour: "nav-categories" },
      { labelKey: "nav.budgets", href: "budgets", icon: PiggyBank, dataTour: "nav-budgets" },
      { labelKey: "nav.goals", href: "goals", icon: Target, dataTour: "nav-goals" },
      { labelKey: "nav.scheduledTransactions", href: "scheduled-transactions", icon: CalendarClock, dataTour: "nav-scheduled" },
      { labelKey: "nav.reports", href: "reports", icon: ChartPie, dataTour: "nav-reports" },
    ],
  },
  {
    labelKey: "nav.sectionHousehold",
    items: [
      { labelKey: "nav.settings", href: "settings", icon: Settings, roles: ["owner"], dataTour: "nav-settings" },
    ],
  },
]

/** Compat: alias antigo (consumidores migrando). */
export const ORG_NAV_SECTIONS = HOUSEHOLD_NAV_SECTIONS

/** Sub-nav de configurações — owner-only no v1. */
export const SETTINGS_NAV: NavItem[] = [
  { labelKey: "nav.settingsGeneral", href: "settings/general", icon: Settings, roles: ["owner"] },
  { labelKey: "nav.settingsSubscription", href: "settings/subscription", icon: CreditCard, roles: ["owner"] },
]

/** Metadados das features ainda não entregues (placeholders ricos). */
export interface FeaturePageMeta {
  href: string
  icon: LucideIcon
  /** Chaves i18n: placeholders.<key>.title / .description */
  key: string
  /** Milestone do roadmap em que a feature chega */
  milestone: string
}

export const FEATURE_PAGES: FeaturePageMeta[] = [
  { href: "transactions", icon: ArrowLeftRight, key: "transactions", milestone: "M2" },
  { href: "categories", icon: Tags, key: "categories", milestone: "M2" },
  { href: "budgets", icon: PiggyBank, key: "budgets", milestone: "M5" },
  { href: "goals", icon: Target, key: "goals", milestone: "M6" },
  { href: "reports", icon: ChartPie, key: "reports", milestone: "M8" },
]

/**
 * Sub-paths (após householdSlug) owner-only, derivados das `roles` do nav +
 * settings sub-nav. UX only — a autorização de verdade é do backend.
 */
const OWNER_ONLY_PATHS: readonly string[] = [
  ...HOUSEHOLD_NAV_SECTIONS.flatMap((s) => s.items),
  ...SETTINGS_NAV,
]
  .filter((item) => item.roles && !item.roles.includes("member"))
  .map((item) => item.href)

export function isOwnerOnlyPath(subpath: string): boolean {
  return OWNER_ONLY_PATHS.some(
    (p) => subpath === p || subpath.startsWith(p + "/"),
  )
}

/** Segmento de rota → chave i18n (namespace dashboard) para breadcrumbs. */
export const PAGE_LABEL_KEYS: Record<string, string> = {
  transactions: "nav.transactions",
  "statement-imports": "nav.statementImports",
  categories: "nav.categories",
  budgets: "nav.budgets",
  goals: "nav.goals",
  "scheduled-transactions": "nav.scheduledTransactions",
  reports: "nav.reports",
  members: "nav.members",
  settings: "nav.settings",
  billing: "nav.billing",
  general: "nav.settingsGeneral",
  subscription: "nav.settingsSubscription",
  households: "nav.households",
}
