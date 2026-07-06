import { expect, test } from "@playwright/test"

/**
 * Fluxo principal de uso: signup → lista de lares → criar lar → overview →
 * navegação pelo sidebar (placeholders) → GuestGuard.
 */
const runId = Date.now()
const email = `e2e.fluxo.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test("signup cria a conta e leva à lista de lares", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Fluxo")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
})

test("cria um lar e entra direto no overview (bugfix do link sem /overview)", async ({ page }) => {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard\/households/)

  await page.getByRole("button", { name: /novo lar|criar lar/i }).first().click()
  await page.locator('input:visible[type="text"], input:visible:not([type])').first().fill(`E2E Lar ${runId}`)
  await page.getByRole("button", { name: /^criar/i }).last().click()

  // Link da lista vai direto ao lar (sem /overview) e o overview renderiza.
  const link = page.locator('a[href*="/dashboard/household/"]').first()
  await expect(link).toBeVisible()
  const href = await link.getAttribute("href")
  expect(href).not.toContain("/overview")
  await link.click()
  await page.waitForURL(/\/dashboard\/household\/[^/]+$/)
  await expect(page.locator("h1")).toContainText(/bom dia|boa tarde|boa noite/i)
})

test("sidebar tem a IA completa e os placeholders renderizam", async ({ page }) => {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard\/households/)
  await page.locator('a[href*="/dashboard/household/"]').first().click()
  await page.waitForURL(/\/dashboard\/household\/[^/]+$/)

  const sidebar = page.getByRole("navigation").last()
  for (const item of ["Transações", "Categorias", "Orçamentos", "Metas", "Contas", "Relatórios"]) {
    await expect(sidebar.getByRole("link", { name: item, exact: true })).toBeVisible()
  }

  // Transações já é real (M2) — não é mais placeholder.
  await sidebar.getByRole("link", { name: "Transações", exact: true }).click()
  await page.waitForURL(/\/transactions$/)
  await expect(page.getByRole("button", { name: "Nova transação" })).toBeVisible()

  // Metas (M6) ainda não foi entregue — continua placeholder.
  await sidebar.getByRole("link", { name: "Metas", exact: true }).click()
  await page.waitForURL(/\/goals$/)
  await expect(page.getByText(/em construção|chega no/i).first()).toBeVisible()
})

test("GuestGuard: logado, /auth/login redireciona ao dashboard", async ({ page }) => {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/)

  await page.goto("/auth/login")
  await page.waitForURL(/\/dashboard\/households/, { timeout: 15_000 })
})
