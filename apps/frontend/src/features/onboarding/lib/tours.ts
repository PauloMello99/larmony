import type { TourDef } from "../types"

/**
 * Registro central dos tours de onboarding. Cada tour tem `key` (persistida em
 * `users.onboarding`) e `version` (bump = re-dispara para quem viu versão anterior).
 * As chaves i18n vivem no namespace `onboarding` (pt-BR + en).
 *
 * Passos `spotlight` referenciam o `data-tour` do elemento alvo; se o alvo não
 * existir (ex.: item de menu oculto para membros), o passo é pulado.
 */
export const TOURS = {
  // Orientação inicial do menu lateral — roda na 1ª entrada em qualquer página do lar.
  sidebar: {
    key: "sidebar",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "sidebar.welcome.title", bodyKey: "sidebar.welcome.body" },
      { kind: "spotlight", target: "nav-overview", placement: "right", titleKey: "sidebar.overview.title", bodyKey: "sidebar.overview.body" },
      { kind: "spotlight", target: "nav-transactions", placement: "right", titleKey: "sidebar.transactions.title", bodyKey: "sidebar.transactions.body" },
      { kind: "spotlight", target: "nav-categories", placement: "right", titleKey: "sidebar.categories.title", bodyKey: "sidebar.categories.body" },
      { kind: "spotlight", target: "nav-budgets", placement: "right", titleKey: "sidebar.budgets.title", bodyKey: "sidebar.budgets.body" },
      { kind: "spotlight", target: "nav-goals", placement: "right", titleKey: "sidebar.goals.title", bodyKey: "sidebar.goals.body" },
      { kind: "spotlight", target: "nav-scheduled", placement: "right", titleKey: "sidebar.scheduledTransactions.title", bodyKey: "sidebar.scheduledTransactions.body" },
      { kind: "spotlight", target: "nav-reports", placement: "right", titleKey: "sidebar.reports.title", bodyKey: "sidebar.reports.body" },
      { kind: "spotlight", target: "nav-settings", placement: "right", titleKey: "sidebar.settings.title", bodyKey: "sidebar.settings.body" },
    ],
  },

  overview: {
    key: "overview",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "overview.intro.title", bodyKey: "overview.intro.body" },
    ],
  },

  transactions: {
    key: "transactions",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "transactions.intro.title", bodyKey: "transactions.intro.body" },
      { kind: "spotlight", target: "tx-new-button", placement: "bottom", titleKey: "transactions.new.title", bodyKey: "transactions.new.body" },
    ],
  },

  // Tour do formulário — disparado ao abrir o Sheet "Nova transação" (não por rota).
  "transaction-form": {
    key: "transaction-form",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "transactionForm.intro.title", bodyKey: "transactionForm.intro.body" },
      { kind: "spotlight", target: "tx-field-category", placement: "left", titleKey: "transactionForm.category.title", bodyKey: "transactionForm.category.body" },
      { kind: "spotlight", target: "tx-field-person", placement: "left", titleKey: "transactionForm.person.title", bodyKey: "transactionForm.person.body" },
      { kind: "spotlight", target: "tx-field-installments", placement: "left", titleKey: "transactionForm.installments.title", bodyKey: "transactionForm.installments.body" },
      { kind: "spotlight", target: "tx-field-split", placement: "left", titleKey: "transactionForm.split.title", bodyKey: "transactionForm.split.body" },
    ],
  },

  categories: {
    key: "categories",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "categories.intro.title", bodyKey: "categories.intro.body" },
    ],
  },

  budgets: {
    key: "budgets",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "budgets.intro.title", bodyKey: "budgets.intro.body" },
    ],
  },

  goals: {
    key: "goals",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "goals.intro.title", bodyKey: "goals.intro.body" },
    ],
  },

  "scheduled-transactions": {
    key: "scheduled-transactions",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "scheduledTransactions.intro.title", bodyKey: "scheduledTransactions.intro.body" },
    ],
  },

  // Tour do formulário de lançamento — disparado ao abrir o Sheet "Novo
  // lançamento" (não por rota). Explica os 3 campos que definem o
  // comportamento do lançamento: modo de postagem, cadência e lembrete.
  "scheduled-transaction-form": {
    key: "scheduled-transaction-form",
    version: 1,
    steps: [
      { kind: "spotlight", target: "sched-field-auto", placement: "left", titleKey: "scheduledTransactionForm.postingMode.title", bodyKey: "scheduledTransactionForm.postingMode.body" },
      { kind: "spotlight", target: "sched-field-frequency", placement: "left", titleKey: "scheduledTransactionForm.frequency.title", bodyKey: "scheduledTransactionForm.frequency.body" },
      { kind: "spotlight", target: "sched-field-reminder", placement: "left", titleKey: "scheduledTransactionForm.reminder.title", bodyKey: "scheduledTransactionForm.reminder.body" },
    ],
  },

  reports: {
    key: "reports",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "reports.intro.title", bodyKey: "reports.intro.body" },
    ],
  },

  settings: {
    key: "settings",
    version: 1,
    steps: [
      { kind: "modal", titleKey: "settings.intro.title", bodyKey: "settings.intro.body" },
      { kind: "spotlight", target: "settings-members", placement: "bottom", titleKey: "settings.members.title", bodyKey: "settings.members.body" },
    ],
  },
} satisfies Record<string, TourDef>

export type TourKey = keyof typeof TOURS

export function getTour(key: TourKey): TourDef {
  return TOURS[key]
}
