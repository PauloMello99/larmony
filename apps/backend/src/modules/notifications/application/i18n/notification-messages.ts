import {
  makeFormatters,
  normalizeLocale,
  type NotificationFormatters,
  type NotificationLocale,
} from "./notification-locale";

/**
 * Params estruturados por evento (união discriminada) — o que os use-cases
 * passam ao dispatcher em vez de strings prontas. `renderNotification` monta o
 * title/body/actionLabel no idioma do destinatário. Catálogo função-por-mensagem
 * (TS puro, sem dependência de i18n) — plural/condicional/formatação resolvidos
 * no próprio builder.
 */
export type NotificationParams =
  | { type: "goal_reached"; goalName: string; savedCents: number; targetCents: number }
  | { type: "budget_exceeded"; categoryName: string; spentCents: number; limitCents: number }
  | { type: "auto_launch"; description: string; amountCents: number; date: string }
  | {
      type: "monthly_report";
      month: number;
      year: number;
      incomeCents: number;
      expenseCents: number;
      balanceCents: number;
    }
  | { type: "bill_reminder"; description: string; amountCents: number; daysUntil: number; dueDay: number }
  | { type: "support_ticket_created"; ticketId: string; subject: string; authorName: string }
  | { type: "support_reply"; ticketId: string; subject: string }
  // Contagens, nunca percentual isolado (achado da investigação: cobertura de
  // categorização varia muito por mês/lar — ADR-0033 §Contexto).
  | { type: "statement_import_completed"; total: number; resolvedCount: number; unresolvedCount: number }
  | { type: "statement_import_failed"; errorCode: string };

export interface RenderedNotification {
  title: string;
  body: string;
  actionLabel?: string;
}

type Builders = {
  [K in NotificationParams["type"]]: (
    p: Extract<NotificationParams, { type: K }>,
    f: NotificationFormatters,
  ) => RenderedNotification;
};

const CATALOG: Record<NotificationLocale, Builders> = {
  "pt-BR": {
    goal_reached: (p, f) => ({
      title: `Meta "${p.goalName}" atingida! 🎉`,
      body: `Vocês guardaram ${f.brl(p.savedCents)} — a meta de ${f.brl(p.targetCents)} foi alcançada.`,
    }),
    budget_exceeded: (p, f) => ({
      title: `Orçamento de "${p.categoryName}" estourado`,
      body: `Gasto de ${f.brl(p.spentCents)} superou o limite de ${f.brl(p.limitCents)}.`,
    }),
    auto_launch: (p, f) => ({
      title: `Lançamento automático: ${p.description}`,
      body: `${f.brl(p.amountCents)} lançado automaticamente em ${f.date(p.date)}.`,
    }),
    monthly_report: (p, f) => ({
      title: `Relatório mensal — ${f.monthName(p.month)} de ${p.year}`,
      body: `Receitas: ${f.brl(p.incomeCents)}. Despesas: ${f.brl(p.expenseCents)}. Saldo: ${f.brl(p.balanceCents)}.`,
    }),
    bill_reminder: (p, f) => {
      const when =
        p.daysUntil === 0 ? "vence hoje" : `vence em ${p.daysUntil} dia${p.daysUntil > 1 ? "s" : ""}`;
      return {
        title: `Lançamento "${p.description}" ${when}`,
        body: `Valor: ${f.brl(p.amountCents)}. Vencimento no dia ${p.dueDay}.`,
        actionLabel: "Ver lançamentos",
      };
    },
    support_ticket_created: (p) => ({
      title: `Novo chamado de suporte: "${p.subject}"`,
      body: `${p.authorName} abriu um chamado de suporte.`,
      actionLabel: "Ver chamado",
    }),
    support_reply: (p) => ({
      title: `Resposta no seu chamado "${p.subject}"`,
      body: "O suporte respondeu o seu chamado.",
      actionLabel: "Ver resposta",
    }),
    statement_import_completed: (p) => ({
      title: "Import de extrato concluído",
      body: `${p.total} transações importadas — ${p.resolvedCount} já categorizadas, ${p.unresolvedCount} pra revisar.`,
      actionLabel: "Revisar import",
    }),
    statement_import_failed: (p) => ({
      title: "Falha no import de extrato",
      body: `Não foi possível processar o arquivo (${p.errorCode}). Tente reenviar.`,
      actionLabel: "Tentar novamente",
    }),
  },
  "en-US": {
    goal_reached: (p, f) => ({
      title: `Goal "${p.goalName}" reached! 🎉`,
      body: `You've saved ${f.brl(p.savedCents)} — the ${f.brl(p.targetCents)} goal was reached.`,
    }),
    budget_exceeded: (p, f) => ({
      title: `Budget for "${p.categoryName}" exceeded`,
      body: `Spending of ${f.brl(p.spentCents)} went over the ${f.brl(p.limitCents)} limit.`,
    }),
    auto_launch: (p, f) => ({
      title: `Automatic entry: ${p.description}`,
      body: `${f.brl(p.amountCents)} posted automatically on ${f.date(p.date)}.`,
    }),
    monthly_report: (p, f) => ({
      title: `Monthly report — ${f.monthName(p.month)} ${p.year}`,
      body: `Income: ${f.brl(p.incomeCents)}. Expenses: ${f.brl(p.expenseCents)}. Balance: ${f.brl(p.balanceCents)}.`,
    }),
    bill_reminder: (p, f) => {
      const when =
        p.daysUntil === 0 ? "is due today" : `is due in ${p.daysUntil} day${p.daysUntil > 1 ? "s" : ""}`;
      return {
        title: `Entry "${p.description}" ${when}`,
        body: `Amount: ${f.brl(p.amountCents)}. Due on day ${p.dueDay}.`,
        actionLabel: "View entries",
      };
    },
    support_ticket_created: (p) => ({
      title: `New support ticket: "${p.subject}"`,
      body: `${p.authorName} opened a support ticket.`,
      actionLabel: "View ticket",
    }),
    support_reply: (p) => ({
      title: `Reply on your ticket "${p.subject}"`,
      body: "Support has replied to your ticket.",
      actionLabel: "View reply",
    }),
    statement_import_completed: (p) => ({
      title: "Statement import completed",
      body: `${p.total} transactions imported — ${p.resolvedCount} already categorized, ${p.unresolvedCount} to review.`,
      actionLabel: "Review import",
    }),
    statement_import_failed: (p) => ({
      title: "Statement import failed",
      body: `Couldn't process the file (${p.errorCode}). Try uploading it again.`,
      actionLabel: "Try again",
    }),
  },
  "es-ES": {
    goal_reached: (p, f) => ({
      title: `¡Meta "${p.goalName}" alcanzada! 🎉`,
      body: `Guardaron ${f.brl(p.savedCents)} — la meta de ${f.brl(p.targetCents)} fue alcanzada.`,
    }),
    budget_exceeded: (p, f) => ({
      title: `Presupuesto de "${p.categoryName}" excedido`,
      body: `El gasto de ${f.brl(p.spentCents)} superó el límite de ${f.brl(p.limitCents)}.`,
    }),
    auto_launch: (p, f) => ({
      title: `Lanzamiento automático: ${p.description}`,
      body: `${f.brl(p.amountCents)} registrado automáticamente el ${f.date(p.date)}.`,
    }),
    monthly_report: (p, f) => ({
      title: `Informe mensual — ${f.monthName(p.month)} de ${p.year}`,
      body: `Ingresos: ${f.brl(p.incomeCents)}. Gastos: ${f.brl(p.expenseCents)}. Saldo: ${f.brl(p.balanceCents)}.`,
    }),
    bill_reminder: (p, f) => {
      const when =
        p.daysUntil === 0 ? "vence hoy" : `vence en ${p.daysUntil} día${p.daysUntil > 1 ? "s" : ""}`;
      return {
        title: `Lanzamiento "${p.description}" ${when}`,
        body: `Valor: ${f.brl(p.amountCents)}. Vencimiento el día ${p.dueDay}.`,
        actionLabel: "Ver lanzamientos",
      };
    },
    support_ticket_created: (p) => ({
      title: `Nuevo ticket de soporte: "${p.subject}"`,
      body: `${p.authorName} abrió un ticket de soporte.`,
      actionLabel: "Ver ticket",
    }),
    support_reply: (p) => ({
      title: `Respuesta en tu ticket "${p.subject}"`,
      body: "El soporte respondió tu ticket.",
      actionLabel: "Ver respuesta",
    }),
    statement_import_completed: (p) => ({
      title: "Importación de extracto completada",
      body: `${p.total} transacciones importadas — ${p.resolvedCount} ya categorizadas, ${p.unresolvedCount} por revisar.`,
      actionLabel: "Revisar importación",
    }),
    statement_import_failed: (p) => ({
      title: "Falló la importación del extracto",
      body: `No se pudo procesar el archivo (${p.errorCode}). Intenta reenviarlo.`,
      actionLabel: "Intentar de nuevo",
    }),
  },
  "zh-CN": {
    goal_reached: (p, f) => ({
      title: `目标"${p.goalName}"已达成！🎉`,
      body: `你们已存下 ${f.brl(p.savedCents)} — 达成了 ${f.brl(p.targetCents)} 的目标。`,
    }),
    budget_exceeded: (p, f) => ({
      title: `"${p.categoryName}"预算已超支`,
      body: `支出 ${f.brl(p.spentCents)} 超过了 ${f.brl(p.limitCents)} 的限额。`,
    }),
    auto_launch: (p, f) => ({
      title: `自动记账：${p.description}`,
      body: `${f.brl(p.amountCents)} 已于 ${f.date(p.date)} 自动入账。`,
    }),
    monthly_report: (p, f) => ({
      title: `月度报告 — ${p.year}年${f.monthName(p.month)}`,
      body: `收入：${f.brl(p.incomeCents)}。支出：${f.brl(p.expenseCents)}。结余：${f.brl(p.balanceCents)}。`,
    }),
    bill_reminder: (p, f) => {
      const when = p.daysUntil === 0 ? "今天到期" : `将在 ${p.daysUntil} 天后到期`;
      return {
        title: `账目"${p.description}"${when}`,
        body: `金额：${f.brl(p.amountCents)}。到期日：每月 ${p.dueDay} 日。`,
        actionLabel: "查看账目",
      };
    },
    support_ticket_created: (p) => ({
      title: `新支持工单："${p.subject}"`,
      body: `${p.authorName} 提交了一个支持工单。`,
      actionLabel: "查看工单",
    }),
    support_reply: (p) => ({
      title: `你的工单"${p.subject}"收到了回复`,
      body: "客服已回复你的工单。",
      actionLabel: "查看回复",
    }),
    statement_import_completed: (p) => ({
      title: "对账单导入完成",
      body: `已导入 ${p.total} 笔交易 — ${p.resolvedCount} 笔已分类，${p.unresolvedCount} 笔待审核。`,
      actionLabel: "查看导入结果",
    }),
    statement_import_failed: (p) => ({
      title: "对账单导入失败",
      body: `无法处理该文件（${p.errorCode}）。请重新上传。`,
      actionLabel: "重试",
    }),
  },
  "de-DE": {
    goal_reached: (p, f) => ({
      title: `Ziel "${p.goalName}" erreicht! 🎉`,
      body: `Ihr habt ${f.brl(p.savedCents)} gespart — das Ziel von ${f.brl(p.targetCents)} wurde erreicht.`,
    }),
    budget_exceeded: (p, f) => ({
      title: `Budget für "${p.categoryName}" überschritten`,
      body: `Ausgaben von ${f.brl(p.spentCents)} haben das Limit von ${f.brl(p.limitCents)} überschritten.`,
    }),
    auto_launch: (p, f) => ({
      title: `Automatische Buchung: ${p.description}`,
      body: `${f.brl(p.amountCents)} wurde am ${f.date(p.date)} automatisch gebucht.`,
    }),
    monthly_report: (p, f) => ({
      title: `Monatsbericht — ${f.monthName(p.month)} ${p.year}`,
      body: `Einnahmen: ${f.brl(p.incomeCents)}. Ausgaben: ${f.brl(p.expenseCents)}. Saldo: ${f.brl(p.balanceCents)}.`,
    }),
    bill_reminder: (p, f) => {
      const when =
        p.daysUntil === 0
          ? "ist heute fällig"
          : `ist in ${p.daysUntil} Tag${p.daysUntil > 1 ? "en" : ""} fällig`;
      return {
        title: `Buchung "${p.description}" ${when}`,
        body: `Betrag: ${f.brl(p.amountCents)}. Fällig am ${p.dueDay}.`,
        actionLabel: "Buchungen ansehen",
      };
    },
    support_ticket_created: (p) => ({
      title: `Neues Support-Ticket: "${p.subject}"`,
      body: `${p.authorName} hat ein Support-Ticket eröffnet.`,
      actionLabel: "Ticket ansehen",
    }),
    support_reply: (p) => ({
      title: `Antwort auf Ihr Ticket "${p.subject}"`,
      body: "Der Support hat auf Ihr Ticket geantwortet.",
      actionLabel: "Antwort ansehen",
    }),
    statement_import_completed: (p) => ({
      title: "Kontoauszug-Import abgeschlossen",
      body: `${p.total} Transaktionen importiert — ${p.resolvedCount} bereits kategorisiert, ${p.unresolvedCount} zu überprüfen.`,
      actionLabel: "Import überprüfen",
    }),
    statement_import_failed: (p) => ({
      title: "Kontoauszug-Import fehlgeschlagen",
      body: `Die Datei konnte nicht verarbeitet werden (${p.errorCode}). Bitte erneut hochladen.`,
      actionLabel: "Erneut versuchen",
    }),
  },
  "fr-FR": {
    goal_reached: (p, f) => ({
      title: `Objectif « ${p.goalName} » atteint ! 🎉`,
      body: `Vous avez économisé ${f.brl(p.savedCents)} — l'objectif de ${f.brl(p.targetCents)} a été atteint.`,
    }),
    budget_exceeded: (p, f) => ({
      title: `Budget « ${p.categoryName} » dépassé`,
      body: `Les dépenses de ${f.brl(p.spentCents)} ont dépassé la limite de ${f.brl(p.limitCents)}.`,
    }),
    auto_launch: (p, f) => ({
      title: `Écriture automatique : ${p.description}`,
      body: `${f.brl(p.amountCents)} enregistré automatiquement le ${f.date(p.date)}.`,
    }),
    monthly_report: (p, f) => ({
      title: `Rapport mensuel — ${f.monthName(p.month)} ${p.year}`,
      body: `Revenus : ${f.brl(p.incomeCents)}. Dépenses : ${f.brl(p.expenseCents)}. Solde : ${f.brl(p.balanceCents)}.`,
    }),
    bill_reminder: (p, f) => {
      const when =
        p.daysUntil === 0 ? "arrive à échéance aujourd'hui" : `arrive à échéance dans ${p.daysUntil} jour${p.daysUntil > 1 ? "s" : ""}`;
      return {
        title: `L'écriture « ${p.description} » ${when}`,
        body: `Montant : ${f.brl(p.amountCents)}. Échéance le ${p.dueDay}.`,
        actionLabel: "Voir les écritures",
      };
    },
    support_ticket_created: (p) => ({
      title: `Nouveau ticket de support : « ${p.subject} »`,
      body: `${p.authorName} a ouvert un ticket de support.`,
      actionLabel: "Voir le ticket",
    }),
    support_reply: (p) => ({
      title: `Réponse à votre ticket « ${p.subject} »`,
      body: "Le support a répondu à votre ticket.",
      actionLabel: "Voir la réponse",
    }),
    statement_import_completed: (p) => ({
      title: "Import de relevé terminé",
      body: `${p.total} transactions importées — ${p.resolvedCount} déjà catégorisées, ${p.unresolvedCount} à vérifier.`,
      actionLabel: "Vérifier l'import",
    }),
    statement_import_failed: (p) => ({
      title: "Échec de l'import du relevé",
      body: `Impossible de traiter le fichier (${p.errorCode}). Réessayez l'envoi.`,
      actionLabel: "Réessayer",
    }),
  },
  "ja-JP": {
    goal_reached: (p, f) => ({
      title: `目標「${p.goalName}」達成！🎉`,
      body: `${f.brl(p.savedCents)} を貯めて、${f.brl(p.targetCents)} の目標を達成しました。`,
    }),
    budget_exceeded: (p, f) => ({
      title: `「${p.categoryName}」の予算を超過しました`,
      body: `支出 ${f.brl(p.spentCents)} が上限 ${f.brl(p.limitCents)} を超えました。`,
    }),
    auto_launch: (p, f) => ({
      title: `自動記帳：${p.description}`,
      body: `${f.brl(p.amountCents)} が ${f.date(p.date)} に自動的に記帳されました。`,
    }),
    monthly_report: (p, f) => ({
      title: `月次レポート — ${p.year}年${f.monthName(p.month)}`,
      body: `収入：${f.brl(p.incomeCents)}。支出：${f.brl(p.expenseCents)}。残高：${f.brl(p.balanceCents)}。`,
    }),
    bill_reminder: (p, f) => {
      const when = p.daysUntil === 0 ? "本日が期日です" : `期日まであと${p.daysUntil}日です`;
      return {
        title: `「${p.description}」は${when}`,
        body: `金額：${f.brl(p.amountCents)}。毎月 ${p.dueDay} 日が期日。`,
        actionLabel: "記帳を見る",
      };
    },
    support_ticket_created: (p) => ({
      title: `新しいサポートチケット：「${p.subject}」`,
      body: `${p.authorName} さんがサポートチケットを開きました。`,
      actionLabel: "チケットを見る",
    }),
    support_reply: (p) => ({
      title: `チケット「${p.subject}」に返信がありました`,
      body: "サポートがあなたのチケットに返信しました。",
      actionLabel: "返信を見る",
    }),
    statement_import_completed: (p) => ({
      title: "明細のインポートが完了しました",
      body: `${p.total} 件の取引をインポート — ${p.resolvedCount} 件は分類済み、${p.unresolvedCount} 件は確認が必要です。`,
      actionLabel: "インポートを確認",
    }),
    statement_import_failed: (p) => ({
      title: "明細のインポートに失敗しました",
      body: `ファイルを処理できませんでした（${p.errorCode}）。再度アップロードしてください。`,
      actionLabel: "再試行",
    }),
  },
};

/** Renderiza a notificação no idioma do destinatário (fallback pt-BR). */
export function renderNotification(
  params: NotificationParams,
  locale: string | null | undefined,
): RenderedNotification {
  const loc = normalizeLocale(locale);
  const formatters = makeFormatters(loc);
  // Cast necessário: o TS não correlaciona params.type com o builder específico
  // no acesso indexado, mas cada builder do CATALOG é checado na definição acima.
  const builder = CATALOG[loc][params.type] as (
    p: NotificationParams,
    f: NotificationFormatters,
  ) => RenderedNotification;
  return builder(params, formatters);
}
