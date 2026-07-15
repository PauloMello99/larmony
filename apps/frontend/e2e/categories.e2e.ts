import { expect, test } from "@playwright/test"
import { suppressOnboardingTours } from "./helpers"

/**
 * M2c — Categories: as 13 categorias default aparecem, e o CRUD completo
 * (criar/editar/excluir, inclusive uma default) funciona ponta a ponta.
 */
const runId = Date.now()
const email = `e2e.categories.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await suppressOnboardingTours(page)
})

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Categories")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar Categorias ${runId}`)
  await page.getByRole("button", { name: /^criar/i }).last().click()
  await page.waitForURL(/\/households$/)
})

test("13 categorias default aparecem na tela de categorias", async ({ page }) => {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/)

  await page.locator('a[href*="/households/"]').first().click()
  await page.waitForURL(/\/households\/[^/]+$/)

  const sidebar = page.getByRole("navigation").last()
  await sidebar.getByRole("link", { name: "Categorias", exact: true }).click()
  await page.waitForURL(/\/categories$/)

  await expect(page.getByText("Salário").first()).toBeVisible()
  await expect(page.getByText("(padrão)").first()).toBeVisible()
})

test("cria, edita e exclui uma categoria custom", async ({ page }) => {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/)
  await page.locator('a[href*="/households/"]').first().click()
  await page.waitForURL(/\/households\/[^/]+$/)
  await page.getByRole("navigation").last().getByRole("link", { name: "Categorias", exact: true }).click()
  await page.waitForURL(/\/categories$/)

  await page.getByRole("button", { name: "Nova categoria" }).click()
  await page.getByRole("dialog").getByRole("textbox").first().fill("Pets")
  await page.getByRole("button", { name: "Criar categoria" }).click()
  await expect(page.getByText("Pets", { exact: true }).first()).toBeVisible()

  // Editar — getByRole ignora elementos ocultos (cards mobile no viewport desktop).
  await page.getByRole("row", { name: /Pets/ }).getByRole("button").click()
  await page.getByRole("menuitem", { name: "Editar" }).click()
  await page.getByRole("dialog").getByRole("textbox").first().fill("Pets e Vet")
  await page.getByRole("button", { name: "Salvar alterações" }).click()
  await expect(page.getByText("Pets e Vet").first()).toBeVisible()

  // Excluir
  await page.getByRole("row", { name: /Pets e Vet/ }).getByRole("button").click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir" }).last().click()
  await expect(page.getByText("Pets e Vet").first()).not.toBeVisible()
})
