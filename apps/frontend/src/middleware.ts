import { NextResponse, type NextRequest } from "next/server"
import { LOCALE_COOKIE, SUPPORTED_LOCALES } from "@/shared/lib/locale"

/**
 * Persistência de locale no SSR (ADR-0018).
 *
 * O Next.js só consulta o cookie `NEXT_LOCALE` para redirecionar a raiz (`/`) —
 * caminhos não-prefixados profundos (ex.: `/auth/login`, `/dashboard/...`) são
 * servidos no `defaultLocale`. Sem este middleware, um usuário `en` que recarrega
 * uma rota profunda recebe pt-BR no SSR (e só o `useLocaleSync` corrigiria, com
 * flash e sem cobrir páginas públicas).
 *
 * Aqui: se o cookie aponta um locale suportado diferente do locale ativo da URL,
 * redirecionamos para a variante prefixada correta — cobrindo TODAS as páginas.
 */
export function middleware(request: NextRequest): NextResponse | undefined {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value

  if (
    cookieLocale &&
    (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale) &&
    request.nextUrl.locale !== cookieLocale
  ) {
    const url = request.nextUrl.clone()
    url.locale = cookieLocale
    return NextResponse.redirect(url)
  }

  return undefined
}

export const config = {
  // Ignora assets, rotas internas do Next, arquivos com extensão e o endpoint de logs.
  matcher: ["/((?!_next|_betterstack|api|.*\\.).*)"],
}
