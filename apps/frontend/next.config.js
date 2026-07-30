import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withBetterStack } from "@logtail/next";

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * i18n (ADR-0018): locale NÃO influencia a rota — sem prefixo `/en/`, `/es/`
 * etc. O roteamento nativo do Next.js (`i18n` neste config) fica desligado de
 * propósito; o locale ativo vem só do cookie `NEXT_LOCALE`, lido em
 * `shared/lib/i18n.ts` (`makeI18nProps`) e em `_document.tsx`. Ver
 * `next-i18next.config.js` para a lista de locales usada pelo next-i18next.
 */

const isDev = process.env.NODE_ENV !== "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * CSP (ADR-0027, defesa em profundidade p/ sessão em localStorage):
 * - `unsafe-inline` em script-src: runtime inline do Next (sem nonce no pages
 *   router); os 2 usos de dangerouslySetInnerHTML do app são CSS estático.
 * - `unsafe-eval` só em dev (turbopack/react-refresh usam eval).
 * - connect-src: API do backend + self (telemetria do Better Stack no browser
 *   sai por proxy same-origin `/_betterstack/*`) + ws em dev (HMR).
 * - img-src https:: avatares vêm do Supabase Storage (URL pública).
 */
const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval': o modelo 3D da landing (three.js/GLTF com decoder WASM)
  // faz WebAssembly.instantiate, bloqueado por CSP sem esta diretiva. É o
  // allowance CSP3 específico p/ WASM — não libera eval() de string como
  // 'unsafe-eval' (que só entra em dev p/ o react-refresh/turbopack).
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // blob: no connect/worker: o modelo 3D da landing (GLTF/three.js) carrega
  // texturas embutidas via blob URLs — sem isso a CSP quebra o render.
  `connect-src 'self' blob: ${apiUrl}${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Standalone (P-5): o build traça só os arquivos/deps realmente usados e
  // gera .next/standalone/server.js — a imagem Docker deixa de carregar o
  // node_modules de produção inteiro (~2GB → centenas de MB). Em monorepo
  // pnpm o tracing precisa da raiz do workspace.
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // Rotas autenticadas/admin: nunca devem aparecer no Google. robots.txt
        // já pede pra não crawlear, mas Disallow não impede indexação de uma
        // URL já conhecida por outro meio — o header cobre esse caso.
        source: "/(auth|households|account|admin|invite|support)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default withBetterStack(nextConfig);
