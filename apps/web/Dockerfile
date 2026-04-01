# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy monorepo manifests first for better layer caching
# (these layers are only invalidated when dependencies change)
COPY package.json yarn.lock .yarnrc turbo.json ./
COPY apps/web/package.json       ./apps/web/package.json
COPY apps/backend/package.json   ./apps/backend/package.json
COPY apps/reminders/package.json ./apps/reminders/package.json

RUN yarn install --frozen-lockfile --ignore-engines

# Receive VITE_* build-time variables from Railway environment
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ARG VITE_BACKEND_URL=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_BACKEND_URL=$VITE_BACKEND_URL

# Copy source and build
COPY . .
RUN yarn build:web

# ---- Serve stage ----
FROM caddy:2-alpine
COPY --from=builder /app/apps/web/dist /srv
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
