import { renderNotification, type NotificationParams } from "./notification-messages";
import type { NotificationLocale } from "./notification-locale";

const LOCALES: NotificationLocale[] = [
  "pt-BR",
  "en-US",
  "es-ES",
  "zh-CN",
  "de-DE",
  "fr-FR",
  "ja-JP",
];

describe("renderNotification", () => {
  it("renderiza os tipos financeiros + import de extrato em todos os 7 locales sem lançar, com title/body não-vazios", () => {
    const samples: NotificationParams[] = [
      { type: "goal_reached", goalName: "Viagem", savedCents: 500000, targetCents: 500000 },
      { type: "budget_exceeded", categoryName: "Lazer", spentCents: 29033, limitCents: 25000 },
      { type: "auto_launch", description: "Aluguel", amountCents: 165000, date: "2026-07-11" },
      {
        type: "monthly_report",
        month: 7,
        year: 2026,
        incomeCents: 1513803,
        expenseCents: 481647,
        balanceCents: 1032156,
      },
      { type: "bill_reminder", description: "Aluguel", amountCents: 250000, daysUntil: 3, dueDay: 9 },
      { type: "statement_import_completed", total: 94, resolvedCount: 72, unresolvedCount: 22 },
      { type: "statement_import_failed", errorCode: "PARSE_ERROR" },
    ];

    for (const locale of LOCALES) {
      for (const params of samples) {
        const r = renderNotification(params, locale);
        expect(r.title.length).toBeGreaterThan(0);
        expect(r.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("locale inválido/ausente cai no fallback pt-BR", () => {
    const params: NotificationParams = {
      type: "goal_reached",
      goalName: "Viagem",
      savedCents: 500000,
      targetCents: 500000,
    };
    expect(renderNotification(params, "xx-XX").title).toContain("atingida");
    expect(renderNotification(params, null).title).toContain("atingida");
    expect(renderNotification(params, undefined).title).toContain("atingida");
  });

  it("normaliza tags legadas e por idioma-base (rows antigas de users.locale)", () => {
    const params: NotificationParams = {
      type: "goal_reached",
      goalName: "Viagem",
      savedCents: 500000,
      targetCents: 500000,
    };
    // Tags legadas pré-7-idiomas.
    expect(renderNotification(params, "en").title).toContain("reached");
    expect(renderNotification(params, "es").title).toContain("alcanzada");
    // Match por idioma-base (variante regional não listada).
    expect(renderNotification(params, "de-AT").title).toContain("erreicht");
    expect(renderNotification(params, "fr").title).toContain("atteint");
  });

  it("usa o idioma certo por locale (goal_reached)", () => {
    const params: NotificationParams = {
      type: "goal_reached",
      goalName: "Viagem",
      savedCents: 500000,
      targetCents: 500000,
    };
    expect(renderNotification(params, "pt-BR").title).toContain("atingida");
    expect(renderNotification(params, "en-US").title).toContain("reached");
    expect(renderNotification(params, "es-ES").title).toContain("alcanzada");
    expect(renderNotification(params, "zh-CN").title).toContain("达成");
    expect(renderNotification(params, "de-DE").title).toContain("erreicht");
    expect(renderNotification(params, "fr-FR").title).toContain("atteint");
    expect(renderNotification(params, "ja-JP").title).toContain("達成");
    // O nome da meta é interpolado igual em qualquer locale.
    for (const locale of LOCALES) {
      expect(renderNotification(params, locale).title).toContain("Viagem");
    }
  });

  it("formata moeda BRL (símbolo R$ mantido em todos os locales)", () => {
    const params: NotificationParams = {
      type: "budget_exceeded",
      categoryName: "Lazer",
      spentCents: 29033,
      limitCents: 25000,
    };
    for (const locale of LOCALES) {
      expect(renderNotification(params, locale).body).toContain("R$");
    }
  });

  it("bill_reminder resolve plural e 'vence hoje' por locale", () => {
    const base = { type: "bill_reminder" as const, description: "Aluguel", amountCents: 250000, dueDay: 9 };

    expect(renderNotification({ ...base, daysUntil: 0 }, "pt-BR").title).toContain("vence hoje");
    expect(renderNotification({ ...base, daysUntil: 1 }, "pt-BR").title).toContain("1 dia");
    expect(renderNotification({ ...base, daysUntil: 1 }, "pt-BR").title).not.toContain("1 dias");
    expect(renderNotification({ ...base, daysUntil: 3 }, "pt-BR").title).toContain("3 dias");

    expect(renderNotification({ ...base, daysUntil: 0 }, "en-US").title).toContain("due today");
    expect(renderNotification({ ...base, daysUntil: 1 }, "en-US").title).toContain("1 day");
    expect(renderNotification({ ...base, daysUntil: 1 }, "en-US").title).not.toContain("1 days");
    expect(renderNotification({ ...base, daysUntil: 3 }, "en-US").title).toContain("3 days");

    expect(renderNotification({ ...base, daysUntil: 0 }, "es-ES").title).toContain("vence hoy");
    expect(renderNotification({ ...base, daysUntil: 3 }, "es-ES").title).toContain("3 días");

    expect(renderNotification({ ...base, daysUntil: 0 }, "de-DE").title).toContain("heute fällig");
    expect(renderNotification({ ...base, daysUntil: 1 }, "de-DE").title).toContain("1 Tag fällig");
    expect(renderNotification({ ...base, daysUntil: 3 }, "de-DE").title).toContain("3 Tagen");

    // zh/ja não têm plural gramatical — só o dia interpolado.
    expect(renderNotification({ ...base, daysUntil: 0 }, "zh-CN").title).toContain("今天到期");
    expect(renderNotification({ ...base, daysUntil: 3 }, "zh-CN").title).toContain("3 天");
    expect(renderNotification({ ...base, daysUntil: 0 }, "ja-JP").title).toContain("本日");
    expect(renderNotification({ ...base, daysUntil: 3 }, "ja-JP").title).toContain("3日");
  });

  it("bill_reminder traz actionLabel localizado", () => {
    const base = {
      type: "bill_reminder" as const,
      description: "Aluguel",
      amountCents: 250000,
      daysUntil: 3,
      dueDay: 9,
    };
    expect(renderNotification(base, "pt-BR").actionLabel).toBe("Ver lançamentos");
    expect(renderNotification(base, "en-US").actionLabel).toBe("View entries");
    expect(renderNotification(base, "es-ES").actionLabel).toBe("Ver lanzamientos");
    expect(renderNotification(base, "ja-JP").actionLabel).toBe("記帳を見る");
  });

  it("monthly_report usa nome do mês localizado (não numérico)", () => {
    const params: NotificationParams = {
      type: "monthly_report",
      month: 7,
      year: 2026,
      incomeCents: 1513803,
      expenseCents: 481647,
      balanceCents: 1032156,
    };
    expect(renderNotification(params, "pt-BR").title).toContain("Julho");
    expect(renderNotification(params, "en-US").title).toContain("July");
    expect(renderNotification(params, "es-ES").title).toContain("Julio");
    expect(renderNotification(params, "de-DE").title).toContain("Juli");
    expect(renderNotification(params, "fr-FR").title).toContain("Juillet");
    // CJK: mês numérico com sufixo 月 (Intl month:"long" → "7月").
    expect(renderNotification(params, "zh-CN").title).toContain("月");
    expect(renderNotification(params, "ja-JP").title).toContain("月");
    // Ano presente, mês numérico "7/" ausente.
    expect(renderNotification(params, "pt-BR").title).toContain("2026");
    expect(renderNotification(params, "pt-BR").title).not.toContain("7/2026");
  });
});
