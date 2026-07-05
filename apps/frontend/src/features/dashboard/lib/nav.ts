import { LayoutGrid, Settings, CreditCard } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/** Módulos com permissão por membro (espelha o backend member-permissions).
 * TODO(larmony): módulos de domínio entram aqui conforme as features do produto
 * forem implementadas (transactions, budgets, goals, bills, reports). */
export const MODULE_KEYS = [] as const
export type ModuleKey = (typeof MODULE_KEYS)[number]

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value)
}

/** Owner vê tudo; membro precisa do módulo. Itens sem módulo são livres. */
export function canAccessModule(
  role: "owner" | "employee",
  permissions: readonly string[],
  module?: ModuleKey,
): boolean {
  if (!module) return true
  return role === "owner" || permissions.includes(module)
}

export interface NavItem {
  /** Label displayed in sidebar and used in breadcrumbs */
  label: string
  /** Path relative to /dashboard/org/[orgSlug]/ — "" = a própria índice; pode incluir barra, e.g. "settings/general" */
  href: string
  icon: LucideIcon
  /** When set, only users with one of these roles see this item. Omit = visible to all. */
  roles?: Array<"owner" | "employee">
  /** When set, the employee needs this module permission (owner ignores). */
  module?: ModuleKey
}

export interface NavSection {
  /** Optional section header rendered above the items */
  label?: string
  items: NavItem[]
}

/** Main navigation + settings sections for the org sidebar */
export const ORG_NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: "Overview", href: "", icon: LayoutGrid }],
  },
  {
    label: "Configurações",
    items: [{ label: "Configurações", href: "settings", icon: Settings, roles: ["owner"] }],
  },
]

/**
 * Sub-nav da página de configurações — owner-only enquanto o Larmony não tem
 * settings por feature. Fonte de verdade do que aparece no OrgSettingsLayout.
 */
export const SETTINGS_NAV: NavItem[] = [
  { label: "Geral", href: "settings/general", icon: Settings, roles: ["owner"] },
  { label: "Assinatura", href: "settings/subscription", icon: CreditCard, roles: ["owner"] },
]

/**
 * Sub-paths (após orgSlug) owner-only, derivados das `roles` do nav principal +
 * settings sub-nav. Usado pelo OrgLayout para redirecionar um membro que tente
 * acessar essas rotas direto pela URL. A fonte de verdade de autorização continua
 * sendo o backend (OrgOwnerGuard); isto é só UX.
 */
const OWNER_ONLY_PATHS: readonly string[] = [
  ...ORG_NAV_SECTIONS.flatMap((s) => s.items),
  ...SETTINGS_NAV,
]
  .filter((item) => item.roles && !item.roles.includes("employee"))
  .map((item) => item.href)

export function isOwnerOnlyPath(subpath: string): boolean {
  return OWNER_ONLY_PATHS.some(
    (p) => subpath === p || subpath.startsWith(p + "/"),
  )
}

/** Maps a path segment (or "settings/X") to a human-readable label for breadcrumbs */
export const PAGE_LABELS: Record<string, string> = {
  members: "Membros",
  settings: "Configurações",
  billing: "Cobrança",
  general: "Geral",
  subscription: "Assinatura",
  organizations: "Organizações",
}
