"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import { ArrowLeft } from "lucide-react"
import {
  AccessSection,
  DangerSection,
  LocaleSection,
  NotificationsSection,
  ProfileSection,
} from "./account-sections"

// Sem seção Aparência: o app é dark-only (Design System 2026-07-10).
// Sem sidebar/nav de âncoras: página única, rolável; cada section preenche a
// largura da coluna (sem max-w próprio), então todos os cards se alinham.
const SECTIONS = [
  { id: "profile", Section: ProfileSection },
  { id: "access", Section: AccessSection },
  { id: "locale", Section: LocaleSection },
  { id: "notifications", Section: NotificationsSection },
  { id: "danger", Section: DangerSection },
] as const

export function AccountPage() {
  const { t: tCommon } = useTranslation("common")
  const router = useRouter()

  // Item 7 — volta para onde estávamos; fallback p/ as lares.
  function handleBack() {
    if (window.history.length > 1) router.back()
    else void router.push("/households")
  }

  return (
    <div className="space-y-6">
      {/* Item 7 — botão voltar */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {tCommon("actions.back")}
      </button>

      <div className="mx-auto w-full max-w-4xl space-y-12">
        {SECTIONS.map(({ id, Section }) => (
          <section key={id} id={id}>
            <Section />
          </section>
        ))}
      </div>
    </div>
  )
}
