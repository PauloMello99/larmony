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
  await page.check("#termsAccepted")
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

test("criar um lar avulso (fora do onboarding) também leva ao gate de assinatura", async ({
  page,
}) => {
  const avulsoEmail = `e2e.onboarding.avulso.${runId}@e2e.larmony.local`

  await page.goto("/auth/signup")
  await page.fill("#name", "E2E Avulso")
  await page.fill("#email", avulsoEmail)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.check("#termsAccepted")
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/households\?welcome=1/, { timeout: 20_000 })

  // Primeiro lar (onboarding): cria e cai no gate de assinatura.
  await page.locator('input:visible[type="text"], input:visible:not([type])').first().fill("Primeiro Lar")
  await page.getByRole("button", { name: /^criar/i }).last().click()
  await page.waitForURL(/\/households\/.+\/settings\/subscription\?onboarding=1/, {
    timeout: 20_000,
  })

  // Segundo lar, criado avulsamente a partir da lista de lares.
  await page.goto("/households")
  await page.getByRole("button", { name: "Novo lar" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.locator('input:visible[type="text"], input:visible:not([type])').first().fill("Segundo Lar")
  await page.getByRole("button", { name: /^criar/i }).last().click()

  await page.waitForURL(/\/households\/.+\/settings\/subscription\?onboarding=1/, {
    timeout: 20_000,
  })
})
