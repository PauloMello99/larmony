import { expect, test } from "@playwright/test"

/**
 * M9 — Recorrências: cria uma regra, vê na lista de ativas, pausa (vai para
 * inativas) e exclui.
 */
const runId = Date.now()
const email = `e2e.recurrences.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Recorrencias")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/dashboard\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar Recorrencias ${runId}`)
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

async function goToRecurrences(page: import("@playwright/test").Page) {
  await page
    .getByRole("navigation")
    .last()
    .getByRole("link", { name: "Recorrências", exact: true })
    .click()
  await page.waitForURL(/\/recurrences$/)
}

test("cria uma recorrência e vê na lista de ativas", async ({ page }) => {
  await login(page)
  await goToRecurrences(page)

  await page.getByRole("button", { name: "Nova recorrência" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Descrição/).fill("Salário")
  await dialog.getByLabel(/Valor/).fill("500000")
  await dialog.getByRole("button", { name: "Criar recorrência" }).click()

  await expect(page.getByText("Ativas (1)")).toBeVisible()
  await expect(page.getByText("Salário").first()).toBeVisible()
})

test("pausa (vai para inativas) e exclui", async ({ page }) => {
  await login(page)
  await goToRecurrences(page)

  await page.locator("main [role='switch']").first().click()
  await expect(page.getByText("Inativas (1)")).toBeVisible()
  await expect(page.getByText("Ativas (0)")).toBeVisible()

  await page.locator("main [aria-haspopup='menu']").first().click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir" }).last().click()
  await expect(page.getByText("Nenhuma recorrência cadastrada.")).toBeVisible()
})
