# larmony — Referência para Claude Code

## O que é

**Larmony** — controle financeiro doméstico multi-usuário (households/lares como
tenant, RLS). Monorepo Turborepo: `apps/backend` (NestJS 11, Clean Architecture),
`apps/frontend` (Next.js pages router, feature-based), `packages/` com libs
compartilhadas. Redesenvolvimento do `old-larmony` (mesma pasta pai — fonte de
verdade do domínio) sobre a carcaça arquitetural herdada do ink-ops.

Visão do produto: `docs/product/visao-e-dominio-v1.md` · roadmap: `.memory/roadmap.md`.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo 2 + pnpm workspaces |
| Linguagem | TypeScript 5 strict |
| Backend | NestJS 11 + Drizzle ORM (migrator custom) + Supabase (auth/RLS) |
| Frontend | Next.js (pages router) + React 19 + Radix UI + Tailwind CSS |
| Estado servidor | TanStack React Query (keys em `infrastructure/query/query-keys.ts`) |
| E-mail | Resend + React Email (módulo `mail`; from `Larmony <team@larmony.me>`) |
| Telemetria | Better Stack (front + back) |
| Deploy | Railway (staging: Frontend + Backend + Cron tick 5min) |
| Tipos DB | Supabase CLI → `@repo/types` |

## Packages disponíveis

- `@repo/eslint-config` — configs ESLint por runtime (next, react-internal, node, base)
- `@repo/typescript-config` — tsconfigs por runtime (nextjs, nestjs, react-library, base)
- `@repo/ui` — componentes React (shadcn pattern); importar raw `.tsx`, sem build
- `@repo/utils` — `cn()` para merge seguro de classes Tailwind
- `@repo/types` — tipos Supabase compartilhados (popular via `supabase gen types`)

## Comandos

```bash
pnpm dev           # dev de todos os packages/apps
pnpm build         # build com cache Turborepo
pnpm lint          # lint com cache
pnpm check-types   # type-check com cache
pnpm format        # prettier em todo o repo
pnpm db:generate   # drizzle-kit generate
pnpm db:migrate    # aplica migrations (ver ADR-0003)
```

Supabase local: `npx supabase start` (API 54321, DB 54322, Studio 54323).

## Convenções críticas

- **NUNCA npm/yarn** — sempre pnpm
- Instalar dep em package específico: `pnpm add <pkg> --filter @repo/<nome>`
- Instalar dev dep na raiz: `pnpm add -Dw <pkg>`
- Merging de classes Tailwind: sempre `cn()`, nunca template string
- Novas Turborepo tasks devem ser declaradas em `turbo.json`
- Dinheiro: **centavos inteiros** (`_cents`) em todo o stack (ADR-0017)
- Backend: um use-case por operação; use-cases nunca importam DRIZZLE direto
  (regras completas em `.memory/domain-rules.md`)
- Frontend: mobile-first; regras de UI obrigatórias em `.memory/domain-rules.md`
- **Estado transitório**: schema/migrations ainda são os herdados do ink-ops —
  serão squashados no M1 (fundação). Não criar migrations sobre o schema velho.

## Workflow de agentes

Tarefas de desenvolvimento seguem o protocolo da skill **`development-workflow`**
(`.claude/skills/development-workflow/SKILL.md`) com os subagentes de `.claude/agents/`
(coordinator, locator, planner, implementer, tester, reviewer, database-guardian):

- **Roteamento adaptativo** — menor fluxo suficiente: simples ⇒ só `implementer` +
  check-types/lint; intermediária ⇒ `locator → implementer → tester`; complexa ⇒
  `locator → planner → implementer → tester → reviewer` (+ `database-guardian` se o
  diff tocar schema/migrations/RLS).
- **Elevação por risco**: banco, RLS/tenancy, auth, billing/dinheiro, cron, contratos
  públicos ou integrações externas ⇒ tratar como complexa mesmo se pequena.
- **Handoffs em YAML curto**; nunca repassar histórico/logs/arquivos inteiros.
- **Proibido em qualquer fluxo**: push, deploy, migrations remotas, reset/clean
  destrutivos, commits sem solicitação. Só o `implementer` edita código.

Detalhes: `docs/ai/agentic-workflow.md` (fluxos e critérios) e
`docs/ai/development-style-profile.md` (regras de estilo do autor — MUST/SHOULD/MAY/MUST NOT).

## Memória semântica (RAG) — OBRIGATÓRIO

> **Recall primeiro (faça isto antes de ler código).** Para qualquer pergunta
> "onde/como funciona X", chame a MCP tool `memory_search("sua pergunta")` do servidor
> **`larmony-memory`** **antes** de varrer/ler o código-fonte — ela busca semanticamente
> o banco de memória (`.memory/`, `docs/`, READMEs dos packages, `CLAUDE.md`) e devolve
> os trechos relevantes. Só leia o código quando os trechos recuperados forem
> insuficientes. Use `memory_status()` para confirmar que o índice está populado.

**Criação (obrigatória quando relevante).** Quando um chat estabelecer algo durável —
uma decisão, convenção ou *gotcha* — registre-o no arquivo `.memory/` certo (ou um novo
ADR) **antes de encerrar**. Chats triviais estão isentos; o objetivo é capturar
conhecimento que vale recall depois, não transcrever tudo.

**Indexação (automática).** O índice é re-atualizado em background no início da
sessão (hook SessionStart) e imediatamente após qualquer escrita em `.memory/`
(hook PostToolUse). Stack: Qdrant (Docker, `:6333`, hybrid dense+BM25) + Ollama
(`:11434`, **bge-m3**), coleção `larmony_memory`, com parent-document retrieval e
código TypeScript indexado (opt-in via `include_code`/`app`/`module`/`layer`) —
ver ADR-0016. Setup inicial: `/rag-setup`.

Comandos manuais (raramente necessários — o hook cuida disso):
```powershell
docker compose -f docker-compose.rag.yml up -d          # subir Qdrant
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate   # reindex
```
Ou os slash commands `/memory-index` e `/memory-search`.

### Estrutura de `.memory/`

| Arquivo | Quando atualizar |
|---|---|
| `project-overview.md` | Mudança de escopo ou propósito |
| `architecture.md` | Nova app adicionada, decisão estrutural |
| `domain-rules.md` | Nova convenção de código ou regra de domínio |
| `roadmap.md` | Milestone concluído/replanejado |
| `recent-decisions.md` | Após criar novo ADR |
| `adr/NNNN-*.md` | Para cada decisão arquitetural relevante |
| `sessions/YYYY-MM-DD-*.md` | Resumo de sessão complexa |

ADRs em `.memory/adr/` são **versionados em git**. Notes de sessão não são.

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output .claude/CLAUDE.md|01-app:{04-glossary.mdx}|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-fetching-data.mdx,07-mutating-data.mdx,08-caching.mdx,09-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{ai-agents.mdx,analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching-without-cache-components.mdx,cdn-caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,deploying-to-platforms.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,how-revalidation-works.mdx,incremental-static-regeneration.mdx,instant-navigation.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,migrating-to-cache-components.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,ppr-platform-guide.mdx,prefetching.mdx,preserving-ui-state.mdx,preventing-flash-before-hydration.mdx,production-checklist.mdx,progressive-web-apps.mdx,public-static-pages.mdx,redirecting.mdx,rendering-philosophy.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,streaming.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx,view-transitions.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions/02-route-segment-config:{dynamicParams.mdx,instant.mdx,maxDuration.mdx,preferredRegion.mdx,runtime.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,catchError.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,deploymentId.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,turbopackIgnoreIssue.mdx,turbopackLocalPostcssConfig.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|01-app/03-api-reference/07-adapters:{01-configuration.mdx,02-creating-an-adapter.mdx,03-api-reference.mdx,04-testing-adapters.mdx,05-routing-with-next-routing.mdx,06-implementing-ppr-in-an-adapter.mdx,07-runtime-integration.mdx,08-invoking-entrypoints.mdx,09-output-types.mdx,10-routing-information.mdx,11-use-cases.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-params.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,deploymentId.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,logging.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|02-pages/04-api-reference/06-adapters:{01-configuration.mdx,02-creating-an-adapter.mdx,03-api-reference.mdx,04-testing-adapters.mdx,05-routing-with-next-routing.mdx,06-implementing-ppr-in-an-adapter.mdx,07-runtime-integration.mdx,08-invoking-entrypoints.mdx,09-output-types.mdx,10-routing-information.mdx,11-use-cases.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
