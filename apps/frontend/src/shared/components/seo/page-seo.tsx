import Head from "next/head"
import { absoluteUrl } from "@/shared/lib/site-url"

interface PageSeoProps {
  title: string
  description: string
  /** Path relativo (ex. "/legal/privacidade"). Vira canonical + og:url absolutos. */
  path: string
  /** JSON-LD opcional (ex. schema.org Organization) — vai como <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown>
}

/** Meta tags de SEO (title, description, canonical, Open Graph, Twitter Card) para páginas públicas indexáveis. */
export function PageSeo({ title, description, path, jsonLd }: PageSeoProps) {
  const url = absoluteUrl(path)
  const ogImage = absoluteUrl("/api/og")

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Larmony" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </Head>
  )
}
