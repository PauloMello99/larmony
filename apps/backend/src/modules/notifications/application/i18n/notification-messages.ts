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
  | { type: "bill_reminder"; description: string; amountCents: number; daysUntil: number; dueDay: number };

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
  },
  en: {
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
  },
  es: {
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
