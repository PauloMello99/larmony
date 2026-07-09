import { expect, test } from "@playwright/test"
import { suppressOnboardingTours } from "./helpers"

/**
 * M2d — Transactions: CRUD completo (criar despesa/receita, filtrar, editar,
 * excluir) e a promessa cross-milestone de que o overview (M3) para de
 * mostrar zero assim que a primeira transação é criada.
 */
const runId = Date.now()
const email = `e2e.transactions.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await suppressOnboardingTours(page)
})

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Transactions")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar Transacoes ${runId}`)
  await page.getByRole("button", { name: /^criar/i }).last().click()
  await page.waitForURL(/\/households$/)
})

async function goToTransactions(page: import("@playwright/test").Page) {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/)
  await page.locator('a[href*="/households/"]').first().click()
  await page.waitForURL(/\/households\/[^/]+$/)
  await page.getByRole("navigation").last().getByRole("link", { name: "Transações", exact: true }).click()
  await page.waitForURL(/\/transactions$/)
}

test("cria uma despesa e ela aparece na lista", async ({ page }) => {
  await goToTransactions(page)

  await page.getByRole("button", { name: "Nova transação" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Valor/).fill("5000")
  await dialog.getByLabel(/Descrição/).fill("Supermercado")
  await dialog.getByRole("button", { name: "Criar transação" }).click()

  await expect(page.getByText("Supermercado").first()).toBeVisible()
  await expect(page.getByText("-R$ 50,00").first()).toBeVisible()
})

test("cria uma receita e filtra por tipo", async ({ page }) => {
  await goToTransactions(page)

  await page.getByRole("button", { name: "Nova transação" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("combobox", { name: "Tipo" }).click()
  await page.getByRole("option", { name: "Receita" }).click()
  await dialog.getByLabel(/Valor/).fill("200000")
  await dialog.getByLabel(/Descrição/).fill("Salário mensal")
  await dialog.getByRole("button", { name: "Criar transação" }).click()

  await expect(page.getByText("Salário mensal").first()).toBeVisible()

  // Filtra só receitas — "Supermercado" (despesa) some da lista.
  await page.getByRole("combobox", { name: "Filtrar por tipo" }).click()
  await page.getByRole("option", { name: "Receita", exact: true }).click()
  await expect(page.getByText("Salário mensal").first()).toBeVisible()
  await expect(page.getByText("Supermercado")).toHaveCount(0)
})

test("edita e exclui uma transação", async ({ page }) => {
  await goToTransactions(page)

  await page.getByRole("row", { name: /Supermercado/ }).getByRole("button").click()
  await page.getByRole("menuitem", { name: "Editar" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Valor/).fill("1500")
  await dialog.getByRole("button", { name: "Salvar alterações" }).click()
  await expect(page.getByText("-R$ 15,00").first()).toBeVisible()

  await page.getByRole("row", { name: /Supermercado/ }).getByRole("button").click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir" }).last().click()
  await expect(page.getByText("Supermercado")).toHaveCount(0)
})

test("o overview do dashboard para de mostrar zero após criar transações", async ({ page }) => {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/)
  await page.locator('a[href*="/households/"]').first().click()
  await page.waitForURL(/\/households\/[^/]+$/)

  await expect(page.getByText("Salário mensal").first()).toBeVisible()
  // Receita lançada (R$ 2.000,00) aparece no card "Receitas do mês" — não mais zerado.
  await expect(page.getByText("R$ 2.000,00").first()).toBeVisible()
})
