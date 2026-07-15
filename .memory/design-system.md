---
name: design-system
description: Design System do Larmony — fundamentos visuais, componentes, voz de conteúdo e receita de superfícies glass. Fonte de verdade visual do produto; ver domain-rules.md para as regras de código correspondentes
metadata:
  type: project
---

# Larmony — Design System

## Origem

Gerado no **Claude Design** (claude.ai/design) a partir do código real do app
(lido diretamente do repo: `shared/components/ui/*`, `globals.css`,
`features/landing/*`, `features/dashboard/*`, `domain-rules.md`,
`visao-e-dominio-v1.md`) — não é um sistema inventado do zero, é a
codificação do que já existia + as decisões tomadas nas duas sessões de
2026-07-10 (`sessions/2026-07-10-design-system-logo-landing.md` e
`2026-07-10-design-system-app-wide.md`).

O handoff (bundle HTML/CSS/JS exportado do Claude Design) foi recebido em
`design-system/` na raiz do repo, consumido integralmente por este documento
e pela implementação, e **removido** depois — este arquivo é a fonte de
verdade que sobrevive. Se precisar do bundle bruto de novo, regenere-o no
Claude Design a partir do prompt em `.memory/sessions/`
(`Company name and blurb` + notas registradas na conversa) ou releia os ADRs
abaixo.

## Fundamentos visuais

### Cor

- **Primária: teal.** `--primary: oklch(0.704 0.14 182.503)` (teal-500) — único
  valor real hoje, já que o app é **dark-only** (ver ADR-0021). O par claro
  histórico era `oklch(0.6 0.118 184.704)` (teal-600), preservado só no bloco
  `.dark` duplicado do `globals.css` por segurança de compatibilidade futura.
- **Semântica financeira fixa** — nunca reatribuída a outro significado:
  - `--success` (emerald) = receita
  - `--destructive` (red) = despesa
  - `--warning` (amber) = conta a vencer
- **Paleta de categorias — separada da paleta de UI.** 13 cores hex fixas,
  seedadas por household na criação (uma por categoria default), editáveis
  pelo usuário depois via color input nativo. Nunca confundir com os tokens
  semânticos acima:

  | Categoria | Hex |
  |---|---|
  | Salário | `#22c55e` |
  | Freelance | `#16a34a` |
  | Investimentos | `#15803d` |
  | Outros (entrada) | `#4ade80` |
  | Alimentação | `#ef4444` |
  | Moradia | `#dc2626` |
  | Transporte | `#f97316` |
  | Saúde | `#ec4899` |
  | Educação | `#8b5cf6` |
  | Lazer | `#06b6d4` |
  | Vestuário | `#f59e0b` |
  | Assinaturas | `#6366f1` |
  | Outros (saída) | `#64748b` |

- **Charts multi-hue**: teal → emerald → amber → violet → sky
  (`--chart-1`…`--chart-5`).
- **Neutros**: `--background`/`--card`/`--popover` levemente distintos (fundo
  neutro com tinta sutil de teal, não preto puro); bordas sempre como alpha
  wash sobre `--foreground` (`oklch(1 0 0 / 10%)`), nunca um cinza fixo.
- Fonte completa dos valores: `apps/frontend/src/styles/globals.css`.

### Tipografia

- **Sora** (`next/font/google`, pesos 400/500/600/700/800) — **global desde
  2026-07-10** (nasceu só na landing, foi estendida ao app inteiro; ver
  divergências abaixo). Único ponto de definição: `shared/lib/fonts.ts`.
- Sem fonte mono de marca — `--font-mono` é o stack system padrão, usado só
  em contextos técnicos incidentais (nunca era um requisito de produto).
- **Type scale** (tokens `--text-*`, valores Tailwind reais observados no
  código, não uma escala nova):
  `text-xs` 12px (labels de tabela/badges) · `text-sm` 14px (corpo/inputs/botões)
  · `text-base` 16px · `text-lg` 18px · `text-xl` 20px (títulos mobile) ·
  `text-2xl` 24px (títulos sm+) · `text-3xl` 30px (headers de seção mobile) ·
  `text-4xl` 36px · `text-5xl` 48px (headers de seção sm+) · `text-7xl` 72px
  (hero da landing, md+).
- Casing: **sentence case em todo lugar** (botões, headers, nav) — nunca
  Title Case nem ALL CAPS, exceto labels estruturais minúsculos (cabeçalho de
  coluna de tabela, eyebrow de seção): `text-xs uppercase tracking-wider`
  em ~10–11px.

### Espaçamento, raio e tamanhos de controle

- **Um único `--radius: 0.45rem`** (levemente abaixo do padrão shadcn 0.5rem)
  — todo raio no produto deriva dele via `sm`/`md`/`lg`/`xl`/`full`. Nunca um
  raio bespoke por componente.
- Escala de espaçamento é a do Tailwind (4/8/12/16/24/32px) — padding de
  página é `p-4` mobile, `sm:p-6` (regra 3 de `domain-rules.md`).
- Alturas de controle (botão/input/select): `sm` 36px · `default` 40px ·
  `lg` 44px.

### Elevação e sombras

Deliberadamente restrita — este é um app financeiro calmo, não chamativo:
- Cards: só `shadow-sm`.
- Popovers/selects/dropdowns: saltam para `shadow-lg`/`shadow-xl`.
- Dialogs/sheets/tooltips: `shadow-2xl`/`shadow-xl`.
- **Nada no meio, nenhuma sombra colorida/glow** dentro do app — os blobs
  desfocados coloridos são exclusividade da landing (ver seção Landing).

### Motion

- Radix `animate-in`/`animate-out` (fade + zoom, 150–300ms) em
  popovers/dialogs/selects; `transition-colors` em hover. Sem bounce, sem
  spring, sem motion decorativo.
- Landing: hooks próprios `use-reveal` (IntersectionObserver + classes
  `.lp-reveal`/`.in`) e `use-count-up` (contadores animados) —
  **sem framer-motion**, ambos guardados por `usePrefersReducedMotion` e por
  fallback `<noscript>` (nunca deixam conteúdo em `opacity:0` preso).
- Casa 3D do hero: rotação contínua via `useFrame` do React Three Fiber,
  também respeitando `usePrefersReducedMotion` (regra 25 de
  `domain-rules.md`).

### Iconografia

- **Lucide exclusivamente** (`lucide-react`), stroke 1.5–2px, `h-4 w-4` (16px)
  na maioria da UI, `h-5 w-5` (20px) em chips de empty state.
- 13 ícones curados para as categorias default (Banknote, Briefcase,
  TrendingUp, UtensilsCrossed, Home, Car, Heart, BookOpen, Gamepad2, Shirt,
  RefreshCw, CirclePlus, CircleMinus) + `Tag` como fallback — renderizados em
  círculo colorido com a cor da própria categoria
  (`background: color + "22"`, `color: color`).
- **Emoji: exatamente um uso deliberado** no produto todo — o 👋 do
  greeting do dashboard (`"Bom dia, Paulo 👋"`). Nunca como decoração,
  bullet ou em botões/labels/erros.

## Conteúdo e voz

- **pt-BR é o idioma default do produto**; `en` é um segundo locale completo
  (`users.locale`), não um afterthought — mas a **landing hoje é hardcoded
  pt-BR** (decisão explícita 2026-07-10, ver divergências).
- **Voz**: direta, calorosa, levemente informal — segunda pessoa "seu lar" /
  "sua casa", nunca corporativo "sua organização"/"seu workspace". Frases
  curtas e concretas.
- **Empty states explicam, não se desculpam**: título + uma dica em
  linguagem simples do que vai aparecer ali e por quê. Sem "Oops!", sem cara
  triste.
- **Números em vez de adjetivos** no marketing: "100% centavos exatos, sem
  arredondamento", "∞ membros por lar" em vez de superlativos vagos.
- **Precisão financeira como valor de marca**: nunca mostrar dinheiro
  arredondado/aproximado em copy ou mockup — "centavos exatos" é um
  diferencial de confiança explícito no produto (ADR-0017).

## Inventário de componentes

24 componentes + a marca — mapeamento 1:1 com
`apps/frontend/src/shared/components/ui/*` (mais `brand/logo.tsx` e
`brand/logo-mark.tsx`):

| Grupo | Componentes |
|---|---|
| Forms | Button, Input, Textarea, Label, Select, Switch, CurrencyInput, PhoneInput, DatePicker, Form |
| Feedback | Badge, Dialog, Sheet, Tooltip, Skeleton, EmptyState, Popover |
| Data | Card, Table, Separator, + padrão **HybridList/RowCard** (mobile-cards/desktop-table, hand-rolado por feature — não é componente compartilhado ainda) |
| Navigation | DropdownMenu, FilterPopover, ExportMenu |
| Brand | Logo (wordmark), LogoMark (ícone) |

Nenhum primitivo novo foi inventado alem do que o código já tinha — a
descrição completa de cada um (variantes, estados) é o próprio código-fonte
em `shared/components/ui/`; este documento cobre a *receita visual*, não
reimplementa a API de cada componente.

## Superfícies — a receita "glass"

Introduzida na landing (2026-07-10) e estendida ao app inteiro na mesma data
(decisão do produto, não do DS original — ver divergências). Regra central:
**cards em fluxo não usam blur** (não têm nada atrás para desfocar);
**superfícies flutuantes/portaladas** (que sobrepõem conteúdo) usam
fill translúcido + `backdrop-blur`.

| Tipo de superfície | Receita | Onde |
|---|---|---|
| Card / superfície em fluxo | `rounded-xl border-foreground/[0.07] bg-foreground/[0.03]` (sem blur) | `ui/card.tsx`, KPIs do overview, listas mobile-card das features |
| Shell (header/sidebar) | `bg-background/70 backdrop-blur-xl` | `top-header.tsx`, `household-sidebar.tsx`, header do `admin-layout.tsx` |
| Popover/DropdownMenu/Select | `bg-popover/85 backdrop-blur-xl` | `ui/popover.tsx`, `ui/dropdown-menu.tsx`, `ui/select.tsx` |
| Dialog/Sheet | `bg-popover/90 backdrop-blur-xl` | `ui/dialog.tsx`, `ui/sheet.tsx` |
| Tooltip | `bg-popover/90 backdrop-blur-md` | `ui/tooltip.tsx` |
| Overlay (fundo escurecido atrás de dialog/sheet) | `bg-black/60 backdrop-blur-sm` | já existia antes do DS — não mudou |
| Fundo do shell | `<AppBackground/>` — dot-grid + 2 glows (teal + laranja) a ~30% da intensidade da landing, `absolute inset-0 -z-10`, primeiro filho de um root `relative` | `shared/components/app-background.tsx`, nos 4 layouts (Household/Dashboard/Admin/Auth) |

## Landing vs. App — o que é exclusivo de cada superfície

- **Landing** (`features/landing/`): dark fixo `#0d0d0f` (não segue o token
  `--background`), blobs coloridos desfocados (`blur(100–120px)`, teal +
  laranja) sobre um dot-grid — tratamento **exclusivo da marketing**, nunca
  usado no app propriamente. Nav em pílula flutuante `rounded-full`; CTAs
  também `rounded-full`.
- **App** (dashboard/admin/auth): fundo = token `--background` (agora sempre
  o valor dark), `AppBackground` bem mais sutil (~30% da intensidade dos
  blobs da landing) atrás do glass. Botões e controles seguem `rounded-md`
  — a pílula é só da landing (decisão explícita, ver divergências).

## Assets de marca

- **Wordmark** (`Logo`, `brand/logo.tsx`): `<span class="text-primary">lar</span>mony`
  — texto vivo, nunca imagem.
- **Marca-ícone** (`LogoMark`, `brand/logo-mark.tsx`): conceito **"1a — Tile,
  casa de porta aberta"** dentre 12 explorados (`Logo Explorations.html` do
  handoff) — squircle preenchido com a cor primária, casa branca com porta
  em recorte arqueado. Serve como favicon/app-icon e como lockup ao lado do
  wordmark (nav/footer da landing).
- **Favicons/PWA** (`apps/frontend/public/`): `icon.svg` (OKLCH, servido a
  browsers modernos), `favicon.ico`, `apple-touch-icon.png`,
  `icon-192/512.png`, `icon-maskable-512.png`, `site.webmanifest` —
  rasterizados de um master em **sRGB hex `#0d9488`** (OKLCH não é seguro
  para rasterizador; gerador scratch em
  `apps/frontend/scripts/generate-brand-icons.mjs`, dependências `sharp`/
  `png-to-ico` só instaladas durante a geração, não comitadas).
- **Casa 3D** (`orbiting_home.glb`, `public/models/`): render 3D do hero da
  landing (React Three Fiber), reforça a metáfora "lar" = household. Ver
  regra 25 de `domain-rules.md` para a implementação completa (enquadramento
  responsivo, compressão meshopt, gate `lg+`).

## Divergências desta implementação vs. a proposta original do handoff

O handoff do Claude Design é um ponto de partida, não uma lei — estas foram
decisões deliberadas do produto que **substituem** o que o bundle original
sugeria. Registradas aqui para quem só leu o bundle (agora removido) não se
confundir:

1. **Marca-ícone existe** — o guideline `brand-wordmark.card.html` do
   handoff dizia *"never a separate icon mark"*; o produto decidiu ter um
   (o "1a") como favicon/app-icon, porque o app precisava de um favicon e
   não tinha nenhum. O wordmark continua sendo a marca principal em contexto
   de produto; o ícone é só para superfícies que exigem um glifo (aba do
   browser, PWA).
2. **App é dark-only**, não light+dark. O handoff documentava os dois temas
   (`colors-dark.card.html` existia só para mostrar que o dark também
   funciona). O produto removeu o toggle e o tema claro inteiramente
   (2026-07-10) — ver ADR-0021.
3. **Sora é global**, não landing-only. O `readme.md` do handoff dizia
   explicitamente "no custom webfont... this system codifies that stack
   explicitly rather than substituting a lookalike brand font" para o app —
   isso era verdade *antes* da landing existir com Sora; depois que a landing
   ganhou a fonte, o produto decidiu estendê-la a tudo por consistência de
   marca.
4. **Glass no app**, não só na landing. O `readme.md` do handoff dizia "the
   app itself is a flat `--background` surface, no imagery, no gradients, no
   patterns" e reservava blur/blobs para a landing. O produto decidiu
   estender a essência glass ao app inteiro (pedido explícito do usuário:
   "aplicar para o sistema como um todo... fundos em backdrop com blur").
5. **Botões seguem `rounded-md`** no app (mantido do sistema anterior),
   **não** `rounded-full` como na landing — divergência deliberada para não
   destoar de inputs/selects `h-10 rounded-md` ao lado deles em formulários.

## Mapa de arquivos (implementação)

| Conceito | Arquivo |
|---|---|
| Tokens de cor/tema | `apps/frontend/src/styles/globals.css` |
| Fonte Sora | `apps/frontend/src/shared/lib/fonts.ts` + wrapper em `pages/_app.tsx` |
| Tema dark-only | `apps/frontend/src/providers/index.tsx` (`forcedTheme="dark"`) |
| Fundo decorativo do shell | `apps/frontend/src/shared/components/app-background.tsx` |
| Wordmark | `apps/frontend/src/shared/components/brand/logo.tsx` |
| Marca-ícone | `apps/frontend/src/shared/components/brand/logo-mark.tsx` |
| Favicons/manifest | `apps/frontend/public/{icon.svg,favicon.ico,apple-touch-icon.png,icon-*.png,site.webmanifest}` |
| Componentes shared/ui | `apps/frontend/src/shared/components/ui/*` |
| Landing | `apps/frontend/src/features/landing/**` |
| Hero 3D | `apps/frontend/src/features/landing/components/hero-model*.tsx` |

## Ver também

- `.memory/domain-rules.md` — regras 21 (identidade visual/dark-only/glass),
  25 (render 3D) e 26 (Sora global) contêm a versão "regra de código" curta
  destas mesmas decisões, para consulta rápida durante implementação.
- `.memory/adr/0021-design-system-claude-design.md` — decisão arquitetural
  formal da adoção.
- `.memory/sessions/2026-07-10-design-system-logo-landing.md` e
  `2026-07-10-design-system-app-wide.md` — notas de sessão com o
  passo-a-passo da implementação e o que foi verificado.
