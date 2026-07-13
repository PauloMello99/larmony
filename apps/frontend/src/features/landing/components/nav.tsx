"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Menu, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { LocaleSwitcher } from "@/shared/components/locale-switcher"
import { LogoMark } from "@/shared/components/brand/logo-mark"
import { cn } from "@/shared/lib/utils"

const NAV_LINKS = [
  { labelKey: "nav.links.features", href: "#recursos" },
  { labelKey: "nav.links.product", href: "#tour" },
  { labelKey: "nav.links.pricing", href: "#precos" },
  { labelKey: "nav.links.faq", href: "#faq" },
]

export function Nav() {
  const { t } = useTranslation("landing")
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const closeMenu = () => setMobileOpen(false)

  return (
    <header className="fixed left-1/2 top-4 z-50 w-[min(1080px,calc(100%-2rem))] -translate-x-1/2">
      {/* Pílula flutuante */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-full border border-white/[0.07] bg-[rgba(20,20,24,0.72)] py-2.5 pl-5 pr-2.5 backdrop-blur-xl transition-shadow",
          scrolled && "shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]",
        )}
      >
        {/* Logo lockup */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white"
        >
          <LogoMark size={26} />
          <span>
            <span className="text-primary">lar</span>mony
          </span>
        </Link>

        {/* Center links — desktop only */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {t(link.labelKey)}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right: locale + CTA + hamburger */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher className="text-white/70 hover:text-white" />
          <Button
            size="sm"
            asChild
            className="hidden rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90 sm:flex"
          >
            <Link href="/auth/signup">{t("nav.cta")}</Link>
          </Button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — cai abaixo da pílula */}
      {mobileOpen && (
        <div className="mt-2 rounded-2xl border border-white/[0.07] bg-[rgba(20,20,24,0.92)] p-2 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-xl px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2 border-t border-white/5 p-2 pt-3">
            <Button
              variant="outline"
              asChild
              className="w-full rounded-full bg-transparent text-white/70"
              onClick={closeMenu}
            >
              <Link href="/auth/login">{t("nav.login")}</Link>
            </Button>
            <Button
              asChild
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={closeMenu}
            >
              <Link href="/auth/signup">{t("nav.cta")}</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
