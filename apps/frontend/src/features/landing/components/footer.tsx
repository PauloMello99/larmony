import * as React from "react"
import Link from "next/link"
import { LogoMark } from "@/shared/components/brand/logo-mark"

const FOOTER_LINKS = {
  Produto: [
    { label: "Recursos", href: "#recursos" },
    { label: "Preços", href: "#precos" },
    { label: "Changelog", href: "#" },
    { label: "Roadmap", href: "#" },
  ],
  Empresa: [
    { label: "Sobre", href: "#sobre" },
    { label: "Blog", href: "#" },
    { label: "Carreiras", href: "#" },
    { label: "Imprensa", href: "#" },
  ],
  Legal: [
    { label: "Termos de uso", href: "/legal/termos-de-uso" },
    { label: "Privacidade", href: "/legal/privacidade" },
    { label: "Cookies", href: "/legal/privacidade#cookies" },
    { label: "Segurança", href: "/legal/privacidade#seguranca" },
  ],
}

export function Footer() {
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
              Controle financeiro do seu lar. Transações, orçamentos e metas em um
              só lugar.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="mb-4 text-[11.5px] font-medium uppercase tracking-[0.1em] text-white/35">
                {section}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/55 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/[0.07] pt-7 text-[12.5px] text-white/35">
          © {new Date().getFullYear()} Larmony. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
