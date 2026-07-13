import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { LogoMark } from "@/shared/components/brand/logo-mark"

const FOOTER_SECTIONS = [
  {
    key: "product",
    links: [
      { key: "features", href: "#recursos" },
      { key: "pricing", href: "#precos" },
      { key: "changelog", href: "#" },
      { key: "roadmap", href: "#" },
    ],
  },
  {
    key: "company",
    links: [
      { key: "about", href: "#sobre" },
      { key: "blog", href: "#" },
      { key: "careers", href: "#" },
      { key: "press", href: "#" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "terms", href: "/legal/termos-de-uso" },
      { key: "privacy", href: "/legal/privacidade" },
      { key: "cookies", href: "/legal/privacidade#cookies" },
      { key: "security", href: "/legal/privacidade#seguranca" },
    ],
  },
]

export function Footer() {
  const { t } = useTranslation("landing")

  return (
    <footer className="border-t border-white/[0.07] bg-[#0d0d0f]">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white"
            >
              <LogoMark size={22} />
              <span>
                <span className="text-primary">lar</span>mony
              </span>
            </Link>
            <p className="mt-3.5 max-w-[260px] text-[13.5px] leading-relaxed text-white/35">
              {t("footer.description")}
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.key}>
              <p className="mb-4 text-[11.5px] font-medium uppercase tracking-[0.1em] text-white/35">
                {t(`footer.sections.${section.key}.title`)}
              </p>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/55 transition-colors hover:text-white"
                    >
                      {t(`footer.sections.${section.key}.links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/[0.07] pt-7 text-[12.5px] text-white/35">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  )
}
