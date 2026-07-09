import { expect, test } from "@playwright/test"

/**
 * ADR-0020 — Lançamentos programados: unifica os antigos e2e de bills (M7) e
 * recurrences (M9). Cobre os dois modos de postagem (`postingMode`):
 * manual (lembrete + "Lançar como transação", entrada nunca é consumida) e
 * auto (sem lembrete/launch — o engine posta sozinho).
 */
const runId = Date.now()
const email = `e2e.scheduled.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Lancamentos")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar Lancamentos ${runId}`)
  await page.getByRole("button", { name: /^criar/i }).last().click()
  await page.waitForURL(/\/households$/)
})

/**
 * 1ª visita a uma aba dispara o tour guiado daquela aba (sidebar na entrada
 * do lar, depois um tour por aba conforme `route-tour.ts`) — modal bloqueia
 * cliques até fechado. Tours de 1 passo só mostram "Entendi" (sem "Pular" —
 * ver tour-modal-step.tsx `!isLast`). Fecha em loop até não sobrar nenhum
 * (bounded); chamar após TODA navegação para uma aba nova (1ª vez).
 */
async function dismissTours(page: import("@playwright/test").Page) {
  for (let i = 0; i < 5; i++) {
    const closeBtn = page.getByRole("button", { name: /^(Pular|Entendi)$/ })
    try {
      await closeBtn.first().click({ timeout: 3_000 })
    } catch {
      break // nenhum tour pendente — segue normalmente.
    }
  }
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/)
  await page.locator('a[href*="/households/"]').first().click()
  await page.waitForURL(/\/households\/[^/]+$/)
  await dismissTours(page)
}

async function goToScheduledTransactions(page: import("@playwright/test").Page) {
  await page
    .getByRole("navigation")
    .last()
    .getByRole("link", { name: "Lançamentos", exact: true })
    .click()
  await page.waitForURL(/\/scheduled-transactions$/)
  await dismissTours(page)
}

test("cria um lançamento manual e lança como transação — a entrada continua ativa", async ({
  page,
}) => {
  await login(page)
  await goToScheduledTransactions(page)

  await page.getByRole("button", { name: "Novo lançamento" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Descrição/).fill("Aluguel")
  await dialog.getByLabel(/Valor/).fill("250000")
  await dialog.getByRole("button", { name: "Criar lançamento" }).click()

  await expect(page.getByRole("heading", { name: "Ativos (1)", exact: true })).toBeVisible()
  await expect(page.getByText("Aluguel").first()).toBeVisible()

  // Lança como transação (só disponível no modo manual).
  await page.locator("main [aria-haspopup='menu']").first().click()
  await page.getByRole("menuitem", { name: "Lançar como transação" }).click()

  // A entrada continua em Ativos (nunca é consumida).
  await expect(page.getByRole("heading", { name: "Ativos (1)", exact: true })).toBeVisible()

  // A transação aparece na tela de Transações.
  await page.getByRole("navigation").last().getByRole("link", { name: "Transações", exact: true }).click()
  await page.waitForURL(/\/transactions$/)
  await dismissTours(page)
  await expect(page.getByText("Aluguel").first()).toBeVisible()
})

test("cria um lançamento automático — sem lembrete e sem ação de lançar", async ({ page }) => {
  await login(page)
  await goToScheduledTransactions(page)

  await page.getByRole("button", { name: "Novo lançamento" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Lançar automaticamente/).click()
  await dialog.getByLabel(/Tipo/).click()
  await page.getByRole("option", { name: "Receita" }).click()
  await dialog.getByLabel(/Descrição/).fill("Salário")
  await dialog.getByLabel(/Valor/).fill("500000")
  // No modo auto o campo de lembrete não é exibido.
  await expect(dialog.getByLabel(/Lembrete/)).toHaveCount(0)
  await dialog.getByRole("button", { name: "Criar lançamento" }).click()

  await expect(page.getByRole("heading", { name: "Ativos (2)", exact: true })).toBeVisible()
  await expect(page.getByText("Salário").first()).toBeVisible()

  // Sem lançamento manual disponível para uma entrada auto.
  const salarioRow = page.locator("main").getByText("Salário").locator("..").locator("..")
  await salarioRow.locator("[aria-haspopup='menu']").click()
  await expect(page.getByRole("menuitem", { name: "Lançar como transação" })).toHaveCount(0)
  await page.keyboard.press("Escape")
})

test("alterna ativa/inativa e exclui", async ({ page }) => {
  await login(page)
  await goToScheduledTransactions(page)

  await expect(page.getByRole("heading", { name: "Ativos (2)", exact: true })).toBeVisible()

  const aluguelRow = page.locator("main").getByText("Aluguel").locator("..").locator("..")
  await aluguelRow.locator("[role='switch']").click()
  await expect(page.getByRole("heading", { name: "Inativos (1)", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Ativos (1)", exact: true })).toBeVisible()

  await aluguelRow.locator("[aria-haspopup='menu']").click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir" }).last().click()
  await expect(page.getByRole("heading", { name: "Inativos (1)", exact: true })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Ativos (1)", exact: true })).toBeVisible()
})
