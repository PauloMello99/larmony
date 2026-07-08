import { defineConfig, devices } from "@playwright/test"

/**
 * E2E de fluxo de uso (browser real) contra os dev servers locais.
 * Pré-requisito: Supabase local up + migrations. Os webServers são reusados
 * se já estiverem rodando (dev/preview) — no CI sobem do zero.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter backend dev",
      url: "http://localhost:3001/health",
      reuseExistingServer: !process.env.CI,
      cwd: "../../..",
      timeout: 120_000,
    },
    {
      command: "pnpm --filter frontend dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      cwd: "../../..",
      timeout: 120_000,
    },
  ],
})
