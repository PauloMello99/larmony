import { expect, test } from "@playwright/test"

/**
 * M7 — Bills: cria conta com lembrete, lança como transação (a bill continua
 * existindo), alterna ativa/inativa e exclui.
 */
const runId = Date.now()
const email = `e2e.bills.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Bills")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/dashboard\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar Contas ${runId}`)
  await page.getByRole("button", { name: /^criar/i }).last().click()
  await page.waitForURL(/\/dashboard\/households$/)
})

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard\/households/)
  await page.locator('a[href*="/dashboard/household/"]').first().click()
  await page.waitForURL(/\/dashboard\/household\/[^/]+$/)
}

test("cria uma conta e lança como transação — a conta continua existindo", async ({ page }) => {
  await login(page)
  await page.getByRole("navigation").last().getByRole("link", { name: "Contas", exact: true }).click()
  await page.waitForURL(/\/bills$/)

  await page.getByRole("button", { name: "Nova conta" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Nome/).fill("Aluguel")
  await dialog.getByLabel(/Valor/).fill("250000")
  await dialog.getByRole("button", { name: "Criar conta" }).click()

  await expect(page.getByText("Ativas (1)")).toBeVisible()
  await expect(page.getByText("Aluguel").first()).toBeVisible()

  // Lança como transação.
  await page.locator("main [aria-haspopup='menu']").first().click()
  await page.getByRole("menuitem", { name: "Lançar como transação" }).click()

  // A conta continua em Ativas (não é consumida).
  await expect(page.getByText("Ativas (1)")).toBeVisible()

  // A transação aparece na tela de Transações.
  await page.getByRole("navigation").last().getByRole("link", { name: "Transações", exact: true }).click()
  await page.waitForURL(/\/transactions$/)
  await expect(page.getByText("Aluguel").first()).toBeVisible()
})

test("alterna ativa/inativa e exclui", async ({ page }) => {
  await login(page)
  await page.getByRole("navigation").last().getByRole("link", { name: "Contas", exact: true }).click()
  await page.waitForURL(/\/bills$/)

  await page.locator("main [role='switch']").first().click()
  await expect(page.getByText("Inativas (1)")).toBeVisible()
  await expect(page.getByText("Ativas (0)")).toBeVisible()

  await page.locator("main [aria-haspopup='menu']").first().click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir" }).last().click()
  await expect(page.getByText("Nenhuma conta cadastrada.")).toBeVisible()
})
