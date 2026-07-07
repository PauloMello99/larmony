---
name: project-overview
description: O que é o Larmony — visão geral do produto, origem (redesign do old-larmony sobre a carcaça ink-ops) e estado atual do monorepo
metadata:
  type: project
---

# Larmony — Visão Geral

## O que é

**Larmony** é uma aplicação web de **controle financeiro doméstico multi-usuário**.
Um *household* (lar) é a unidade de multi-tenancy: múltiplos membros compartilham
acesso às mesmas entidades financeiras (transações, categorias, orçamentos, metas,
contas a pagar), com isolamento por `household_id` via Row Level Security.

Domínio de produção: **larmony.me** (e-mail transacional via Resend já verificado,
from `Larmony <team@larmony.me>`).

**Why:** o old-larmony (v1) funcionava, mas com arquitetura frágil (lógica em
triggers, frontend falando direto com PostgREST). O redesenvolvimento porta o
domínio validado para uma arquitetura sustentável.

**How to apply:** o old-larmony fornece o *quê* (domínio, regras de negócio);
a arquitetura deste repo fornece o *como* (Clean Architecture, use-cases, RLS via
`app_user`, migrations Drizzle). Não voltar aos padrões antigos.

## Origem

- **old-larmony** (`C:\Users\Paulo\Documents\Repos\Pessoal\old-larmony`) — v1 do
  produto: React 19 + Vite + TanStack Router/Query, backend NestJS fino, lógica no
  Supabase (RLS + triggers + PostgREST), app `reminders` de cron diário. O
  `CLAUDE.md` de lá é a **fonte de verdade do domínio** (entidades, regras, features).
- Este repo nasceu como **cópia da carcaça do ink-ops** (monorepo Turborepo com
  NestJS Clean Architecture + Next.js + Drizzle + Supabase + Railway + Better Stack).
  O domínio de estúdio de tatuagem foi removido em 2026-07; a infra foi mantida.

## Estado atual do monorepo (2026-07-07)

- `apps/backend` — NestJS 11: `auth`, `user`, `households`, `categories`,
  `transactions`, `budgets`, `goals`, `bills`, **`reports` (M8)**, `admin`, `mail`,
  `notifications`, `audit`, `internal-cron` (tick + `send-bill-reminders`).
- `apps/frontend` — Next.js (pages router): features `auth`, `account`, `admin`,
  `dashboard`, `households`, `categories`, `transactions`, `budgets`, `goals`,
  `bills`, **`reports` (M8)**, `invitations`, `landing`.
- Milestones **M1–M8 entregues**; falta **M9 (Recorrência)** para fechar o v1.
- Deploy Railway staging: Frontend + Backend + Cron (online).
- RAG local: Qdrant + Ollama, coleção `larmony_memory`, servidor MCP `larmony-memory`.

## Premissas

- Uso pessoal/familiar — escala pequena, free tiers (Resend 3k e-mails/mês, 100/dia).
- i18n: `pt-BR` (padrão) e `en`, locale persistido no perfil do usuário.
- Dinheiro em **centavos inteiros** (convenção herdada da carcaça — ver ADR-0017).
- Households têm poucas pessoas (2–4): roles `owner`/`member` bastam; sem permissões
  por módulo no v1.

### Especificação feature a feature

`docs/product/features/` documenta o escopo de cada feature do roadmap (M1–M9),
destilado do old-larmony. Ver `docs/product/visao-e-dominio-v1.md` para a visão
consolidada do produto.
