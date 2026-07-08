import { expect, test, request as pwRequest } from "@playwright/test"

/**
 * Fluxo de convite: arrange via API (owner + lar + convite → acceptUrl),
 * act/assert na UI (convidado abre o link, cria conta e vira member).
 */
const API = "http://localhost:3001"
const runId = Date.now()
const password = "SenhaForteE2e123!"

test("convidado aceita convite pelo link e vê o lar como member", async ({ browser }) => {
  // Arrange (API): owner + lar + convite.
  const api = await pwRequest.newContext({ baseURL: API })
  const ownerEmail = `e2e.conv.owner.${runId}@e2e.larmony.local`
  const signUp = await api.post("/auth/sign-up", {
    data: { name: "E2E Conv Owner", email: ownerEmail, password },
  })
  expect(signUp.ok()).toBeTruthy()
  const session = (await signUp.json()) as {
    session?: { accessToken: string }
    accessToken?: string
  }
  const token = session.session?.accessToken ?? session.accessToken ?? ""

  const created = await api.post("/households", {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `E2E Lar Convite ${runId}` },
  })
  expect(created.ok()).toBeTruthy()
  const household = (await created.json()) as { id: string }

  const inviteeEmail = `e2e.conv.guest.${runId}@e2e.larmony.local`
  const invited = await api.post(`/households/${household.id}/members/invite`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { email: inviteeEmail },
  })
  expect(invited.ok()).toBeTruthy()
  const { acceptUrl } = (await invited.json()) as { acceptUrl: string }
  expect(acceptUrl).toContain("/invite/accept?token=")

  // Act (UI, contexto novo = usuário anônimo): abre o link do convite.
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(acceptUrl)

  // Não autenticado → a própria página redireciona para signup preservando o
  // token (?invite=) e o e-mail do convite (accept-invitation-page.tsx).
  await page.waitForURL(/\/auth\/signup\?invite=/, { timeout: 15_000 })
  await page.fill("#name", "E2E Conv Guest")
  await page.fill("#email", inviteeEmail)
  await page.fill("#password", password)
  await page.fill("#confirmPassword", password)
  await page.click('button[type="submit"]')

  // De volta ao aceite (via ?invite=) → aceita.
  await page.waitForURL(/\/invite\/accept/, { timeout: 20_000 })
  await page.getByRole("button", { name: /aceitar/i }).click()

  // Assert: o lar aparece para o convidado.
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  await page.goto("/dashboard/households")
  await expect(page.getByText(`E2E Lar Convite ${runId}`)).toBeVisible()

  await context.close()
})
