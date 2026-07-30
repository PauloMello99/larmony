import type { GetServerSideProps } from "next"
import { absoluteUrl } from "@/shared/lib/site-url"

const STATIC_ROUTES = ["/", "/legal/privacidade", "/legal/termos-de-uso", "/legal/cookies"]

function buildSitemap(): string {
  const urls = STATIC_ROUTES.map(
    (route) => `  <url>\n    <loc>${absoluteUrl(route)}</loc>\n  </url>`,
  ).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "application/xml")
  res.write(buildSitemap())
  res.end()
  return { props: {} }
}

// Página nunca renderiza (getServerSideProps já finalizou a response acima).
export default function SitemapXml(): null {
  return null
}
