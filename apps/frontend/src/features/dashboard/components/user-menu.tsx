"use client"

import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import {
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Languages,
  LifeBuoy,
  FileText,
} from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMe } from "@/features/auth/hooks/use-me"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  applyLocale,
  type AppLocale,
} from "@/shared/lib/locale"

export function UserMenu() {
  const { t } = useTranslation("dashboard")
  const { user, signOut } = useAuth()
  const { me, updateMe } = useMe()
  const router = useRouter()
  const isSuperAdmin = me?.platformRole === "super_admin"
  const activeLocale = me?.locale ?? DEFAULT_LOCALE

  const handleSignOut = async () => {
    await signOut()
    await router.replace("/auth/login")
  }

  // Troca de idioma autenticada: cookie + users.locale + reload (shared/lib/locale.ts).
  const handleLocaleChange = (value: string) => {
    const locale = value as AppLocale
    if (locale === activeLocale) return
    void applyLocale(locale, async (l) => {
      await updateMe({ locale: l })
    })
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-2 px-2 py-1.5 text-foreground/60 hover:text-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {initials}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-foreground/40">
          {user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void router.push("/account")}>
          <Settings className="h-4 w-4" />
          {t("userMenu.account")}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Languages className="h-4 w-4" />
            {t("userMenu.language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={activeLocale} onValueChange={handleLocaleChange}>
              {SUPPORTED_LOCALES.map((locale) => (
                <DropdownMenuRadioItem key={locale} value={locale}>
                  {LOCALE_LABELS[locale]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => void router.push("/support")}>
          <LifeBuoy className="h-4 w-4" />
          {t("userMenu.support")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open("/legal/termos-de-uso", "_blank", "noopener,noreferrer")}
        >
          <FileText className="h-4 w-4" />
          {t("userMenu.legal")}
        </DropdownMenuItem>
        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => void router.push("/admin")}>
            <ShieldCheck className="h-4 w-4" />
            {t("userMenu.platformPanel")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {t("userMenu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
