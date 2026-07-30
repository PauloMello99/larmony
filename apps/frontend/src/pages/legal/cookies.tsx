import * as React from "react"
import { makeI18nProps } from "@/shared/lib/i18n"
import { LegalLayout, LegalSection } from "@/features/landing/components/legal-layout"
import { LEGAL_UPDATED_AT, LEGAL_VERSION } from "@/shared/lib/legal-info"
import { PageSeo } from "@/shared/components/seo/page-seo"

/**
 * Política de Cookies. Detalha o inventário REAL de cookies/armazenamento local
 * do produto — ao adicionar cookie/tracker novo, atualizar este documento.
 * Resumida em `privacidade.tsx` (seção "Cookies e armazenamento local"), que
 * linka para cá.
 */
export default function CookiesPage() {
  return (
    <>
      <PageSeo
        title="Política de Cookies · Larmony"
        description="Política de Cookies do Larmony: usamos apenas o cookie NEXT_LOCALE (idioma) e localStorage para a sessão de autenticação — nenhum cookie de publicidade, analytics ou rastreador de terceiros, por isso não exibimos banner de consentimento."
        path="/legal/cookies"
      />
      <LegalLayout title="Política de Cookies" updatedAt={LEGAL_UPDATED_AT} version={LEGAL_VERSION}>
        <LegalSection title="1. O que são cookies">
          <p>
            Cookies são pequenos arquivos armazenados pelo seu navegador. O Larmony usa
            apenas cookies <strong>estritamente necessários</strong> ao funcionamento do
            Serviço — nenhum cookie de publicidade, analytics de comportamento ou
            rastreador de terceiros.
          </p>
        </LegalSection>

        <LegalSection title="2. Cookies que usamos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>NEXT_LOCALE</strong> (cookie): guarda o idioma preferido da
              interface. Estritamente necessário/funcional, com validade de 1 ano.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Armazenamento local (não é cookie)">
          <p>
            A sessão de autenticação fica em <strong>localStorage</strong> do navegador,
            não em cookie. Ela mantém você conectado no dispositivo em que fez login e é
            removida automaticamente ao sair da conta.
          </p>
        </LegalSection>

        <LegalSection title="4. O que não usamos">
          <p>
            O Larmony não usa cookies de publicidade, pixels de rastreamento, analytics
            de comportamento de navegação nem compartilha identificadores com
            anunciantes ou redes de terceiros.
          </p>
        </LegalSection>

        <LegalSection title="5. Telemetria de erros">
          <p>
            Utilizamos o Better Stack para monitoramento e diagnóstico de erros da
            aplicação. Essa telemetria é operacional — registra falhas técnicas com
            identificadores de usuário/lar para permitir a correção de problemas — e não
            constitui rastreamento de navegação ou perfilamento comportamental.
          </p>
        </LegalSection>

        <LegalSection title="6. Por que não exibimos banner de consentimento">
          <p>
            Os cookies e o armazenamento local usados pelo Larmony são estritamente
            necessários/funcionais (preferência de idioma e sessão de autenticação), sem
            base legal que exija consentimento prévio (opt-in) para esse tipo de uso. Por
            isso, não exibimos um banner de cookies. Caso isso mude — por exemplo, com a
            introdução de um cookie ou rastreador não essencial — passaremos a exibir um
            banner de consentimento antes de ativá-lo.
          </p>
        </LegalSection>

        <LegalSection title="7. Como gerenciar ou limpar cookies">
          <p>
            Você pode visualizar, bloquear ou apagar cookies a qualquer momento pelas
            configurações do seu navegador. Bloquear o cookie <strong>NEXT_LOCALE</strong>
            {" "}não impede o uso do Serviço — apenas faz a interface voltar ao idioma
            padrão a cada visita.
          </p>
        </LegalSection>

        <LegalSection title="8. Contato">
          <p>
            Dúvidas sobre esta Política de Cookies:{" "}
            <a href="mailto:suporte@larmony.me" className="text-primary hover:text-orange-300">
              suporte@larmony.me
            </a>
            .
          </p>
        </LegalSection>
      </LegalLayout>
    </>
  )
}

// A prosa legal fica hardcoded pt-BR; o namespace `landing` traduz o chrome do LegalLayout.
export const getServerSideProps = makeI18nProps(["common", "landing"])
