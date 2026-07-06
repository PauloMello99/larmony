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

/** Ícones disponíveis no picker — os mesmos usados nas 13 categorias default + fallback. */
export const CATEGORY_ICON_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "Banknote", label: "Dinheiro", Icon: Banknote },
  { value: "Briefcase", label: "Trabalho", Icon: Briefcase },
  { value: "TrendingUp", label: "Investimentos", Icon: TrendingUp },
  { value: "UtensilsCrossed", label: "Alimentação", Icon: UtensilsCrossed },
  { value: "Home", label: "Moradia", Icon: Home },
  { value: "Car", label: "Transporte", Icon: Car },
  { value: "Heart", label: "Saúde", Icon: Heart },
  { value: "BookOpen", label: "Educação", Icon: BookOpen },
  { value: "Gamepad2", label: "Lazer", Icon: Gamepad2 },
  { value: "Shirt", label: "Vestuário", Icon: Shirt },
  { value: "RefreshCw", label: "Assinaturas", Icon: RefreshCw },
  { value: "CirclePlus", label: "Outros (entrada)", Icon: CirclePlus },
  { value: "CircleMinus", label: "Outros (saída)", Icon: CircleMinus },
]

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map(({ value, Icon }) => [value, Icon]),
)

export function resolveCategoryIcon(name: string | null): LucideIcon {
  return (name && ICON_MAP[name]) || Tag
}
