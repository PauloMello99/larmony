import { expect, test } from "@playwright/test"

/**
 * M5 — Budgets: criar orçamento, ver o spending derivado refletir uma despesa
 * lançada na categoria (com badge "Excedido"), editar o limite e excluir.
 */
const runId = Date.now()
const email = `e2e.budgets.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test("signup e cria um lar", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Budgets")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/dashboard\/households\?welcome=1/, { timeout: 20_000 })
  await page
    .locator('input:visible[type="text"], input:visible:not([type])')
    .first()
    .fill(`E2E Lar Orcamentos ${runId}`)
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

test("cria orçamento e o spending reflete uma despesa (excedido)", async ({ page }) => {
  await login(page)

  // Lança uma despesa de R$ 900 em Alimentação.
  await page.getByRole("navigation").last().getByRole("link", { name: "Transações", exact: true }).click()
  await page.waitForURL(/\/transactions$/)
  await page.getByRole("button", { name: "Nova transação" }).click()
  let dialog = page.getByRole("dialog")
  await dialog.getByLabel(/Valor/).fill("90000")
  await dialog.getByLabel(/Descrição/).fill("Compra grande")
  await dialog.getByRole("combobox", { name: "Categoria" }).click()
  await page.getByRole("option", { name: "Alimentação" }).click()
  await dialog.getByRole("button", { name: "Criar transação" }).click()
  await expect(page.getByText("Compra grande").first()).toBeVisible()

  // Cria um orçamento de R$ 800 para Alimentação → deve ficar "Excedido".
  await page.getByRole("navigation").last().getByRole("link", { name: "Orçamentos", exact: true }).click()
  await page.waitForURL(/\/budgets$/)
  await page.getByRole("button", { name: "Novo orçamento" }).click()
  dialog = page.getByRole("dialog")
  await dialog.getByRole("combobox", { name: "Categoria" }).click()
  await page.getByRole("option", { name: "Alimentação" }).click()
  await dialog.getByLabel(/Limite mensal/).fill("80000")
  await dialog.getByRole("button", { name: "Criar orçamento" }).click()

  await expect(page.getByRole("dialog")).toBeHidden()
  const card = page.locator("main")
  await expect(card.getByText("Alimentação")).toBeVisible()
  await expect(card.getByText("Excedido")).toBeVisible()
  await expect(card.getByText("R$ 900,00")).toBeVisible()
})

test("edita o limite (sai de excedido) e exclui", async ({ page }) => {
  await login(page)
  await page.getByRole("navigation").last().getByRole("link", { name: "Orçamentos", exact: true }).click()
  await page.waitForURL(/\/budgets$/)

  // Aumenta o limite para R$ 1.000 → some o badge "Excedido".
  await page.locator("main [aria-haspopup='menu']").first().click()
  await page.getByRole("menuitem", { name: "Editar" }).click()
  await page.getByRole("dialog").getByLabel(/Limite mensal/).fill("100000")
  await page.getByRole("dialog").getByRole("button", { name: "Salvar alterações" }).click()
  await expect(page.getByText("Excedido")).toHaveCount(0)
  await expect(page.getByText("de R$ 1.000,00")).toBeVisible()

  // Exclui.
  await page.locator("main [aria-haspopup='menu']").first().click()
  await page.getByRole("menuitem", { name: "Excluir" }).click()
  await page.getByRole("button", { name: "Excluir" }).last().click()
  await expect(page.getByText("Nenhum orçamento neste período.")).toBeVisible()
})
