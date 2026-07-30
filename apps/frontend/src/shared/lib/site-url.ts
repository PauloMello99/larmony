/** URL pública e canônica do site (sem trailing slash). Fallback ao localhost em dev. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
)

/** Monta uma URL absoluta a partir de um path (garante exatamente uma barra entre os dois). */
export function absoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}
