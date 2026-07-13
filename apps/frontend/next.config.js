import process from "node:process";
import { withBetterStack } from "@logtail/next";

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
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
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
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withBetterStack(nextConfig);
