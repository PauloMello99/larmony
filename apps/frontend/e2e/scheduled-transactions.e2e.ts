import { expect, test } from "@playwright/test"
import { suppressOnboardingTours } from "./helpers"

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

test.beforeEach(async ({ page }) => {
  await suppressOnboardingTours(page)
})

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

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/)
  await page.locator('a[href*="/households/"]').first().click()
  await page.waitForURL(/\/households\/[^/]+$/)
}

async function goToScheduledTransactions(page: import("@playwright/test").Page) {
  await page
    .getByRole("navigation")
    .last()
    .getByRole("link", { name: "Lançamentos", exact: true })
    .click()
  await page.waitForURL(/\/scheduled-transactions$/)
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
  await expect(page.getByRole("dialog")).toBeHidden()

  const aluguelRow = page.getByRole("row").filter({ hasText: "Aluguel" })
  await expect(aluguelRow).toBeVisible()

  // Lança como transação (só disponível no modo manual).
  await aluguelRow.locator("[aria-haspopup='menu']").click()
  await page.getByRole("menuitem", { name: "Lançar como transação" }).click()

  // A entrada continua na lista (nunca é consumida).
  await expect(page.getByRole("row").filter({ hasText: "Aluguel" })).toBeVisible()

  // A transação aparece na tela de Transações.
  await page.getByRole("navigation").last().getByRole("link", { name: "Transações", exact: true }).click()
  await page.waitForURL(/\/transactions$/)
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
  await expect(page.getByRole("dialog")).toBeHidden()

  const salarioRow = page.getByRole("row").filter({ hasText: "Salário" })
  await expect(salarioRow).toBeVisible()

  // Sem lançamento manual disponível para uma entrada auto.
  await salarioRow.locator("[aria-haspopup='menu']").click()
  await expect(page.getByRole("menuitem", { name: "Lançar como transação" })).toHaveCount(0)
  await page.keyboard.press("Escape")
})

test("alterna ativa/inativa e exclui", async ({ page }) => {
  await login(page)
  await goToScheduledTransactions(page)

  const aluguelRow = page.getByRole("row").filter({ hasText: "Aluguel" })
  await expect(aluguelRow).toBeVisible()

  // Desativa via o Switch da linha; o toggle passa a "não marcado".
  await aluguelRow.locator("[role='switch']").click()
  await expect(aluguelRow.locator("[role='switch']")).toHaveAttribute("aria-checked", "false")

  // Exclui; a linha some e o outro lançamento (Salário) permanece.
  await aluguelRow.locator("[aria-haspopup='menu']").click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir" }).last().click()
  await expect(page.getByRole("row").filter({ hasText: "Aluguel" })).toHaveCount(0)
  await expect(page.getByRole("row").filter({ hasText: "Salário" })).toBeVisible()
})
