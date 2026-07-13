import {
  normalizeAppLocale,
  type AppLocale,
} from "../../../common/i18n/app-locale";

/**
 * Catálogo i18n dos e-mails transacionais (ADR-0018: templates recebem o locale
 * do destinatário e resolvem strings daqui). Mesmo padrão do catálogo de
 * notificações (`notification-messages.ts`): TS puro, função-por-mensagem,
 * interpolação resolvida no builder. O locale vem de `users.locale`
 * (destinatário; no convite, do REMETENTE — o convidado ainda não tem conta).
 *
 * Nota: este catálogo também corrigiu a copy stale herdada do ink-ops
 * (estúdio/tatuagem) que vazava nos e-mails de welcome/convite.
 */
export interface MailMessages {
  layout: {
    /** BCP 47 do <Html lang>. */
    lang: string;
    footerAccount: string;
    footerHelp: string;
    footerPrivacy: string;
  };
  welcome: {
    subject: string;
    preview: string;
    heading(name: string): string;
    body: string;
    cta: string;
    footNote: string;
  };
  invite: {
    subject(householdName: string): string;
    preview(householdName: string): string;
    heading: string;
    /** Corpo em 2 segmentos ao redor do nome do lar (renderizado em <strong>). */
    bodyBefore: string;
    bodyAfter: string;
    cta: string;
    expires: string;
  };
  passwordReset: {
    subject: string;
    preview: string;
    heading: string;
    greeting(name?: string): string;
    body: string;
    cta: string;
    ignoreNote: string;
  };
  /** Compartilhado: "copie e cole este link". */
  copyLink: string;
  /** Chrome do e-mail genérico de notificação. */
  notification: {
    defaultActionLabel: string;
  };
}

const CATALOG: Record<AppLocale, MailMessages> = {
  "pt-BR": {
    layout: {
      lang: "pt-BR",
      footerAccount: "Você recebeu este e-mail porque possui uma conta no Larmony.",
      footerHelp: "Precisa de ajuda? Fale com a gente em",
      footerPrivacy: "Política de Privacidade",
    },
    welcome: {
      subject: "Bem-vindo ao Larmony",
      preview: "Bem-vindo ao Larmony",
      heading: (name) => `Bem-vindo, ${name}! 👋`,
      body: "Sua conta no Larmony está pronta. Agora vocês podem organizar as finanças do lar juntos — transações, rateio de despesas, orçamentos, metas e relatórios num só lugar.",
      cta: "Acessar o Larmony",
      footNote: "Qualquer dúvida, é só responder a este e-mail.",
    },
    invite: {
      subject: (hh) => `Convite para ${hh} no Larmony`,
      preview: (hh) => `Convite para ${hh} no Larmony`,
      heading: "Você foi convidado 🎉",
      bodyBefore: "Você foi convidado para participar de ",
      bodyAfter: " no Larmony. Clique no botão abaixo para aceitar o convite e entrar no lar.",
      cta: "Aceitar convite",
      expires: "O convite expira em 7 dias.",
    },
    passwordReset: {
      subject: "Redefinir sua senha do Larmony",
      preview: "Redefina sua senha do Larmony",
      heading: "Redefinir senha",
      greeting: (name) => (name ? `Olá, ${name}. ` : "Olá. "),
      body: "Recebemos um pedido para redefinir a senha da sua conta no Larmony. Clique no botão abaixo para escolher uma nova senha.",
      cta: "Redefinir senha",
      ignoreNote:
        "Se você não solicitou a redefinição, pode ignorar este e-mail com segurança — sua senha continua a mesma.",
    },
    copyLink: "Ou copie e cole este link no navegador:",
    notification: { defaultActionLabel: "Ver detalhes" },
  },
  "en-US": {
    layout: {
      lang: "en-US",
      footerAccount: "You received this email because you have a Larmony account.",
      footerHelp: "Need help? Reach us at",
      footerPrivacy: "Privacy Policy",
    },
    welcome: {
      subject: "Welcome to Larmony",
      preview: "Welcome to Larmony",
      heading: (name) => `Welcome, ${name}! 👋`,
      body: "Your Larmony account is ready. Now you can organize your household finances together — transactions, expense splitting, budgets, goals, and reports in one place.",
      cta: "Open Larmony",
      footNote: "Any questions? Just reply to this email.",
    },
    invite: {
      subject: (hh) => `Invitation to ${hh} on Larmony`,
      preview: (hh) => `Invitation to ${hh} on Larmony`,
      heading: "You've been invited 🎉",
      bodyBefore: "You've been invited to join ",
      bodyAfter: " on Larmony. Click the button below to accept the invitation and join the household.",
      cta: "Accept invitation",
      expires: "This invitation expires in 7 days.",
    },
    passwordReset: {
      subject: "Reset your Larmony password",
      preview: "Reset your Larmony password",
      heading: "Reset password",
      greeting: (name) => (name ? `Hi, ${name}. ` : "Hi. "),
      body: "We received a request to reset your Larmony account password. Click the button below to choose a new one.",
      cta: "Reset password",
      ignoreNote:
        "If you didn't request this reset, you can safely ignore this email — your password stays the same.",
    },
    copyLink: "Or copy and paste this link into your browser:",
    notification: { defaultActionLabel: "View details" },
  },
  "es-ES": {
    layout: {
      lang: "es-ES",
      footerAccount: "Recibiste este correo porque tienes una cuenta en Larmony.",
      footerHelp: "¿Necesitas ayuda? Escríbenos a",
      footerPrivacy: "Política de Privacidad",
    },
    welcome: {
      subject: "Bienvenido a Larmony",
      preview: "Bienvenido a Larmony",
      heading: (name) => `¡Bienvenido, ${name}! 👋`,
      body: "Tu cuenta de Larmony está lista. Ahora pueden organizar juntos las finanzas del hogar: transacciones, reparto de gastos, presupuestos, metas e informes en un solo lugar.",
      cta: "Abrir Larmony",
      footNote: "¿Alguna duda? Simplemente responde a este correo.",
    },
    invite: {
      subject: (hh) => `Invitación a ${hh} en Larmony`,
      preview: (hh) => `Invitación a ${hh} en Larmony`,
      heading: "Has sido invitado 🎉",
      bodyBefore: "Has sido invitado a unirte a ",
      bodyAfter: " en Larmony. Haz clic en el botón de abajo para aceptar la invitación y entrar en el hogar.",
      cta: "Aceptar invitación",
      expires: "La invitación caduca en 7 días.",
    },
    passwordReset: {
      subject: "Restablecer tu contraseña de Larmony",
      preview: "Restablece tu contraseña de Larmony",
      heading: "Restablecer contraseña",
      greeting: (name) => (name ? `Hola, ${name}. ` : "Hola. "),
      body: "Recibimos una solicitud para restablecer la contraseña de tu cuenta de Larmony. Haz clic en el botón de abajo para elegir una nueva.",
      cta: "Restablecer contraseña",
      ignoreNote:
        "Si no solicitaste el restablecimiento, puedes ignorar este correo con tranquilidad: tu contraseña sigue siendo la misma.",
    },
    copyLink: "O copia y pega este enlace en tu navegador:",
    notification: { defaultActionLabel: "Ver detalles" },
  },
  "zh-CN": {
    layout: {
      lang: "zh-CN",
      footerAccount: "您收到这封邮件是因为您拥有 Larmony 账户。",
      footerHelp: "需要帮助？请联系",
      footerPrivacy: "隐私政策",
    },
    welcome: {
      subject: "欢迎使用 Larmony",
      preview: "欢迎使用 Larmony",
      heading: (name) => `欢迎，${name}！👋`,
      body: "您的 Larmony 账户已就绪。现在你们可以一起管理家庭财务——交易、费用分摊、预算、目标和报告，尽在一处。",
      cta: "打开 Larmony",
      footNote: "如有任何疑问，直接回复此邮件即可。",
    },
    invite: {
      subject: (hh) => `Larmony 上「${hh}」的邀请`,
      preview: (hh) => `Larmony 上「${hh}」的邀请`,
      heading: "您收到了一份邀请 🎉",
      bodyBefore: "您被邀请加入 Larmony 上的 ",
      bodyAfter: "。点击下方按钮接受邀请并加入该家庭。",
      cta: "接受邀请",
      expires: "邀请将在 7 天后失效。",
    },
    passwordReset: {
      subject: "重置您的 Larmony 密码",
      preview: "重置您的 Larmony 密码",
      heading: "重置密码",
      greeting: (name) => (name ? `${name}，您好。` : "您好。"),
      body: "我们收到了重置您 Larmony 账户密码的请求。点击下方按钮设置新密码。",
      cta: "重置密码",
      ignoreNote: "如果您没有发起此请求，可以放心忽略这封邮件——您的密码保持不变。",
    },
    copyLink: "或将此链接复制粘贴到浏览器中：",
    notification: { defaultActionLabel: "查看详情" },
  },
  "de-DE": {
    layout: {
      lang: "de-DE",
      footerAccount: "Du erhältst diese E-Mail, weil du ein Larmony-Konto hast.",
      footerHelp: "Brauchst du Hilfe? Schreib uns an",
      footerPrivacy: "Datenschutzerklärung",
    },
    welcome: {
      subject: "Willkommen bei Larmony",
      preview: "Willkommen bei Larmony",
      heading: (name) => `Willkommen, ${name}! 👋`,
      body: "Dein Larmony-Konto ist bereit. Jetzt könnt ihr die Finanzen eures Haushalts gemeinsam organisieren — Buchungen, Kostenaufteilung, Budgets, Ziele und Berichte an einem Ort.",
      cta: "Larmony öffnen",
      footNote: "Fragen? Antworte einfach auf diese E-Mail.",
    },
    invite: {
      subject: (hh) => `Einladung zu ${hh} bei Larmony`,
      preview: (hh) => `Einladung zu ${hh} bei Larmony`,
      heading: "Du wurdest eingeladen 🎉",
      bodyBefore: "Du wurdest eingeladen, ",
      bodyAfter: " bei Larmony beizutreten. Klicke auf den Button unten, um die Einladung anzunehmen und dem Haushalt beizutreten.",
      cta: "Einladung annehmen",
      expires: "Die Einladung läuft in 7 Tagen ab.",
    },
    passwordReset: {
      subject: "Larmony-Passwort zurücksetzen",
      preview: "Setze dein Larmony-Passwort zurück",
      heading: "Passwort zurücksetzen",
      greeting: (name) => (name ? `Hallo, ${name}. ` : "Hallo. "),
      body: "Wir haben eine Anfrage zum Zurücksetzen des Passworts deines Larmony-Kontos erhalten. Klicke auf den Button unten, um ein neues Passwort zu wählen.",
      cta: "Passwort zurücksetzen",
      ignoreNote:
        "Wenn du das Zurücksetzen nicht angefordert hast, kannst du diese E-Mail einfach ignorieren — dein Passwort bleibt unverändert.",
    },
    copyLink: "Oder kopiere diesen Link in deinen Browser:",
    notification: { defaultActionLabel: "Details ansehen" },
  },
  "fr-FR": {
    layout: {
      lang: "fr-FR",
      footerAccount: "Vous recevez cet e-mail car vous possédez un compte Larmony.",
      footerHelp: "Besoin d'aide ? Écrivez-nous à",
      footerPrivacy: "Politique de confidentialité",
    },
    welcome: {
      subject: "Bienvenue sur Larmony",
      preview: "Bienvenue sur Larmony",
      heading: (name) => `Bienvenue, ${name} ! 👋`,
      body: "Votre compte Larmony est prêt. Vous pouvez désormais organiser ensemble les finances du foyer — transactions, partage des dépenses, budgets, objectifs et rapports au même endroit.",
      cta: "Ouvrir Larmony",
      footNote: "Une question ? Répondez simplement à cet e-mail.",
    },
    invite: {
      subject: (hh) => `Invitation à rejoindre ${hh} sur Larmony`,
      preview: (hh) => `Invitation à rejoindre ${hh} sur Larmony`,
      heading: "Vous êtes invité 🎉",
      bodyBefore: "Vous êtes invité à rejoindre ",
      bodyAfter: " sur Larmony. Cliquez sur le bouton ci-dessous pour accepter l'invitation et rejoindre le foyer.",
      cta: "Accepter l'invitation",
      expires: "L'invitation expire dans 7 jours.",
    },
    passwordReset: {
      subject: "Réinitialiser votre mot de passe Larmony",
      preview: "Réinitialisez votre mot de passe Larmony",
      heading: "Réinitialiser le mot de passe",
      greeting: (name) => (name ? `Bonjour, ${name}. ` : "Bonjour. "),
      body: "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Larmony. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.",
      cta: "Réinitialiser le mot de passe",
      ignoreNote:
        "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité — votre mot de passe reste inchangé.",
    },
    copyLink: "Ou copiez-collez ce lien dans votre navigateur :",
    notification: { defaultActionLabel: "Voir les détails" },
  },
  "ja-JP": {
    layout: {
      lang: "ja-JP",
      footerAccount: "このメールは、Larmony のアカウントをお持ちの方に送信されています。",
      footerHelp: "お困りですか？お問い合わせは",
      footerPrivacy: "プライバシーポリシー",
    },
    welcome: {
      subject: "Larmony へようこそ",
      preview: "Larmony へようこそ",
      heading: (name) => `ようこそ、${name} さん！👋`,
      body: "Larmony のアカウントの準備ができました。取引、費用の割り勘、予算、目標、レポート——家計の管理を、みんなで一か所で始めましょう。",
      cta: "Larmony を開く",
      footNote: "ご不明な点は、このメールにそのまま返信してください。",
    },
    invite: {
      subject: (hh) => `Larmony「${hh}」への招待`,
      preview: (hh) => `Larmony「${hh}」への招待`,
      heading: "招待が届きました 🎉",
      bodyBefore: "Larmony の ",
      bodyAfter: " に招待されました。下のボタンをクリックして招待を受け入れ、世帯に参加してください。",
      cta: "招待を受け入れる",
      expires: "この招待は 7 日後に無効になります。",
    },
    passwordReset: {
      subject: "Larmony のパスワードをリセット",
      preview: "Larmony のパスワードをリセットしましょう",
      heading: "パスワードのリセット",
      greeting: (name) => (name ? `${name} さん、こんにちは。` : "こんにちは。"),
      body: "Larmony アカウントのパスワードリセットのリクエストを受け付けました。下のボタンをクリックして新しいパスワードを設定してください。",
      cta: "パスワードをリセット",
      ignoreNote:
        "このリクエストに心当たりがない場合は、このメールを無視してかまいません。パスワードは変更されません。",
    },
    copyLink: "または、このリンクをブラウザーに貼り付けてください：",
    notification: { defaultActionLabel: "詳細を見る" },
  },
};

/** Mensagens de e-mail no idioma do destinatário (fallback pt-BR). */
export function mailMessages(locale: string | null | undefined): MailMessages {
  return CATALOG[normalizeAppLocale(locale)];
}
