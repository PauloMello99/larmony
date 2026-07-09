import { expect, test } from "@playwright/test"
import { suppressOnboardingTours } from "./helpers"

/**
 * M8 — Relatórios: vista mensal com totais renderizados, alternância para anual
 * e navegação de ano.
 */
const runId = Date.now()
const email = `e2e.reports.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await suppressOnboardingTours(page)
})

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Reports")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar Relatorios ${runId}`)
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

test("cria transações e visualiza relatórios mensal e anual", async ({ page }) => {
  await login(page)

  // Lança receita e despesa para popular os gráficos.
  await page.getByRole("navigation").last().getByRole("link", { name: "Transações", exact: true }).click()
  await page.waitForURL(/\/transactions$/)
  await page.getByRole("button", { name: "Nova transação" }).click()
  let dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Valor/).fill("50000")
  await dialog.getByLabel(/Descrição/).fill("Salário E2E")
  await dialog.getByRole("combobox", { name: "Tipo" }).click()
  await page.getByRole("option", { name: "Receita" }).click()
  await dialog.getByRole("button", { name: "Criar transação" }).click()
  await expect(page.getByText("Salário E2E").first()).toBeVisible()

  await page.getByRole("button", { name: "Nova transação" }).click()
  dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Valor/).fill("15000")
  await dialog.getByLabel(/Descrição/).fill("Mercado E2E")
  await dialog.getByRole("combobox", { name: "Categoria" }).click()
  await page.getByRole("option", { name: "Alimentação" }).click()
  await dialog.getByRole("button", { name: "Criar transação" }).click()
  await expect(page.getByText("Mercado E2E").first()).toBeVisible()

  // Vista mensal — o bar chart não expõe totais como texto estático (só no
  // tooltip, sob hover); confirmamos a seção renderizada e o breakdown por
  // categoria, que É texto estático.
  await page.getByRole("navigation").last().getByRole("link", { name: "Relatórios", exact: true }).click()
  await page.waitForURL(/\/reports$/)
  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible()
  await expect(page.getByText("Receita × Despesa · últimos 6 meses")).toBeVisible()
  await expect(page.getByText(/Despesas por categoria/)).toBeVisible()
  await expect(page.getByText("Alimentação").first()).toBeVisible({ timeout: 15_000 })

  // Alterna para anual — os totais aqui SÃO texto estático (StatCard).
  await page.getByRole("button", { name: "Anual" }).click()
  await expect(page.getByText("Receita total")).toBeVisible()
  await expect(page.getByText("Despesa total")).toBeVisible()
  await expect(page.getByText("Saldo")).toBeVisible()
  await expect(page.getByText("R$ 500,00").first()).toBeVisible({ timeout: 15_000 })

  const year = new Date().getFullYear().toString()
  await expect(page.getByText(year).first()).toBeVisible()

  // Navega para o ano anterior — sem dados, mas a navegação continua visível
  // (empty-state por ano não pode esconder os botões, senão o usuário fica preso).
  await page.getByRole("button", { name: "Ano anterior" }).click()
  await expect(page.getByText(String(Number(year) - 1), { exact: true })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText(/Sem movimentação em/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Próximo ano" })).toBeVisible()
})
