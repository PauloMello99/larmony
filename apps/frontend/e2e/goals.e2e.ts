import { expect, test } from "@playwright/test"
import { suppressOnboardingTours } from "./helpers"

/**
 * M6 — Metas: cria meta, aporta via dialog (progresso derivado), cruza o alvo
 * (badge Concluída), exclui aporte pelo histórico (progresso recua) e exclui a
 * meta; overview reflete o total guardado.
 */
const runId = Date.now()
const email = `e2e.goals.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await suppressOnboardingTours(page)
})

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Goals")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar Metas ${runId}`)
  await page.getByRole("button", { name: /^criar/i }).last().click()
  await page.waitForURL(/\/households$/)
})

async function goToGoals(page: import("@playwright/test").Page) {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/)
  await page.locator('a[href*="/households/"]').first().click()
  await page.waitForURL(/\/households\/[^/]+$/)
  await page.getByRole("navigation").last().getByRole("link", { name: "Metas", exact: true }).click()
  await page.waitForURL(/\/goals$/)
}

test("cria meta, aporta até concluir e o overview reflete", async ({ page }) => {
  await goToGoals(page)

  // Cria a meta (R$ 1.000,00).
  await page.getByRole("button", { name: "Nova meta" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByLabel(/Nome/).fill("Reserva")
  await sheet.getByLabel(/Valor alvo/).fill("100000")
  await sheet.getByRole("button", { name: "Criar meta" }).click()

  await expect(page.getByText("Reserva")).toBeVisible()
  await expect(page.getByText("R$ 0,00").first()).toBeVisible()

  // Aporta R$ 400,00 — progresso 40%.
  await page.getByRole("button", { name: "Aportar" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Valor/).fill("40000")
  await dialog.getByRole("button", { name: "Aportar" }).click()
  await expect(dialog.getByText("R$ 400,00 de R$ 1.000,00 guardados.")).toBeVisible()

  // Aporta R$ 700,00 — cruza o alvo.
  await dialog.getByLabel(/Valor/).fill("70000")
  await dialog.getByRole("button", { name: "Aportar" }).click()
  await expect(dialog.getByText("R$ 1.100,00 de R$ 1.000,00 guardados.")).toBeVisible()
  await page.keyboard.press("Escape")

  await expect(page.getByText("Concluída")).toBeVisible()

  // Overview reflete o total guardado.
  await page.getByRole("navigation").last().getByRole("link", { name: "Visão geral", exact: true }).click()
  await page.waitForURL(/\/households\/[^/]+$/)
  await expect(page.getByText("R$ 1.100,00").first()).toBeVisible()
  await expect(page.getByText("Reserva")).toBeVisible()
})

test("exclui aporte pelo histórico (progresso recua) e exclui a meta", async ({ page }) => {
  await goToGoals(page)

  // Abre o histórico e remove o aporte de R$ 700,00.
  await page.getByRole("button", { name: "Aportar" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Histórico")).toBeVisible()
  const row = dialog.locator("li", { hasText: "R$ 700,00" })
  await row.getByRole("button", { name: "Excluir aporte" }).click()
  await expect(dialog.getByText("R$ 400,00 de R$ 1.000,00 guardados.")).toBeVisible()
  await page.keyboard.press("Escape")

  await expect(page.getByText("Concluída")).not.toBeVisible()

  // Exclui a meta.
  await page.locator("main [aria-haspopup='menu']").first().click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir" }).last().click()
  await expect(page.getByText("Nenhuma meta ainda.")).toBeVisible()
})
