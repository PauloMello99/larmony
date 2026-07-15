import { expect, test } from "@playwright/test"
import { suppressOnboardingTours } from "./helpers"

/**
 * M4 — parcelamento + rateio no frontend: criar 3x (badges 1/3..3/3),
 * criar despesa rateada (badge Rateio), excluir a série inteira.
 */
const runId = Date.now()
const email = `e2e.m4.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await suppressOnboardingTours(page)
})

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E M4")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar M4 ${runId}`)
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

test("cria uma despesa parcelada 3x e vê os badges de parcela", async ({ page }) => {
  await goToTransactions(page)

  await page.getByRole("button", { name: "Nova transação" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByLabel(/Descrição/).fill("Notebook")
  await sheet.getByLabel(/Valor/).fill("300000")
  // Liga o parcelamento.
  await sheet.getByLabel("Parcelar").click()
  await sheet.locator('input[type="number"]').fill("3")
  await sheet.getByRole("button", { name: "Criar parcelas" }).click()

  // A lista filtra pelo mês corrente → aparece a 1ª parcela (badge 1/3); as
  // parcelas 2 e 3 caem nos meses seguintes.
  const tbody = page.locator("tbody")
  await expect(tbody.getByText("Notebook").first()).toBeVisible()
  await expect(tbody.getByText("1/3")).toBeVisible()
})

test("cria despesa com rateio (badge Rateio) e exclui a série de parcelas", async ({ page }) => {
  await goToTransactions(page)

  // Rateio: com 1 membro (o próprio dono) — valida o badge e o fluxo.
  await page.getByRole("button", { name: "Nova transação" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByLabel(/Descrição/).fill("Jantar")
  await sheet.getByLabel(/^Valor/).fill("5000")
  await sheet.getByLabel("Dividir entre membros").click()
  // Seleciona o primeiro membro da lista.
  await page.locator('[role="dialog"] ul button').first().click()
  await sheet.getByRole("button", { name: "Criar transação" }).click()
  await expect(page.locator("tbody").getByText("Rateio").first()).toBeVisible()

  // Exclui a série do Notebook (parcela → dialog com "série inteira").
  await page
    .locator("tr", { hasText: "Notebook" })
    .first()
    .locator('[aria-haspopup="menu"]')
    .click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir série inteira" }).click()
  await expect(page.getByText("Notebook")).toHaveCount(0)
})
