import type { NextPage } from "next"
import { makeI18nProps } from "@/shared/lib/i18n"
import { LandingPage } from "@/features/landing"
import { PageSeo } from "@/shared/components/seo/page-seo"

const DESCRIPTION =
  "Controle financeiro doméstico para quem divide as contas: transações, orçamentos, metas e lembretes de contas a pagar, compartilhados com quem mora com você. Centavos exatos, zero planilha."

const Home: NextPage = () => (
  <>
    <PageSeo
      title="Larmony — Finanças da casa, em harmonia"
      description={DESCRIPTION}
      path="/"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Larmony",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description: DESCRIPTION,
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: "9.90",
        },
      }}
    />
    <LandingPage />
  </>
)

export default Home

export const getServerSideProps = makeI18nProps(["common", "landing"])
