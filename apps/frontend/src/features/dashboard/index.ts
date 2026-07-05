// Layouts
export { DashboardLayout } from "./components/layouts/dashboard-layout"
export { HouseholdLayout } from "./components/layouts/household-layout"
export { HouseholdSettingsLayout } from "./components/layouts/household-settings-layout"

// Components
export { TopHeader } from "./components/top-header"
export type { BreadcrumbItem } from "./components/top-header"
export { HouseholdSidebar } from "./components/household-sidebar"
export { HouseholdSwitcher } from "./components/household-switcher"
export { UserMenu } from "./components/user-menu"
export { HouseholdProvider, useCurrentHousehold } from "./components/household-context"

// Page content
export { HouseholdsContent } from "./components/pages/households-content"
export { HouseholdPagePlaceholder } from "./components/pages/household-page-placeholder"

// Hooks
export { useHouseholds, useHousehold } from "./hooks/use-households"
export type { HouseholdSummary } from "./hooks/use-households"

// Lib
export { ORG_NAV_SECTIONS, PAGE_LABELS } from "./lib/nav"
export type { NavItem, NavSection } from "./lib/nav"
