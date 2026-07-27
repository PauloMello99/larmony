import * as React from "react"
import Link from "next/link"
import { makeI18nProps } from "@/shared/lib/i18n"
import { LegalLayout, LegalSection } from "@/features/landing/components/legal-layout"
import { CONTROLLER, LEGAL_UPDATED_AT, LEGAL_VERSION } from "@/shared/lib/legal-info"

/**
 * Política de Privacidade (LGPD art. 9º: finalidade, forma/duração, identidade
 * do controlador, canal do encarregado, compartilhamentos e direitos do
 * titular). Conteúdo espelha o inventário REAL de dados do produto — ao
 * adicionar coleta/terceiro novo, atualizar este documento + TERMS_VERSION.
 */
export default function PrivacidadePage() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      updatedAt={LEGAL_UPDATED_AT}
      version={LEGAL_VERSION}
    >
      <LegalSection title="1. Quem somos (controlador)">
        <p>
          Esta política descreve como o <strong>Larmony</strong> (&quot;nós&quot;),
          controlador dos dados, trata os dados pessoais de quem usa a plataforma de
          organização financeira doméstica, em conformidade com a Lei Geral de
          Proteção de Dados (Lei nº 13.709/2018 — LGPD). Canal do encarregado e de
          privacidade:{" "}
          <a href="mailto:suporte@larmony.me" className="text-primary hover:text-orange-300">
            suporte@larmony.me
          </a>
          .
        </p>
        <p className="text-white/45">
          O Larmony é operado por {CONTROLLER.legalName}, CNPJ {CONTROLLER.cnpj}, com
          sede em {CONTROLLER.address}.
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados coletamos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Conta</strong>: nome, e-mail e senha (a senha é gerida pelo
            provedor de autenticação e nunca armazenada em texto puro). Opcionais:
            telefone, foto/avatar, data de nascimento, gênero e idioma preferido.
          </li>
          <li>
            <strong>Dados do lar</strong>: transações (descrição, valor, data,
            categoria, quem realizou/registrou), rateios entre membros, orçamentos,
            metas e lançamentos programados — inseridos pelos próprios membros.
          </li>
          <li>
            <strong>Convites</strong>: e-mail da pessoa convidada para o lar.
          </li>
          <li>
            <strong>Assinatura</strong>: e-mail do responsável e identificadores de
            cobrança junto ao processador de pagamentos (não armazenamos número de
            cartão).
          </li>
          <li>
            <strong>Registros técnicos</strong>: logs de erro e auditoria de ações
            (com identificadores de usuário/lar), preferências de notificação e
            registro do aceite destes documentos (data e versão).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades e bases legais">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Prestar o Serviço</strong> (conta, lares compartilhados,
            transações, relatórios, cobrança da assinatura) — execução de contrato
            (art. 7º, V).
          </li>
          <li>
            <strong>Segurança, prevenção a fraudes e auditoria</strong> (logs de
            ações administrativas e de billing) — legítimo interesse e cumprimento
            de obrigação legal/regulatória (art. 7º, II e IX).
          </li>
          <li>
            <strong>Comunicações transacionais</strong> (convites, redefinição de
            senha, avisos da conta) — execução de contrato. Notificações opcionais
            (lembretes, relatórios mensais) são controláveis nas preferências e
            baseiam-se no seu consentimento, revogável a qualquer momento.
          </li>
          <li>
            <strong>Diagnóstico de erros</strong> (telemetria com identificadores
            técnicos) — legítimo interesse em manter o Serviço estável.
          </li>
        </ul>
        <p>Não vendemos dados pessoais nem os usamos para publicidade de terceiros.</p>
      </LegalSection>

      <LegalSection title="4. Compartilhamento e operadores">
        <p>
          Utilizamos operadores que tratam dados por nossa conta, sob contrato, e que
          podem estar localizados fora do Brasil (transferência internacional com
          salvaguardas adequadas, art. 33):
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Supabase</strong> — autenticação, banco de dados e armazenamento
            de arquivos (todos os dados da conta e dos lares).
          </li>
          <li>
            <strong>Stripe</strong> — processamento de pagamentos da assinatura
            (recebe e-mail do responsável e dados de cobrança; o cartão é tratado
            exclusivamente pela Stripe).
          </li>
          <li>
            <strong>Resend</strong> — envio de e-mails transacionais (recebe e-mail e
            nome do destinatário).
          </li>
          <li>
            <strong>Better Stack</strong> — monitoramento de erros (recebe
            identificadores técnicos de usuário/lar e detalhes do erro).
          </li>
          <li>
            <strong>Railway</strong> — hospedagem da aplicação.
          </li>
        </ul>
        <p>
          Fora esses operadores, só compartilhamos dados mediante obrigação legal ou
          ordem de autoridade competente.
        </p>
      </LegalSection>

      <LegalSection title="5. Retenção e exclusão">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Dados da conta e dos lares são mantidos enquanto a conta existir.</li>
          <li>
            Ao <strong>excluir a conta</strong> (Configurações → excluir conta), o
            perfil e a identidade de autenticação são removidos. Registros mínimos de
            auditoria (incluindo o e-mail associado ao evento de exclusão) são
            retidos por período limitado, com base em obrigação legal e legítimo
            interesse (defesa em processos e segurança).
          </li>
          <li>
            Dados de lares dos quais você era responsável devem ser transferidos ou
            excluídos antes da exclusão da conta.
          </li>
          <li>
            Cópias de segurança (backups) são mantidas por período limitado e
            expiram em ciclo regular.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Seus direitos (titular)">
        <p>
          Você pode exercer, a qualquer momento: confirmação de tratamento, acesso,
          correção (diretamente nas telas de conta), anonimização/bloqueio/eliminação
          de dados desnecessários, portabilidade, informação sobre compartilhamentos,
          revogação de consentimento e eliminação (exclusão de conta no próprio app).
          Canal:{" "}
          <a href="mailto:suporte@larmony.me" className="text-primary hover:text-orange-300">
            suporte@larmony.me
          </a>
          . Você também pode peticionar à ANPD (Autoridade Nacional de Proteção de
          Dados).
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="7. Cookies e armazenamento local">
        <p>
          Usamos apenas um cookie estritamente necessário (preferência de idioma) e a
          sessão de autenticação em localStorage — sem cookies de publicidade ou
          rastreadores de terceiros. Detalhes completos na{" "}
          <Link href="/legal/cookies" className="text-primary hover:text-orange-300">
            Política de Cookies
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="seguranca" title="8. Segurança">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Isolamento por lar no banco de dados (Row-Level Security): membros de um
            lar não acessam dados de outros lares.
          </li>
          <li>Tráfego criptografado (TLS) entre navegador, aplicação e banco.</li>
          <li>
            Senhas armazenadas com hash pelo provedor de autenticação; pagamentos
            processados em ambiente da Stripe (não armazenamos cartão — sem
            superfície PCI própria).
          </li>
          <li>Acesso administrativo restrito e auditado.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Crianças e adolescentes">
        <p>
          O Serviço não é direcionado a menores de 18 anos sem supervisão de um
          responsável legal.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações desta política">
        <p>
          Podemos atualizar esta política; mudanças relevantes serão comunicadas pelo
          Serviço ou por e-mail. A versão vigente e a data constam no topo. O
          histórico de aceite (data e versão) fica registrado na sua conta.
        </p>
      </LegalSection>

      <LegalSection title="11. Contato">
        <p>
          Encarregado/privacidade:{" "}
          <a href="mailto:suporte@larmony.me" className="text-primary hover:text-orange-300">
            suporte@larmony.me
          </a>
          . Veja também os{" "}
          <Link href="/legal/termos-de-uso" className="text-primary hover:text-orange-300">
            Termos de Uso
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}

// A prosa legal fica hardcoded pt-BR; o namespace `landing` traduz o chrome do LegalLayout.
export const getServerSideProps = makeI18nProps(["common", "landing"])
