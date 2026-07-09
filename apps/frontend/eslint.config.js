import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Scripts Node.js standalone (ex.: scripts/check-i18n-keys.mjs) — não fazem
    // parte do bundle Next.js, rodam via `node`, então precisam do global `process`.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
];
