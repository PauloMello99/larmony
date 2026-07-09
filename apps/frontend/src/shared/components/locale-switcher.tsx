"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  applyLocale,
  normalizeLocale,
  type AppLocale,
} from "@/shared/lib/locale"
import { cn } from "@/shared/lib/utils"

interface LocaleSwitcherProps {
  /**
   * Persistência extra para contexto autenticado (ex.: `updateMe({ locale })`),
   * gravando o idioma em `users.locale`. Em páginas públicas/anônimas, omitir —
   * o cookie `NEXT_LOCALE` basta.
   */
  persist?: (locale: AppLocale) => Promise<void> | void
  className?: string
  /** Alinhamento do menu suspenso. */
  align?: "start" | "center" | "end"
}

function readLocaleCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1)
}

/**
 * Seletor de idioma compacto (Globe + dropdown), usável em qualquer contexto.
 * Rótulos vêm de `LOCALE_LABELS` (estático), então funciona mesmo em páginas que
 * não carregam o namespace `common`.
 *
 * O locale ativo é lido do cookie `NEXT_LOCALE`, não de `i18n.language`: este
 * componente aparece em páginas que ainda não chamam `makeI18nProps` (sem
 * `I18nextProvider` — o `useTranslation()` quebraria ali). A leitura roda em
 * `useEffect` (não no render) para casar com o HTML enviado pelo servidor e
 * evitar mismatch de hidratação — mesmo padrão do `next-themes` já usado em
 * `AppearanceSection`.
 *
 * O locale NÃO influencia a rota (sem prefixo `/en/`, `/es/`): a troca é
 * cookie + `window.location.reload()` no MESMO caminho. Um `router.replace`
 * (soft nav) não força um novo SSR em páginas sem `getServerSideProps` próprio
 * (ex.: a landing, hoje estática) — o reload garante que `_document` e
 * `makeI18nProps` releem o cookie em QUALQUER página, sem depender de cada uma
 * ter data-fetching.
 */
export function LocaleSwitcher({ persist, className, align = "end" }: LocaleSwitcherProps) {
  const [active, setActive] = React.useState<AppLocale>(DEFAULT_LOCALE)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setActive(normalizeLocale(readLocaleCookie()))
  }, [])

  async function change(value: string) {
    const locale = value as AppLocale
    if (locale === active || pending) return
    setPending(true)
    setActive(locale)
    await applyLocale(locale, persist)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        aria-label={LOCALE_LABELS[active]}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
          className,
        )}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{LOCALE_LABELS[active]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuRadioGroup value={active} onValueChange={change}>
          {SUPPORTED_LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {LOCALE_LABELS[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
