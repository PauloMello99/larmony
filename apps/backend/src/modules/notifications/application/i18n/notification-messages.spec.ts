import { renderNotification, type NotificationParams } from "./notification-messages";
import type { NotificationLocale } from "./notification-locale";

const LOCALES: NotificationLocale[] = ["pt-BR", "en", "es"];

describe("renderNotification", () => {
  it("renderiza os 5 tipos em todos os locales sem lançar, com title/body não-vazios", () => {
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
    expect(renderNotification(params, "de-DE").title).toContain("atingida");
    expect(renderNotification(params, null).title).toContain("atingida");
    expect(renderNotification(params, undefined).title).toContain("atingida");
  });

  it("usa o idioma certo por locale (goal_reached)", () => {
    const params: NotificationParams = {
      type: "goal_reached",
      goalName: "Viagem",
      savedCents: 500000,
      targetCents: 500000,
    };
    expect(renderNotification(params, "pt-BR").title).toContain("atingida");
    expect(renderNotification(params, "en").title).toContain("reached");
    expect(renderNotification(params, "es").title).toContain("alcanzada");
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

    expect(renderNotification({ ...base, daysUntil: 0 }, "en").title).toContain("due today");
    expect(renderNotification({ ...base, daysUntil: 1 }, "en").title).toContain("1 day");
    expect(renderNotification({ ...base, daysUntil: 1 }, "en").title).not.toContain("1 days");
    expect(renderNotification({ ...base, daysUntil: 3 }, "en").title).toContain("3 days");

    expect(renderNotification({ ...base, daysUntil: 0 }, "es").title).toContain("vence hoy");
    expect(renderNotification({ ...base, daysUntil: 3 }, "es").title).toContain("3 días");
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
    expect(renderNotification(base, "en").actionLabel).toBe("View entries");
    expect(renderNotification(base, "es").actionLabel).toBe("Ver lanzamientos");
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
    expect(renderNotification(params, "en").title).toContain("July");
    expect(renderNotification(params, "es").title).toContain("Julio");
    // Ano presente, mês numérico "7/" ausente.
    expect(renderNotification(params, "pt-BR").title).toContain("2026");
    expect(renderNotification(params, "pt-BR").title).not.toContain("7/2026");
  });
});
