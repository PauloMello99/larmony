import { expect, test } from "@playwright/test"

/**
 * Onboarding (M1b): signup sem convite leva à lista de lares com
 * ?welcome=1, que auto-abre o Sheet de criar lar na primeira vez.
 */
const runId = Date.now()
const email = `e2e.onboarding.${runId}@e2e.larmony.local`
const password = "SenhaForteE2e123!"

test("signup sem convite abre o Sheet de criar lar automaticamente", async ({ page }) => {
  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Onboarding")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/households\?welcome=1/, { timeout: 20_000 })
  await expect(page.getByText("Bem-vindo(a) ao Larmony!")).toBeVisible()

  // Sheet de criar lar já aberto, sem precisar clicar em nada.
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Novo lar" })).toBeVisible()

  // Fechar o Sheet limpa o query param.
  await page.keyboard.press("Escape")
  await page.waitForURL(/\/households$/)
})
