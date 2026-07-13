# syntax=docker/dockerfile:1
# Multi-stage build do frontend Next.js num monorepo Turborepo + pnpm.
# turbo prune isola o subset do frontend; o build gera o output STANDALONE
# (next.config.js `output: "standalone"`, P-5) — o runner copia só
# .next/standalone (server + deps traçadas), .next/static e public/, SEM
# node_modules de produção (~2GB → centenas de MB).
#
# Build a partir da RAIZ do repo:
#   docker build -f apps/frontend/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.exemplo.com -t larmony-frontend .
#
# IMPORTANTE: NEXT_PUBLIC_API_URL é inlinado no bundle em BUILD TIME — precisa
# estar presente no build (no Railway, é passado como variável do serviço).

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
RUN apk add --no-cache libc6-compat

# ── 1. Prune ────────────────────────────────────────────────────────────
FROM base AS pruner
WORKDIR /app
COPY . .
RUN pnpm dlx turbo@^2 prune frontend --docker

# ── 2. Build (deps completas) ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
# NEXT_PUBLIC_* tem que existir no build (Next inlina no bundle)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm turbo run build --filter=frontend

# ── 3. Runner (standalone — sem node_modules de produção) ────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# O tracing do standalone preserva o layout do monorepo (outputFileTracingRoot
# = raiz): server.js fica em apps/frontend/ dentro do standalone. static/ e
# public/ NÃO entram no trace — copiados à parte, nos paths que o server espera.
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && chown -R nextjs:nodejs /app
USER nextjs
WORKDIR /app/apps/frontend
EXPOSE 3000
# Standalone binda 127.0.0.1 por default — Railway precisa de 0.0.0.0. PORT é
# injetado pelo Railway e respeitado pelo server.js.
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
