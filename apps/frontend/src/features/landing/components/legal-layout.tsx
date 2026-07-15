import * as React from "react"
import Link from "next/link"
import Head from "next/head"
import { useTranslation } from "react-i18next"
import { LogoMark } from "@/shared/components/brand/logo-mark"

/**
 * Layout das páginas legais (Termos/Privacidade). A PROSA legal permanece
 * hardcoded em pt-BR (documento oficial); apenas o chrome do layout (voltar,
 * meta, rodapé) e o aviso de tradução usam o namespace `landing`.
 */
export function LegalLayout({
  title,
  updatedAt,
  version,
  children,
}: {
  title: string
  updatedAt: string
  version: string
  children: React.ReactNode
}) {
  const { t } = useTranslation("landing")

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white/80">
      <Head>
        <title>{`${title} · Larmony`}</title>
      </Head>

      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white"
          >
            <LogoMark size={22} />
            <span>
              <span className="text-primary">lar</span>mony
            </span>
          </Link>
          <Link href="/" className="text-sm text-white/50 hover:text-white">
            {t("legal.back")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-white/40">
          {t("legal.meta", { updatedAt, version })}
        </p>
        {/* A prosa legal é sempre pt-BR — o aviso, esse sim traduzido, deixa
            claro que traduções do chrome são apenas informativas. */}
        <p className="mt-2 text-sm text-white/40">{t("legal.officialNotice")}</p>

        <div className="legal-content mt-8 space-y-8 text-[15px] leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="border-t border-white/[0.07] py-8 text-center text-[12.5px] text-white/35">
        {t("legal.footer.copyright", { year: new Date().getFullYear() })} ·{" "}
        <Link href="/legal/termos-de-uso" className="hover:text-white">
          {t("legal.footer.terms")}
        </Link>{" "}
        ·{" "}
        <Link href="/legal/privacidade" className="hover:text-white">
          {t("legal.footer.privacy")}
        </Link>
      </footer>
    </div>
  )
}

/** Seção com título âncora (usada p/ links diretos ex.: /legal/privacidade#cookies). */
export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-white/65">{children}</div>
    </section>
  )
}
