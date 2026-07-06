/**
 * Integração por funcionalidade: sobe o AppModule real contra o Supabase LOCAL
 * (54321/54322) — exige `npx supabase start` + migrations aplicadas.
 * Serial (--runInBand no script): as suítes compartilham o banco.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  testTimeout: 30000,
  clearMocks: true,
};
