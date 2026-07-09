import { expect, test } from "@playwright/test"

/**
 * Seletor de idioma no Account: troca persiste no backend e recarrega a UI
 * no idioma escolhido (M1a).
 */
const runId = Date.now()
const email = `e2e.locale.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test.describe.configure({ mode: "serial" })

test("signup cria a conta", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Locale")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/, { timeout: 20_000 })
})

test("troca o idioma para inglês e persiste após reload", async ({ page }) => {
  await page.goto("/auth/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/households/)

  await page.goto("/account")
  await page.locator("#locale").scrollIntoViewIfNeeded()
  await page.locator("#locale").getByRole("combobox").click()
  await page.getByRole("option", { name: "English" }).click()

  await expect(page.locator("#locale").getByText("Language").first()).toBeVisible()

  await page.reload()
  await page.locator("#locale").scrollIntoViewIfNeeded()
  await expect(page.locator("#locale").getByText("Language").first()).toBeVisible()
  await expect(page.locator("#locale").getByText("English")).toBeVisible()

  // Volta para pt-BR para não vazar estado para outros specs. A UI está em
  // inglês aqui, então o rótulo da opção é localizado ("Portuguese (Brazil)",
  // de common.json en) — não o endônimo pt-BR.
  await page.locator("#locale").getByRole("combobox").click()
  await page.getByRole("option", { name: "Portuguese (Brazil)" }).click()
  await expect(page.locator("#locale").getByText("Idioma").first()).toBeVisible()
})
