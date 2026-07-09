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
21. **Identidade visual (2026-07-05)**: primária **teal** (teal-600 light / teal-500 dark), semântica financeira via tokens — `text-success`/`bg-success` = receita (emerald), `destructive` = despesa, `warning` = vencimento (amber). NUNCA hardcodar cores tailwind (orange-500 etc.) em componentes — sempre tokens de globals.css. Wordmark: `<span class="text-primary">lar</span>mony`.
22. **i18n em pages (gotcha)**: toda page que renderiza o shell precisa de `export const getServerSideProps = makeI18nProps(["common", "dashboard"])` (shared/lib/i18n.ts). O helper passa a config EXPLÍCITA ao serverSideTranslations — o auto-load do next-i18next.config.js (ESM) devolve um Module namespace não-serializável e quebra com 500. Import do pages router no v16: `next-i18next/pages`.
23. **DatePicker — dropdown de mês/ano (2026-06-20)**: o `<select>` nativo do `react-day-picker` v10 (`captionLayout="dropdown"`) abre um popup do SO **não tematizável por CSS**. Override em `calendar.tsx` via **`components.Dropdown` = `CalendarDropdown`** que usa o nosso `Select` (Radix). O RDP v10 lê **`Number(e.target.value)`** no `onChange`, então o adapter sintetiza `onChange({ target: { value } })` a partir do `onValueChange` do Select (padrão shadcn). Não voltar ao select nativo.

24. **Onboarding (tour guiado) — como adicionar um novo tour** (2026-07-08): registrar em `features/onboarding/lib/tours.ts` (`key` + `version` + `steps`); se dispara por rota, mapear o segmento em `lib/route-tour.ts`. Passos `spotlight` precisam de um elemento com `data-tour="<id>"` já renderizado (se condicional — ex.: dentro de um toggle fechado — apontar para o container SEMPRE visível, não para o conteúdo que só aparece expandido). Passo sem alvo no DOM é pulado automaticamente. Tours fora do fluxo de rota (ex.: dentro de um `Sheet`) disparam manualmente via `useOnboarding().startTour(key)` guardado por `!isTourSeen(key)` e `!activeTour` (não interromper um tour já em andamento). Bump de `version` re-exibe para quem já viu essa versão. Textos ficam em `public/locales/{pt-BR,en}/onboarding.json` (chave = `titleKey`/`bodyKey` do step) — **toda** page do household precisa do namespace `"onboarding"` no `makeI18nProps([...])`, pois o tour do menu lateral pode disparar em qualquer uma delas.

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

### Orçamentos (budgets)

- Limite de gasto mensal por categoria: unique `(household_id, category_id, month, year)`.
- **Spending é calculado em tempo real** via query de transactions do mesmo
  mês/ano/categoria — nunca persistido.
- Ao editar orçamento, a categoria é imutável (troca = deletar + criar).

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

### i18n

- Idiomas: `pt-BR` (padrão) e `en`. Locale persistido em `users.locale` **e** no
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
- E-mails transacionais respeitam o locale do destinatário.

### Qualidade — Testes (TDD obrigatório)

- Test-first por módulo: unitário (use-cases, domain) + integração (controller +
  repositório com banco local). Regra herdada da carcaça; manter no Larmony.

### Pendências não bloqueantes para V1

- Landing page com copy do Larmony (hoje já tem copy de finanças domésticas).
- **v1 COMPLETO (2026-07-08)** — M1–M9 entregues; nenhum milestone restante.
