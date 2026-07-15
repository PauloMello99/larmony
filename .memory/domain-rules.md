---
name: domain-rules
description: Regras de domínio do Larmony (households, transações, metas, orçamentos, lançamentos programados) + convenções obrigatórias de backend/frontend/monorepo herdadas da carcaça
metadata:
  type: project
---

## Regras de Clean Architecture (backend)

Estas regras derivam do ADR-0006 e são **obrigatórias** em qualquer novo código de backend.

### Onde cada tipo de código vive

| Tipo | Camada | Diretório |
|---|---|---|
| Entidade de domínio | Domain | `<feature>/domain/<entity>.entity.ts` |
| Interface de repositório | Domain | `<feature>/domain/<entity>.repository.interface.ts` |
| Exceção de domínio | Domain | `<feature>/domain/exceptions/<code>.exception.ts` |
| Interface de serviço externo | Application/Ports | `<feature>/application/ports/<service>.interface.ts` |
| Use-case | Application | `<feature>/application/use-cases/<verb>-<entity>.use-case.ts` |
| Implementação de repositório | Infrastructure | `<feature>/infrastructure/persistence/<entity>.repository.ts` |
| Mapper (Drizzle ↔ domain) | Infrastructure | `<feature>/infrastructure/persistence/<entity>.mapper.ts` |
| Controller | Interface | `<feature>/<feature>.controller.ts` |
| DTO + validação | Interface | `<feature>/dto/*.dto.ts` |
| Guard / decorator | Interface | `<feature>/guards/` ou `<feature>/decorators/` |

### Regras obrigatórias

1. **Use-cases NÃO importam `DRIZZLE` diretamente** — injetam `I<Entity>Repository` via Symbol token
2. **Use-cases NÃO lançam exceções HTTP** — lançam subclasses de `DomainException`
3. **Entidades de domínio NÃO têm decorators** — nem `@Column()`, nem `@IsEmail()`, nem `@Injectable()`
4. **`database/schema/` é persistence model** — importado apenas por mappers e repositórios de infra
5. **Novos códigos de exceção** devem ser registrados em `DomainExceptionFilter.CODE_TO_STATUS`
6. **`IAuthProvider` (e futuros ports)** ficam em `application/ports/`, implementações em `infrastructure/`

### Padrão para criar novo módulo com repositório

```
1. <entity>.entity.ts — plain class, readonly props, static create()
2. <entity>.repository.interface.ts — interface + export const X_REPOSITORY = Symbol(...)
3. <code>.exception.ts — extends DomainException, readonly code = 'SCREAMING_SNAKE'
4. <entity>.mapper.ts — static toDomain(row) + toPersistence(entity)
5. <entity>.repository.ts — DrizzleXxxRepository implements IXxxRepository
6. <feature>-infrastructure.module.ts — { provide: X_REPOSITORY, useClass: DrizzleXxxRepository }
7. <feature>.module.ts — imports infra, declares use-cases, exports [X_REPOSITORY, use-cases]
8. Registrar novo code em DomainExceptionFilter.CODE_TO_STATUS se necessário
```

---

## Regras de UI — Frontend (mobile-first)

> **Design System completo**: ver [[design-system]] (`.memory/design-system.md`)
> para fundamentos visuais, inventário de componentes, voz de conteúdo e a
> receita de superfícies glass. As regras abaixo (21, 25, 26) são o resumo
> "regra de código" — o documento completo tem o contexto e as divergências
> vs. a proposta original do Claude Design.

**Obrigatório em qualquer novo componente ou página do frontend.**

1. **Mobile-first sempre** — escrever CSS base para ~375px, adicionar `sm:` / `md:` / `lg:` progressivamente. Nunca usar `max-md:` para "corrigir" desktop
2. **Sidebar = drawer no mobile** — `fixed -translate-x-full` por padrão, `translate-x-0` quando aberta; botão hamburger (`md:hidden`) no header
3. **Padding do main**: `p-4 sm:p-6` — nunca `p-6` fixo
4. **Grids**: começar em `grid-cols-1`, escalar com breakpoints (`sm:grid-cols-2 md:grid-cols-3`)
5. **Headings**: escalar da menor para maior — `text-3xl md:text-5xl lg:text-7xl`
6. **Forms**: `w-full max-w-sm mx-auto` — funciona em qualquer tela
7. **Textos longos de nav/breadcrumb**: `overflow-x-auto` ou truncate antes de esconder em mobile
8. **Tabelas**: usar SEMPRE o componente `Table` de `shared/components/ui/table.tsx` (nunca `<table>` cru). Padrão mobile-first: lista de cards no mobile (`sm:hidden`) + `Table` no desktop (`hidden sm:block`).
9. **Menu de ações em linha de tabela**: usar o `DropdownMenu` (radix, portaled) — NUNCA um `<div absolute>` próprio, que é cortado pelo `overflow-x-auto` do container da tabela. (Bug corrigido 2026-06-14.)
10. **Modais de criação/edição**: usar o `Sheet` de `shared/components/ui/sheet.tsx` (painel lateral `side="right"`), com `SheetHeader` + `SheetBody` (scroll) + `SheetFooter` (sticky, Cancelar + submit). Confirmações simples e painéis de histórico continuam em `Dialog`.
11. **Validação de e-mail**: usar o validador do zod (`z.email()` / helper `optionalEmail`), nunca regex manual.
12. **Telefone**: usar `PhoneInput` (`shared/components/ui/phone-input.tsx`) — seletor de país (libphonenumber-js, BR/US no topo) + máscara as-you-type; **armazena E.164** (`+5511999990000`). Schema valida com `/^\+[1-9]\d{6,14}$/`.
13. **Data**: usar `DatePicker` (`shared/components/ui/date-picker.tsx` = Popover + Calendar react-day-picker v10, locale ptBR, dropdowns de mês/ano); valor no form é string `YYYY-MM-DD`.
14. **Rotas do household usam SLUG, não UUID** — pasta `pages/dashboard/org/[orgSlug]/` (vira `[householdSlug]` na fundação). O layout resolve slug→entidade via hook e provê contexto; páginas obtêm o **UUID** via `useCurrentOrg().orgId` para chamadas de API (endpoints continuam em UUID). Slug não encontrado → redirect para a lista. (Somente slug; sem fallback de UUID.)
15. **Switch/toggle**: usar `shared/components/ui/switch.tsx` (radix). Dropdowns no header/breadcrumb (switcher, user-menu) DEVEM ser o `DropdownMenu` portaled (senão renderizam atrás da sidebar `fixed z-50`).
16. **Sidebar ativo por SEGMENTO BASE, não por fim de rota**: comparar o 1º segmento após o slug (`settings/general` → `settings`). Assim `settings/*` acende "Configurações" e nunca um item de feature homônimo. Regressão histórica: `endsWith("/"+href)` acendia o item errado (corrigido 2026-06-16).
17. **react-query + `useEffect`**: NÃO usar `const { data = [] }` como dep de efeito — o default cria **novo array a cada render** → loop "Maximum update depth". Usar referência estável (`const EMPTY = []` no módulo) e `data ?? EMPTY`. (Bug corrigido 2026-06-16.)
18. **Campos de formulário padronizados** (2026-06-20): `Input`, `SelectTrigger` e `Textarea` compartilham o mesmo visual — **`h-10` (input/select), `rounded-md`, `border-white/[0.08]`, `bg-white/[0.04]`, `focus:border-white/20 focus:ring-1 focus:ring-white/10`**. Botão default também `h-10 rounded-md`. Não reintroduzir tamanhos diferentes.
19. **Conteúdo centralizado**: o padding e a centralização vivem nos **layouts** (`OrgLayout`/`DashboardLayout` envolvem `children` em `<div className="mx-auto w-full max-w-7xl p-4 sm:p-6">`). Páginas **não** repetem `p-4 sm:p-6` no root (evita padding duplo) — usam só `space-y-*`.
20. **Scroll de container alto (gotcha CSS)**: `overflow-x-auto` força `overflow-y:auto` no mesmo elemento (spec) → cria scroll interno indesejado. Para a página inteira rolar, adicionar **`overflow-y-hidden`** ao container com `overflow-x-auto` quando a altura é o próprio conteúdo. (Corrigido 2026-06-20.)
21. **Identidade visual (2026-07-05; dark-only desde 2026-07-10)**: o app é **dark-only** — `ThemeProvider forcedTheme="dark"` (providers/index.tsx), `:root` do globals.css carrega os tokens dark (bloco `.dark` duplicado por segurança), sem toggle de tema (seção Aparência da Conta foi removida). Primária **teal** (teal-500, `oklch(0.704 0.14 182.503)`), semântica financeira via tokens — `text-success`/`bg-success` = receita (emerald), `destructive` = despesa, `warning` = vencimento (amber). NUNCA hardcodar cores tailwind (orange-500 etc.) em componentes — sempre tokens de globals.css. Wordmark: `<span class="text-primary">lar</span>mony`. **Receita glass (Design System)**: superfícies flutuantes = `bg-popover/85 backdrop-blur-xl` (popover/dropdown/select) ou `/90` (dialog/sheet, tooltip com `blur-md`); shell = `bg-background/70 backdrop-blur-xl` (header/sidebar); **cards** (Card e superfícies hand-rolled) = `rounded-xl border-foreground/[0.07] bg-foreground/[0.03]` (sem blur — em fluxo não há nada atrás). Fundo decorativo: `<AppBackground/>` (`shared/components/app-background.tsx`, dot-grid + glows teal/laranja sutis) como primeiro filho do root `relative` de cada layout (Household/Dashboard/Admin/Auth).
22. **i18n em pages (gotcha)**: toda page que renderiza o shell precisa de `export const getServerSideProps = makeI18nProps(["common", "dashboard"])` (shared/lib/i18n.ts). O helper passa a config EXPLÍCITA ao serverSideTranslations — o auto-load do next-i18next.config.js (ESM) devolve um Module namespace não-serializável e quebra com 500. Import do pages router no v16: `next-i18next/pages`.
23. **DatePicker — dropdown de mês/ano (2026-06-20)**: o `<select>` nativo do `react-day-picker` v10 (`captionLayout="dropdown"`) abre um popup do SO **não tematizável por CSS**. Override em `calendar.tsx` via **`components.Dropdown` = `CalendarDropdown`** que usa o nosso `Select` (Radix). O RDP v10 lê **`Number(e.target.value)`** no `onChange`, então o adapter sintetiza `onChange({ target: { value } })` a partir do `onValueChange` do Select (padrão shadcn). Não voltar ao select nativo.

25. **Render 3D na landing — React Three Fiber** (2026-07-09): o **Hero** (`hero.tsx`, feature `landing`) renderiza o modelo `orbiting_home.glb` via R3F, estilo Resend: o `<Canvas>` é uma camada **`absolute inset-0`** ocupando a section inteira (atrás do texto, `pointer-events-none z-0`), com o texto alinhado à esquerda (`z-10 max-w-xl`) e a casa grande à direita. `overflow-hidden` na section garante zero overflow. Stack: `@react-three/fiber@9` + `@react-three/drei@10` + `@react-three/postprocessing@3` + `three` (React 19 exige fiber v9). **Client-only obrigatório**: o `<Canvas>` (`hero-model-scene.tsx`, `export default`) é carregado por `next/dynamic(..., { ssr: false })` no wrapper (`hero-model.tsx`) — WebGL não roda no SSR do pages router. **Fundo transparente**: `<Canvas gl={{ alpha: true }} style={{ background: "transparent" }}>` — mostra o fundo escuro do hero. **Enquadramento responsivo**: a bbox do modelo é ~0.2 unidades → escala e posição são calculadas a partir de `useThree(s => s.viewport)` (unidades de mundo no plano z=0): `scale = viewport.height * 3.0`, `position.x = viewport.width * 0.28` (casa grande, ~78% da largura, à direita). Isso mantém o enquadramento estável em qualquer largura, sem escala/câmera fixa. **Só monta em `lg+`** (hook `matchMedia("(min-width: 1024px)")` em `hero-model.tsx` — retorna `null` abaixo disso): abaixo de 1024px não há largura para a casa ao lado do texto sem sobrepor, e evita baixar o `.glb`/inicializar WebGL no mobile/tablet (gate em JS, não só CSS `hidden`, senão o Canvas monta mesmo oculto). **Asset**: comprimir o `.glb` com `@gltf-transform/cli` (`resize --width 1024 --height 1024` → `webp` → `meshopt`; NÃO Draco) antes de servir em `public/models/` — meshopt tem decoder embutido no `useGLTF` do drei, evitando o Draco decoder via CDN gstatic (CSP). 27MB → ~700KB. **Iluminação**: o modelo é _baked_ (texturas de Blender) → cena precisa de pouca luz (ambient + directional); glow vem de realçar `emissiveIntensity` no `traverse` + `<Bloom>` do postprocessing; ambiente para reflexos metálicos via `<Environment>` com `<Lightformer>` filhos (em memória, sem HDRI de CDN). **Inclinação fixa**: o grupo externo (fora do grupo que gira) tem `rotation={[0.4, 0, 0]}` — inclina o topo do modelo em direção à câmera (vista de cima), para os rastros/anéis das moedas ficarem visíveis por cima da casa em qualquer ângulo do giro. Atenção ao sinal do eixo X: valor negativo faz o efeito contrário (nariz para cima, mostra o beiral por baixo) — testar visualmente ao ajustar. **Animação**: rotação contínua no eixo Y via `useFrame` (`rotation.y += delta * speed`), sem interação do usuário; respeitar `usePrefersReducedMotion` (hook em `shared/lib/`). **Iluminação** deve ser contida (o baked já traz o essencial): valores altos de `ambient`/`emissiveIntensity`/`Bloom` "estouram" o modelo — usar ambient ~0.35, directional ~0.7, `emissiveIntensity` ~1.0, `Bloom` `luminanceThreshold` ~0.7 / `intensity` ~0.5, e `gl={{ toneMappingExposure: 0.85 }}`. ESLint: R3F usa reconciler próprio → `/* eslint-disable react/no-unknown-property */` no topo do arquivo da cena. Fontes `.glb` na raiz do repo ficam em `.gitignore` (só a versão comprimida em `public/models/` é versionada).

24. **Onboarding (tour guiado) — como adicionar um novo tour** (2026-07-08): registrar em `features/onboarding/lib/tours.ts` (`key` + `version` + `steps`); se dispara por rota, mapear o segmento em `lib/route-tour.ts`. Passos `spotlight` precisam de um elemento com `data-tour="<id>"` já renderizado (se condicional — ex.: dentro de um toggle fechado — apontar para o container SEMPRE visível, não para o conteúdo que só aparece expandido). Passo sem alvo no DOM é pulado automaticamente. Tours fora do fluxo de rota (ex.: dentro de um `Sheet`) disparam manualmente via `useOnboarding().startTour(key)` guardado por `!isTourSeen(key)` e `!activeTour` (não interromper um tour já em andamento). Bump de `version` re-exibe para quem já viu essa versão. Textos ficam em `public/locales/{pt-BR,en}/onboarding.json` (chave = `titleKey`/`bodyKey` do step) — **toda** page do household precisa do namespace `"onboarding"` no `makeI18nProps([...])`, pois o tour do menu lateral pode disparar em qualquer uma delas. **Mobile (2026-07-10)**: `tour-spotlight-step.tsx` só aceita um alvo cujo `getBoundingClientRect()` esteja on-screen (`isOnScreen`) — no mobile os itens da sidebar vivem num drawer `-translate-x-full` (off-canvas, `x<0`); aceitar esse rect colocaria o spotlight fora da tela, então a localização re-tenta (até 40 frames) enquanto o drawer abre/transiciona. E no mobile o card do passo é forçado para `placement: "bottom"` (os placements laterais `right`/`left` pensados p/ desktop não cabem na largura estreita e o clamp sobreporia o alvo). O drawer é aberto no `startTour` do tour `sidebar` via `onRequestMobileNav`.

26. **Marca-ícone + favicon + fonte Sora da landing** (2026-07-10, do Design System exportado do Claude Design): a **marca-ícone** é o conceito **"1a"** (tile: squircle teal com casa branca de porta arqueada) — componente reutilizável `shared/components/brand/logo-mark.tsx` (`<LogoMark size houseColor>`, tile/porta em `currentColor` → colorir via `text-primary`, casa branca por padrão). O **wordmark** textual `<span class="text-primary">lar</span>mony` continua sendo a marca principal; o lockup na landing (nav/footer) é `LogoMark` + wordmark. **Favicons/PWA** vivem em `public/` (`icon.svg` em OKLCH; `favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png` rasterizados de teal **sRGB hex `#0d9488`** — NÃO alimentar OKLCH no rasterizador, librsvg/resvg podem não parsear; `site.webmanifest`), gerados pelo script scratch `apps/frontend/scripts/generate-brand-icons.mjs` (usa `sharp` + `png-to-ico` instalados **temporariamente** — commitar só os outputs, não deixar devDep). Wire em `pages/_document.tsx` (`<Head>` — os `<link rel=icon/apple-touch-icon/manifest>` + `<meta theme-color=#0d0d0f>`). **Fonte Sora (global desde 2026-07-10)**: `next/font/google` em `shared/lib/fonts.ts`, aplicada em `_app.tsx` por **dois mecanismos obrigatórios**: (a) `<style>` global setando `html { font-family: <nome literal via sora.style.fontFamily> }` — necessário porque conteúdo **portalado** do Radix (dropdown/dialog/sheet/select/tooltip) renderiza direto no `body` e NÃO herda de um wrapper dentro da árvore React; (b) wrapper `<div className={cn(sora.variable, "contents")}>` para o next/font injetar @font-face/preload e manter `--font-sora` disponível. Não aplicar a fonte via wrapper-only (portais ficam em system font) nem via `var(--font-sora)` no `html` (a custom property declarada no wrapper não sobe). **Landing = Direção A "Aconchego"**: ordem Nav→Hero→Features→Tour→About→Pricing→FAQ→FinalCta→Footer; nav em pílula flutuante (`fixed rounded-full` + sombra ao rolar); texto **hardcoded pt-BR** (sem i18n — o `LocaleSwitcher` do nav ainda não afeta o conteúdo; extrair para namespace `landing` fica para depois). **Motion sem framer-motion**: hooks próprios `features/landing/lib/use-reveal.ts` (IntersectionObserver + classes globais `.lp-reveal`/`.in`) e `use-count-up.ts` (valor inicial = alvo). Guards obrigatórios contra tela em branco: `usePrefersReducedMotion` revela na hora + `<noscript>` global força visível + hero (acima da dobra) renderiza sem reveal. Contadores mostram o número final no SSR/reduced-motion (nunca "0" preso). O hero 3D segue a regra [25] (camada `absolute inset-0`, gate `lg+`) — não re-parentear o `<Canvas>` para uma coluna (offsets derivam do `viewport` da section).

27. **Paginação de listas — client-side uniforme** (2026-07-10): listas paginam
    em memória via `usePagination` (`shared/hooks/use-pagination.ts`) +
    `Pagination` (`shared/components/ui/pagination.tsx`) — default 10, opções
    10/25/50/100. Aplicado em transações, categorias e lançamentos. **Não** há
    paginação server-side: as listas são naturalmente limitadas (transações
    pelo filtro de mês — o hook `use-transactions` busca `limit=200` p/ ter o
    mês inteiro; categorias/lançamentos são conjuntos pequenos). O hook clampa
    a página no render (não em efeito) para não piscar página vazia quando a
    fonte encolhe; trocar o tamanho reseta para a página 1. Endpoints seguem
    retornando array puro (categorias/lançamentos) ou `{items,total}`
    (transações, com o `total` server-side agora vestigial). Se algum dia uma
    lista deixar de ser limitada, aí sim mover para server-side.

28. **`DropdownMenuSubContent` DEVE ser portalado** (gotcha, 2026-07-10): o
    submenu do Radix (`Sub`) renderizado sem `DropdownMenuPrimitive.Portal`
    fica sob o `DropdownMenuContent` pai, que tem `overflow-hidden` → o submenu
    existe no DOM mas **não é pintado** (bug do seletor de idioma no menu de
    usuário). O `SubContent` em `shared/components/ui/dropdown-menu.tsx` já
    envolve em `Portal` — não remover. Regra geral: qualquer conteúdo flutuante
    do Radix aninhado dentro de um container com `overflow-hidden` precisa de
    Portal.

29. **Scroll interno em card de grid casando altura com a coluna irmã** (gotcha,
    2026-07-10): para um card (ex.: "Transações recentes" no dashboard) rolar
    internamente e ter a altura ditada pela coluna irmã do grid (e não pelo
    próprio conteúdo), tornar a lista interna `lg:absolute lg:inset-0
    lg:overflow-y-auto` dentro de um body `lg:relative lg:min-h-0` — assim o
    conteúdo não conta para o `max-content` que dimensiona a linha do grid. No
    mobile (colunas empilhadas) a lista fica em fluxo normal e a página rola.
    Lembrar do `min-h-0` (armadilha do flexbox) em toda a cadeia de flex pais.

---

## Regras do Monorepo (convenções técnicas)

- **pnpm** obrigatório — nunca npm ou yarn
- Instalar deps: `pnpm add <pkg> --filter @repo/<package>`
- Instalar dev dep global: `pnpm add -Dw <pkg>`
- Toda config TypeScript herda de `@repo/typescript-config/*`
- Merging de classes Tailwind: sempre `cn()` de `@repo/utils`
- Nova task Turborepo: declarar em `turbo.json` antes de usar

---

## Regras de Domínio (produto Larmony)

> Fonte: domínio validado no old-larmony (`old-larmony/CLAUDE.md`), adaptado às
> convenções desta arquitetura (use-cases em vez de triggers, centavos inteiros,
> RLS via `app_user`). Cada feature ganha spec própria em `docs/product/features/`.

### Multi-tenancy — household

- O **household** (lar) é a unidade de tenancy. Todo dado financeiro pertence a um
  household; nenhuma tabela de domínio existe sem `household_id`.
- Um usuário pode pertencer a **múltiplos households** (pivot `household_memberships`
  com `role`), como `owner` ou `member`.
- Roles: apenas `owner` | `member` no v1. **Sem permissões por módulo** — households
  têm 2–4 pessoas. Owner gerencia membros/convites/settings; member usa as features.
- O household ativo é escolhido no frontend (switcher) e persiste em localStorage;
  trocar de lar invalida todas as queries.
- Isolamento no banco: RLS com helpers (`is_household_member`, `is_household_owner`,
  `is_super_admin`) sobre `auth.uid()`, executando como role `app_user` NOBYPASSRLS
  com `set_config('request.jwt.claims', ...)` por request (ver ADR-0005/0015).
  `household_id` **nunca** vem do cliente em inserts — sempre derivado da sessão.
- **Gotcha (RLS + `users`):** a policy base `users_select` só deixa o usuário ver a
  própria linha (`auth.uid() = auth_id`). Qualquer query RLS-scoped que faça
  `INNER JOIN` em `users` (ex.: listar membros do lar) **descarta silenciosamente**
  os co-membros. Corrigido na migration `0004` com o helper `SECURITY DEFINER`
  `shares_household_with(uuid)` + a policy permissiva `users_select_household_peers`
  (OR com a base): co-membros de um mesmo lar passam a se enxergar. RLS é por linha,
  não por coluna (co-membros leem a linha inteira de `users`; a app só seleciona
  `name`/`email`).

### Convites

- Convite por e-mail com `token` único, expira em **7 dias**, `accepted_at` NULL = pendente.
- Só o **owner** convida. Envio via módulo `mail` (Resend, from `Larmony <team@larmony.me>`).
- Aceite: link `/invite/accept?token=...`; se não autenticado, o fluxo de
  login/cadastro preserva o token via `?redirect=` e aceita após autenticar.
- Aceitar cria `household_membership` com role `member`.

### Categorias

- Categorias classificam transações, orçamentos e contas: `type` = `income` |
  `expense` | `both`; `color` hex para identificação visual.
- **13 categorias padrão** são criadas na criação do household — por **use-case**
  (`CreateHouseholdUseCase`), não por trigger (diferença deliberada vs old-larmony).
- Categoria é opcional na transação (`category_id` nullable, `ON DELETE SET NULL`).

### Transações — entidade central

- `type`: `income` | `expense`. Valor em **centavos inteiros** (`amount_cents`).
- `date` é a **data da ocorrência** (tipo `date`), não a de criação.
- **`created_by` ≠ `person_id`**: `created_by` é quem *registrou* no sistema;
  `person_id` (nullable) é quem *realizou* o gasto. Relatórios por pessoa usam
  `person_id`. A coluna "Pessoa" na UI só aparece se o household tem >1 membro.
- Transações são **editáveis e deletáveis** — sem ledger append-only (ADR-0010 do
  ink-ops marcado como não aplicável ao Larmony).

#### Parcelamento

- Um parcelamento (ex.: 12x de R$100) cria **uma transaction por parcela**, todas
  ligadas a um `installment_group` (que guarda descrição e total), com
  `installment_number` (1..n) e `installment_count`.
- O valor informado é o **total**; dividido por `splitEqually`
  (`common/finance/split.ts`) — **1ª parcela absorve a sobra** de centavos
  (ADR-0017). Datas avançam mês a mês (`addMonthsISO`, clamp de dia).
- Excluir 1 parcela remove só aquela transaction; excluir a **série** =
  `DELETE .../installment-groups/:groupId` (cascade nas parcelas + rateios).
  Não há "editar série inteira" nem converter única↔parcelada no v1.

#### Rateio (divisão entre membros)

- Pivot `transaction_members` (`transaction_id`, `user_id`, `share_amount_cents`).
- `share_amount_cents` **NULL = divisão igual** entre os membros listados
  (fatia efetiva calculada no read por `splitEqually`); valor preenchido =
  fatia específica (a soma tem de bater com o `amount_cents`, senão 422).
- Unique `(transaction_id, user_id)`. Update substitui a lista inteira.
- **Combinar parcela + rateio é permitido, mas só rateio IGUAL** (cada parcela
  dividida igualmente entre os membros). Rateio específico + parcelamento → 422
  (evita split 2D parcela×membro; fora do v1).

#### Lançamentos programados (ADR-0020 ✅ 2026-07-09 — unifica bills M7 + recorrência M9)

- Tabela única `scheduled_transaction_entries` (não é extensão de nenhuma das
  duas antigas): `posting_mode ∈ {auto,manual}` é o eixo que separa os modos —
  **não** o `type` (`income`|`expense`, sempre presente; o lançamento
  programado é type-neutral: salário mensal é uma recorrência de receita, não
  uma "conta a pagar"). Cadência `frequency ∈ {weekly,monthly,yearly}` +
  `interval` ("a cada N"; **sem RRULE**, mesmo modelo do ADR-0019).
  `due_day` de bills não existe mais como campo — é subsumido por `startDate`
  (dia-do-mês carregado pela data de origem).
- **CHECK físico no schema**: `(posting_mode = 'auto') = (next_run_date IS NOT
  NULL)`. `next_run_date` (cursor) só existe no modo `auto`; um filtro
  esquecido no engine não consegue gerar de uma linha `manual` porque
  `next_run_date IS NULL` já a exclui de `next_run_date <= hoje`.
- **Modo `auto`** (ex-recurrences): gera transações automaticamente. O job
  `scheduled-transactions-engine` (tick do cron) materializa **cada ocorrência
  na sua data**, não pré-materializa futuro. Idempotência: **avança o cursor
  ANTES de inserir** (gaps-over-dups). Transação gerada tem
  `scheduled_transaction_entry_id` (FK SET NULL) e badge "Recorrente".
  `startDate` deve ser hoje ou futuro no create (422
  `SCHEDULED_ENTRY_START_DATE_IN_PAST`; sem backfill surpresa).
- **Modo `manual`** (ex-bills): definição estática + lembrete + lançamento
  manual — **nunca** gera transaction automaticamente. `reminder_days_before ∈
  {1,3,7,15}` (NULL = sem lembrete); job `scheduled-transactions-reminders`
  dispara e-mail quando `dias_até_próxima_ocorrência == reminder_days_before` e
  ainda não enviou **no dia** (dedup por dia-calendário, não por mês — dedup
  por mês era um bug latente de bills para cadências não-mensais, nunca
  observado porque bills só tinha `monthly`). "Lançar como transação"
  (`LaunchScheduledEntryUseCase`, reusa `CreateTransactionUseCase`) usa o
  `type` da própria entrada (não hardcoded `expense`); **a entrada nunca é
  consumida** — lançar é sempre manual e relançável. Bloqueado para entradas
  `auto` (409 `SCHEDULED_ENTRY_NOT_MANUAL` — o engine já posta essa sozinha).
- **Dois helpers de "próxima data" — não confundir**: `nextRunOnOrAfter`
  (cursor-based, `scheduled-entry-schedule.ts`) é **só para o engine `auto`**,
  que sempre parte de um cursor já clampado. `nextManualOccurrence`
  (stateless, `common/finance/due-date.ts`) é **só para o modo `manual`**
  (lembrete + card "Próximos lançamentos"), que não tem cursor — reusar o
  helper cursor-based aqui causaria drift permanente (dia-de-origem 31
  clamparia para 28/fev e ficaria colado em 28 para sempre); o stateless
  re-deriva o dia-de-origem do zero em cada mês-alvo.
- **Toggle de modo**: `manual→auto` re-ancora `next_run_date` via
  `nextRunOnOrAfter` (pula para a próxima ocorrência futura, não gera de uma
  vez o histórico parado — mesmo princípio da reativação do ADR-0019);
  `auto→manual` zera `next_run_date` para satisfazer o CHECK. `startDate` é
  imutável no update em ambos os modos (troca = deletar+criar).
- **Sem rateio e sem parcelamento no v1** (precedente do M4/M9). Dashboard
  destaca entradas `manual` com vencimento em ≤7 dias (alerta amber).
- Migrados no ADR-0020: `bills`/`recurrences` (módulos, features, rotas,
  specs) deletados por completo, sem período de coexistência.

### Metas (goals)

- Meta de poupança: `target_amount_cents`, `target_date` opcional, `color`.
- Aportes em `goal_contributions` (valor, data, quem aportou).
- **`current_amount` é derivado** (SUM das contribuições no use-case), não
  persistido — sem trigger de sync (diferença deliberada vs old-larmony).
  Materializar só se a performance exigir.
- Meta concluída quando `current >= target` (badge "Concluída" na UI).

### Orçamentos (budgets) — M10 ✅ (série + versões, ADR-0021)

- Modelo **série + versões**: `budgets` é a série por `(household_id,
  category_id)` — só identidade + `ended_from` opcional; `budget_versions`
  guarda o histórico de limites (`amount_cents`, `effective_from`, dia 1 do
  mês). Unique parcial `(household_id, category_id) WHERE ended_from IS NULL`
  — só uma série **aberta** por categoria (séries encerradas não conflitam,
  permitindo recriar).
- **Resolução do limite é on-read, nunca materializada**: para um período, a
  versão aplicável é a de **maior `effective_from` ≤ início do período**
  (`DISTINCT ON (budget_id) ORDER BY budget_id, effective_from DESC`, ver
  `drizzle-budget.repository.ts`), e a série só entra na listagem se ainda
  cobria o período (`ended_from IS NULL OR período < ended_from`). Nenhum cron
  clona/materializa orçamento por mês — a herança automática entre meses é
  100% derivada.
- **Invariante central: editar = upsert da versão do mês corrente, nunca
  altera uma versão passada.** `PATCH` faz
  `INSERT ... ON CONFLICT (budget_id, effective_from) DO UPDATE` com
  `effective_from = currentPeriodStart()` — reeditar no mesmo mês sobrescreve
  a mesma versão (não duplica); meses anteriores nunca são tocados. Essa
  regra entrega a imutabilidade do passado e a reedição no mesmo caminho.
- **Imutabilidade enforçada no servidor, não é só flag de UI**: editar uma
  série com `ended_from` preenchido (não é mais a série aberta) → 422
  `BUDGET_PERIOD_NOT_EDITABLE`. Não há parâmetro de período no `PATCH`/`POST`
  — create/edit sempre ancoram no mês corrente; não é possível pedir para
  editar um mês passado/futuro via API (elimina a necessidade de validar
  "qual mês o cliente está vendo").
- **"Mês corrente" é UMA função só**: `currentPeriodStart(timezone)`/
  `currentMonthYear(timezone)` em `common/finance/due-date.ts` — usada pelo
  anchor de create/edit E pelo cálculo de `isEditable`/`isProjected` no
  `list-budgets.use-case`. Desde o M12 (ADR-0024) **exige o fuso do lar**
  (resolve via `localISODate`); os chamadores household-scoped resolvem
  `households.timezone` (o repo de budgets via `findTimezone`, o overview via
  a entidade já carregada). Nunca duplicar `new Date()` para essa decisão.
- **`isEditable`/`isProjected` são propriedades do PERÍODO consultado**, não
  da linha — atribuídas uniformemente pelo use-case (`período === corrente` /
  `período > corrente`), nunca calculadas por linha no repositório. Sem
  scheduling futuro no v1: qualquer período à frente do corrente é sempre
  projeção do limite vigente (nunca há versão com `effective_from` futuro).
- **Remoção = encerrar a série sempre** (`ended_from = mês corrente`), nunca
  hard delete — um único caminho de código, mesmo se a série foi criada e
  removida no mesmo mês (tombstone invisível, não bloqueia recriar via a
  unique parcial). Remover uma série já encerrada → 404 (idempotente).
- Categoria continua imutável (trocar = encerrar série + criar outra).
- **Spending continua calculado em tempo real** via query de transactions do
  mesmo mês/ano/categoria — nunca persistido (inalterado desde M5).
- Overview (`budgetsProgress`, M3) replica a mesma resolução on-read para o
  mês corrente — não acoplado ao módulo `budgets` (mesmo padrão do M5).
- **Migração 0006 sem backfill de valores** (decisão deliberada do kickoff):
  produção intocada, staging é dado de teste descartável — a migration só
  remodela as tabelas, sem `INSERT ... SELECT` de histórico. Usuários
  reconfiguram os orçamentos após o deploy.

### Relatórios (reports) — M8 ✅

- Vista **mensal**: bar chart rolling de 6 meses + pie por categoria + gasto por pessoa.
- Vista **anual**: bar chart dos 12 meses + totais + navegação de ano.
- Gasto por pessoa usa `person_id` (não `created_by`); empty state explica como
  atribuir pessoa às transações.
- **Implementação**: módulo `reports` (não estender `households`); 3 queries
  paralelas no mensal (série 6m + categoria + pessoa), 1 query no anual; pizza e
  pessoa referem-se ao **mês corrente**; cores receita=`--success`,
  despesa=`--destructive`; sem auditoria (read-only).
- **Frontend**: `features/reports/` — `ReportsPage`, `MonthlyView`, `AnnualView`,
  hooks `useMonthlyReport`/`useAnnualReport`, `queryKeys.reports`.

### Notificações (notifications) — M11 ✅ (dispatcher multicanal, ADR-0023)

- **Único ponto de entrada**: `DispatchNotificationUseCase` — grava a linha
  in-app (sempre, `DRIZZLE_ADMIN`), resolve preferências por destinatário e
  faz fan-out via ports (`Promise.allSettled`, falha num canal não bloqueia
  os outros). Nunca invocar `IEmailSender`/`ISmsSender`/`IWhatsAppSender`
  direto de um use-case de domínio — sempre pelo dispatcher.
- **Canais**: in-app (sempre, não configurável) + e-mail (real, Resend) +
  SMS/WhatsApp (**ports stub no M11** — no-op se a flag
  `NOTIFICATIONS_{SMS,WHATSAPP}_ENABLED` estiver off; **lança** se on sem
  provedor integrado — nunca finge enviar). Sem `users.phone`/verificação
  ainda — colunas SMS/WhatsApp na UI (Account) sempre desabilitadas.
- **`notification_preferences`**: matriz `(user_id, event_type, channel,
  enabled)` por usuário (não por household). Ausência de linha = default do
  evento (`DEFAULT_CHANNEL_ENABLED`/`PREFERENCE_EVENT_TYPES` em
  `notification-events.ts`: e-mail on, sms/whatsapp off) — nunca backfillado.
  In-app não entra na matriz (sempre gravado).
- **`notification_dedup` é tabela dedicada** (não coluna em goals/budgets):
  `(household_id, event_type, context_id, period_key)`, reivindicado via
  `INSERT ... ON CONFLICT DO NOTHING RETURNING id` **antes** do dispatch —
  mesmo princípio do `reminder_last_sent_at`. Sempre household-scoped, nunca
  por usuário (fan-out é ortogonal ao dedup). Sem RLS — sempre
  `DRIZZLE_ADMIN`.
- **Eventos event-driven** (avaliados no seam de escrita, não por varredura):
  `goal_reached` (dedup `"once"`/meta), `budget_exceeded` (dedup
  `"YYYY-MM"`/budget×mês, resolve o limite vigente via `budget_versions`/M10),
  `auto_launch` (sem dedup — idempotência estrutural: cursor avança antes do
  insert). `monthly_report` é o único por cron (`monthly-report`, último dia
  do mês, baseline UTC — M12 troca por timezone do household).
- **Gotcha crítico (achado em e2e, corrigido antes do merge): a leitura de um
  check "acabei de escrever isso, e agora?" precisa usar a MESMA conexão da
  escrita que a originou.** Toda escrita de transação roda dentro de uma
  transação Postgres aberta em `DRIZZLE` (a `RlsInterceptor` só dá `COMMIT`
  ao fim do request) — ler o mesmo dado por `DRIZZLE_ADMIN` (conexão
  diferente) não vê a escrita ainda não commitada. Por isso
  `findBudgetForCategoryPeriod` tem duas variantes: via `DRIZZLE` (chamada
  pelos use-cases request-scoped `CreateTransactionUseCase`/
  `CreateInstallmentTransactionUseCase`) e `findBudgetForCategoryPeriodAdmin`
  via `DRIZZLE_ADMIN` (só para `CreateGeneratedTransactionUseCase`/engine,
  que roda fora de request context). Regra geral: só uma leitura
  verdadeiramente cross-context (cron lendo dados antigos, não a escrita
  corrente do próprio use-case) usa `DRIZZLE_ADMIN`.
- Helper `findHouseholdMemberUserIds(db, householdId)` em `common/household/`
  — cada módulo (`goals`, `budgets`, `reports`, `scheduled-transactions`)
  expõe seu próprio método de repositório delegando pra ele (use-cases nunca
  importam `DRIZZLE` direto).
- Frontend: `NotificationsSection` no Account (`Table`+`Switch`, hook
  `use-notification-preferences`, `GET`/`PUT /me/notification-preferences`).
- **i18n das notificações (render-at-send)**: os use-cases **não** montam
  string — passam `type` + params estruturados (união discriminada
  `NotificationParams`); o dispatcher renderiza por destinatário no idioma do
  perfil (`users.locale`, buscado junto com o contato em `findUserContact`) e
  grava o title/body já traduzidos na linha in-app. Catálogo
  função-por-mensagem em `notifications/application/i18n/`
  (`notification-messages.ts` + `notification-locale.ts`), 3 locales
  (pt-BR/en/es, fallback pt-BR). **Moeda fica fixa em pt-BR/BRL** (mesma
  decisão do frontend `formatCentsToBRL` — "R$ 1.234,56" sempre); só datas e
  nomes de mês seguem o locale. Notificação antiga fica congelada no idioma de
  quando foi gerada (aceito). Único mecanismo de i18n do backend hoje —
  **e-mails seguem hardcoded pt-BR** (track separado; só o *corpo* do e-mail de
  notificação sai localizado, por reusar o title/body renderizado).

### Timezone dos disparos (cron) — M12 ✅ (ADR-0024)

- **Fuso é por LAR** (`households.timezone` IANA + `households.notification_hour`
  0–23, migration 0008). Não há fuso/hora por usuário nem dedup por-usuário
  (adiados p/ pós-v1.1). Sempre IANA, nunca offset fixo.
- **Ponto único de "agora" no fuso**: `common/time/tz-clock.ts` —
  `zonedNow(tz, now)` (Date com getters locais no fuso), `localISODate(tz, now)`
  (yyyy-MM-dd local via `formatInTimeZone`), `localHour(tz, now)`. **Onde um job
  fazia `new Date()` cru, agora usa estes helpers com o fuso do lar.** O tick e
  o `InternalCronController` não mudam (burros; cada job resolve).
- **Regras por job**: engine gera quando a data local do lar chega (`findDue`
  busca até teto UTC+14 com JOIN do fuso; corte fino `nextRunDate <=
  localISODate(tz)` em código; catch-up idem). Lembrete e relatório mensal
  disparam a partir de `localHour(tz) >= notification_hour` (>= tolera atraso de
  tick; dedup diária impede reenvio), com dedup na **data local do lar**
  (`reminderLastSentAt`/`notification_dedup` comparados no fuso, nunca com
  `getDate()`/`toISOString().slice()` crus). Auto-launch e eventos event-driven
  (meta/orçamento) disparam na hora — hora preferida não se aplica.
- **Validação estrita**: `households.timezone` validado contra
  `Intl.supportedValuesOf("timeZone")` (`common/time/timezones.ts`) nos DTOs —
  fuso inválido faria date-fns-tz lançar no tick. `Intl.supportedValuesOf` não
  está na lib de tipos do TS (cast pontual back+front).
- **Gotcha**: os helpers legados `toISODate`/`monthBounds` misturam
  `new Date(y,m,d)` local + `toISOString()` (só corretos em processo UTC, como
  prod). Os helpers novos usam `formatInTimeZone` (robustos a qualquer TZ) —
  preferir sempre eles para lógica de fuso.
- Front: criação de lar auto-detecta `Intl.DateTimeFormat().resolvedOptions()
  .timeZone` e envia; Configurações do lar têm seletor de fuso + hora
  (`shared/lib/timezones.ts`).

### i18n

- Idiomas: `pt-BR` (padrão), `en` e `es`. Locale persistido em `users.locale` **e** no
  cookie `NEXT_LOCALE` (o que o Next.js honra na detecção). Fonte única da lista de
  locales: `apps/frontend/src/shared/lib/locale.ts` (`SUPPORTED_LOCALES`/`DEFAULT_LOCALE`);
  `next-i18next.config.js` espelha manualmente (é `.js`, não importa TS).
- **Gotcha (persistência):** o Next.js só consulta o cookie `NEXT_LOCALE` para
  redirecionar a **raiz** (`/`) — rotas profundas não-prefixadas (`/auth/login`,
  `/dashboard/...`) são servidas no `defaultLocale`, ignorando o cookie. Por isso há um
  **`middleware.ts`** que redireciona qualquer path não-prefixado para a variante do
  locale do cookie (cobre SSR de páginas públicas E autenticadas, sem flash).
  `LocaleSection` seta o cookie ao trocar; `useLocaleSync` (montado em `AuthGuard`)
  reconcilia `users.locale` → cookie após o login; `_document` deriva `<html lang>` do
  locale ativo. Verificado: cookie `en` + `/auth/login` → 302 → `/en/auth/login`, `lang="en"`.
- Formatação: use `shared/lib/format.ts` (`useActiveLocale` + `formatDate`/`formatNumber`,
  sensíveis ao locale ativo do router). Moeda continua **BRL fixa** (`formatCentsToBRL`).
- **Estado do rollout:** scaffold `next-i18next` pronto; features `dashboard`+`auth(login)`
  usam `t()`. Demais telas ainda são pt-BR hardcoded — rollout tela-a-tela pendente
  (plano em fases; e-mails e strings de backend são tracks separados).
- **Backend i18n**: só as **notificações** têm i18n (render-at-send no locale do
  destinatário — ver §Notificações). **E-mails transacionais seguem hardcoded
  pt-BR** (subjects, chrome do `base-layout`, welcome/invite/reset) — a intenção
  do ADR-0018 de e-mails localizados **nunca foi implementada**; é track separado.

### Qualidade — Testes (TDD obrigatório)

- Test-first por módulo: unitário (use-cases, domain) + integração (controller +
  repositório com banco local). Regra herdada da carcaça; manter no Larmony.

### Seed de dados para dev local (2026-07-10)

- `pnpm --filter backend seed:local` (`apps/backend/scripts/seed-local-user.ts`)
  recria do zero o usuário `local@user.com` / `we3fladmin*` (login fixo,
  idempotente — deleta `auth.users`+`public.users`+household anterior antes
  de semear) com 2 anos de dados ricos em todos os módulos: ~250 transações
  (recorrentes + discricionárias + parcelamentos), 5 categorias orçadas com
  histórico versionado (M10 — inclui um caso de série encerrada+reaberta com
  gap, para testar visualização somente-leitura de meses passados/futuros),
  4 metas (uma concluída), 4 lançamentos programados (auto+manual).
- **Gotcha**: o script fala HTTP com o dev server real (`pnpm --filter
  backend dev` precisa estar rodando) em vez de bootar o Nest em-processo —
  `tsx`/esbuild não emite os metadados de decorator (`design:paramtypes`) que
  o DI do Nest usa para injeção implícita por tipo (`ConfigService` etc.),
  então um bootstrap in-process via `tsx` falha silenciosamente com
  providers `undefined`. `ts-jest`/o compilador do Nest CLI não têm esse
  problema — só scripts `tsx` que instanciam o `AppModule` diretamente.
- Histórico de orçamento (`budget_versions` retroativos) é sempre inserido
  via SQL direto (pool admin) — a API nunca cria versão passada por design
  (M10); é assim mesmo que qualquer seed de histórico de orçamento precisa
  ser feito.

### Essencial/Completo/locked — régua de billing (M16, pago-only — ADR-0029)

- **Sem plano gratuito funcional.** Billing é **por household**, não por
  usuário. `EntitlementsService.resolve(householdId)` retorna `plan` (
  `locked | essencial | completo`) + `status` + `source` (
  `stripe | comp | trial | locked`) + `capabilities` — **não há mais
  `limits`/régua por contagem** (removida por completo no M16; a régua D-1
  do M14 está superseded).
- **Resolução**: `type=custom` (comp) ⇒ `completo`, nunca rebaixado;
  `type=standard` + `status=trialing` ⇒ `completo` (trial self-serve dá
  acesso Completo independente do tier escolhido para cobrança pós-trial);
  `type=standard` + `status=active|past_due` ⇒ `tier` do preço (fallback
  `completo` se o tier não estiver setado — nunca restringe um pagante a
  menos do que contratou); resto (`free`, `standard/canceled`, ou o legado
  `type=trial` do admin local removido) ⇒ `locked` (somente-leitura).
- **`locked`** (nunca assinou, trial expirado, ou cancelado) = o dono/membros
  ainda **veem** os próprios dados, mas toda escrita é bloqueada — nunca
  apaga nada. `ActiveSubscriptionGuard` (`subscriptions/interface/guards/`)
  bloqueia POST/PATCH/DELETE quando `plan==="locked"` → 402
  `SUBSCRIPTION_REQUIRED`; aplicado **por-controller** (nunca `APP_GUARD`
  global — rodaria antes do `AuthGuard`, e `getOrCreate()` faria INSERT de
  subscription pra qualquer UUID adivinhado, mesmo sem autenticação) em
  `transactions`/`categories`/`goals`. **`households` fica de fora** —
  renomear/gerenciar membros/sair/deletar o lar continua disponível mesmo
  locked (gestão de conta nunca prende o usuário; o paywall protege dados
  financeiros, não o encanamento da conta).
- **Capabilities** (`CAPABILITIES`, `subscriptions/domain/entitlements.ts`) —
  5 booleanas, todas **Completo-only**: `budgets`, `scheduled_entries`
  (novas no M16), `advanced_reports`, `report_export`, `custom_categories`
  (existentes do M14). Essencial e `locked` têm todas `false`. Módulos
  inteiramente Completo (orçamentos, lançamentos programados) usam
  `@RequireCapability` + `HouseholdEntitlementGuard` **a nível de classe**
  (bloqueia TODAS as rotas, incl. GET — a lista some por completo pra
  Essencial/locked, não só a criação). **Categorias personalizadas**: só a
  criação é gateada (`custom_categories`); listar/editar/excluir categorias
  (incl. as 13 padrão) continua sempre livre — comportamento herdado do M14,
  correto desde então.
- **Trial self-serve** (30 dias, via Stripe, não mais admin local): o
  usuário escolhe o `planKey` (Essencial ou Completo × mensal/anual) **no
  checkout** — é esse plano que é cobrado ao fim do trial, sem tier-padrão
  pós-trial (decisão do responsável). `subscriptions.trial_consumed` marca
  antes da chamada ao Stripe (checkout abandonado não libera 2º trial).
  `payment_method_collection: "always"` força cartão upfront mesmo em
  trial — todo mundo passa pelo checkout, dá tracking real de conversão.
- **Trial administrativo local (H-3, M14) foi removido no M16 PR4** —
  redundante desde o self-serve. `GrantTrialUseCase`/`RevokeTrialUseCase` e
  a coluna `trial_ends_at` (agora dead-but-harmless) não são mais usados; o
  único "acesso grátis" concedível pelo admin continua sendo o **comp**
  (isenção), inalterado desde o ADR-0026.
- **Sem migração de enum**: `subscription_type` no banco continua
  `free|trial|standard|custom` — `free` só passou a **significar**
  "sem assinatura ativa" (`locked`) em vez de "plano gratuito funcional".
- **Fora de escopo, registrado como follow-up futuro**: categorias-padrão
  hoje são sempre criadas em pt-BR, independente do idioma do usuário
  (herdado do M14, não tocado no M16); filtro de plano na lista admin de
  lares (`admin-households.tsx`) segue pelo `type` bruto do Stripe, não pelo
  `tier` resolvido.

### Pendências não bloqueantes para V1

- Landing page com copy do Larmony (hoje já tem copy de finanças domésticas).
- **v1 COMPLETO (2026-07-08)** — M1–M9 entregues; nenhum milestone restante.
