import * as React from "react"
import Link from "next/link"
import { makeI18nProps } from "@/shared/lib/i18n"
import { LegalLayout, LegalSection } from "@/features/landing/components/legal-layout"

/**
 * Termos de Uso (LGPD/consumidor). Versão sincronizada com
 * `apps/backend/src/modules/auth/terms-version.ts` (TERMS_VERSION) — ao
 * revisar este documento, atualizar a constante lá e a versão aqui.
 */
export default function TermosDeUsoPage() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="12 de julho de 2026" version="2026-07-12">
      <LegalSection title="1. Aceitação">
        <p>
          Estes Termos de Uso regulam o acesso e a utilização do <strong>Larmony</strong>
          {" "}(&quot;Serviço&quot;), plataforma de organização financeira doméstica operada por
          Larmony (&quot;nós&quot;). Ao criar uma conta, você declara que leu, entendeu e
          concorda com estes Termos e com a nossa{" "}
          <Link href="/legal/privacidade" className="text-primary hover:text-orange-300">
            Política de Privacidade
          </Link>
          . Se você não concorda, não utilize o Serviço.
        </p>
        <p className="text-white/45">
          Nota: o Larmony encontra-se em fase de formalização empresarial; a razão
          social e o CNPJ do controlador serão atualizados neste documento quando
          constituídos.
        </p>
      </LegalSection>

      <LegalSection title="2. O Serviço">
        <p>
          O Larmony permite que membros de um mesmo lar registrem e acompanhem, em
          conjunto, receitas, despesas, categorias, rateios, orçamentos, metas,
          lançamentos programados e relatórios. O Serviço é uma ferramenta de{" "}
          <strong>organização financeira</strong>: não constitui consultoria financeira,
          contábil, tributária ou de investimentos, e as informações exibidas dependem
          dos dados inseridos pelos próprios usuários.
        </p>
      </LegalSection>

      <LegalSection title="3. Conta e responsabilidades">
        <p>
          Para usar o Serviço você precisa criar uma conta com nome, e-mail e senha,
          sendo responsável pela veracidade dos dados e pela guarda das credenciais.
          Cada lar possui um responsável (owner) e membros convidados; ao convidar
          alguém, você declara ter autorização para compartilhar o e-mail do convidado.
          Membros de um lar visualizam os dados financeiros registrados naquele lar —
          convide apenas pessoas com quem você deseja compartilhar essas informações.
        </p>
        <p>
          Você deve ter 18 anos ou mais, ou utilizar o Serviço sob supervisão de um
          responsável legal.
        </p>
      </LegalSection>

      <LegalSection title="4. Planos, pagamento e cancelamento">
        <p>
          O Larmony oferece um plano gratuito, com funcionalidades essenciais, e o
          plano <strong>Premium</strong> (assinatura mensal de R$ 14,90), que libera
          recursos adicionais, como relatórios avançados. Os pagamentos são
          processados pela <strong>Stripe</strong> em ambiente próprio — não
          armazenamos dados de cartão.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            A assinatura renova automaticamente a cada período até ser cancelada.
          </li>
          <li>
            O cancelamento pode ser feito a qualquer momento pelo portal de
            gerenciamento da assinatura; o acesso Premium permanece até o fim do
            período já pago.
          </li>
          <li>
            Podemos conceder períodos de teste (trial), isenções ou descontos a
            critério da plataforma, com prazo e condições informados na concessão.
          </li>
          <li>
            <strong>Rebaixar ou cancelar o plano nunca apaga os dados do lar</strong> —
            apenas restringe funcionalidades pagas daí em diante.
          </li>
          <li>Preços podem ser reajustados com aviso prévio razoável.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Uso aceitável">
        <p>É vedado utilizar o Serviço para:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>atividades ilícitas ou que violem direitos de terceiros;</li>
          <li>
            tentar acessar dados de outros lares ou contas, burlar controles de
            acesso, sobrecarregar ou interferir na infraestrutura;
          </li>
          <li>engenharia reversa, revenda ou exploração comercial não autorizada.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Suspensão e encerramento">
        <p>
          Podemos suspender lares ou contas que violem estes Termos, mediante aviso
          quando possível. Você pode excluir sua conta a qualquer momento nas
          configurações (a exclusão exige antes transferir ou excluir lares dos quais
          você seja o responsável). Após a exclusão, dados pessoais são tratados
          conforme a Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="7. Propriedade intelectual">
        <p>
          O Larmony, sua marca, interface e código são de titularidade do operador do
          Serviço. Os dados financeiros inseridos pertencem aos usuários do lar; você
          nos concede licença de uso desses dados exclusivamente para operar o
          Serviço.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitação de responsabilidade">
        <p>
          O Serviço é fornecido &quot;como está&quot;. Empregamos esforços razoáveis de
          disponibilidade e segurança, mas não garantimos operação ininterrupta.
          Na máxima extensão permitida em lei, não respondemos por decisões
          financeiras tomadas com base nas informações organizadas no Serviço, nem
          por danos indiretos. Nada nestes Termos exclui direitos irrenunciáveis do
          consumidor previstos na legislação brasileira.
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações destes Termos">
        <p>
          Podemos atualizar estes Termos; mudanças relevantes serão comunicadas pelo
          Serviço ou por e-mail. A versão vigente e a data de atualização constam no
          topo desta página. O uso continuado após a vigência constitui concordância.
        </p>
      </LegalSection>

      <LegalSection title="10. Lei aplicável e foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Fica eleito o foro do domicílio do consumidor para dirimir controvérsias.
        </p>
      </LegalSection>

      <LegalSection title="11. Contato">
        <p>
          Dúvidas sobre estes Termos:{" "}
          <a href="mailto:suporte@larmony.me" className="text-primary hover:text-orange-300">
            suporte@larmony.me
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}

// A prosa legal fica hardcoded pt-BR; o namespace `landing` traduz o chrome do LegalLayout.
export const getServerSideProps = makeI18nProps(["common", "landing"])
