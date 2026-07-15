import {
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  CircleMinus,
  CirclePlus,
  Gamepad2,
  Heart,
  Home,
  RefreshCw,
  Shirt,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"

/** Ícones disponíveis no picker — os mesmos usados nas 13 categorias default + fallback.
 * `labelKey` é resolvida no render via i18n (namespace `categories`). */
export const CATEGORY_ICON_OPTIONS: { value: string; labelKey: string; Icon: LucideIcon }[] = [
  { value: "Banknote", labelKey: "icons.banknote", Icon: Banknote },
  { value: "Briefcase", labelKey: "icons.briefcase", Icon: Briefcase },
  { value: "TrendingUp", labelKey: "icons.trendingUp", Icon: TrendingUp },
  { value: "UtensilsCrossed", labelKey: "icons.utensilsCrossed", Icon: UtensilsCrossed },
  { value: "Home", labelKey: "icons.home", Icon: Home },
  { value: "Car", labelKey: "icons.car", Icon: Car },
  { value: "Heart", labelKey: "icons.heart", Icon: Heart },
  { value: "BookOpen", labelKey: "icons.bookOpen", Icon: BookOpen },
  { value: "Gamepad2", labelKey: "icons.gamepad2", Icon: Gamepad2 },
  { value: "Shirt", labelKey: "icons.shirt", Icon: Shirt },
  { value: "RefreshCw", labelKey: "icons.refreshCw", Icon: RefreshCw },
  { value: "CirclePlus", labelKey: "icons.circlePlus", Icon: CirclePlus },
  { value: "CircleMinus", labelKey: "icons.circleMinus", Icon: CircleMinus },
]

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map(({ value, Icon }) => [value, Icon]),
)

export function resolveCategoryIcon(name: string | null): LucideIcon {
  return (name && ICON_MAP[name]) || Tag
}
