# Home Finances — Referência para Claude Code

## Essência do Projeto

Aplicação web de **controle financeiro doméstico multi-usuário**. Um *household* (lar) pode ter múltiplos membros que compartilham acesso às mesmas entidades financeiras. Cada membro autentica individualmente, mas todos os dados são isolados por `household_id` via Row Level Security no Supabase.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Roteamento | TanStack Router v1 (file-based em `src/routes/`) |
| Estado servidor | TanStack React Query v5 |
| Tabelas | TanStack React Table v8 |
| Backend | Supabase (PostgreSQL + Auth + PostgREST + RLS) |
| UI primitivos | Radix UI (`@radix-ui/react-*` pacotes individuais) |
| Componentes | shadcn/ui pattern (arquivos em `src/components/ui/`) |
| i18n | i18next + react-i18next (locale persistido em `profiles.locale`) |
| Formulários | React Hook Form + Zod + `@hookform/resolvers` |
| Estilos | Tailwind CSS v4 |
| Gráficos | Recharts |
| Datas | date-fns v4 + react-day-picker |
| Ícones | lucide-react |
| Moeda | Formatação BRL em `src/lib/currency.ts` |

---

## Arquitetura de Pastas

```
src/
├── components/
│   ├── atoms/          # EmptyState, LoadingSpinner — sem estado, puramente visuais
│   ├── molecules/      # ConfirmDialog, DatePicker — composições simples de átomos
│   ├── organisms/      # AppSidebar, layout/ — componentes com lógica/contexto
│   │   └── layout/     # DashboardTemplate (shell responsivo)
│   └── ui/             # shadcn/ui components (dialog, select, popover, etc.)
├── contexts/
│   ├── AuthContext.tsx  # session, user, profile, households[], activeHouseholdId, householdId (alias), setActiveHouseholdId, setLocale, signOut
│   └── ThemeContext.tsx # light/dark com persistência em localStorage
├── api/                # Funções assíncronas puras (sem React), uma por entidade — ex: bills.ts
├── queries/            # React Query hooks que chamam api/, uma por entidade — ex: bills.ts
├── queries/keys.ts     # Factory de query keys com hierarquia all/list/summary
├── hooks/              # Apenas hooks sem dados (ex: use-mobile.tsx)
├── i18n/
│   ├── index.ts        # configuração do i18next
│   └── locales/        # pt-BR.json, en.json
├── lib/
│   ├── currency.ts     # formatBRL(), parseBRL(), compactBRL()
│   ├── date.ts         # toISODate(), formatMonth(), getDaysUntilDue()
│   └── utils.ts        # cn() (clsx + tailwind-merge)
├── pages/              # Uma página por rota
├── routes/             # TanStack Router file-based routes
├── services/
│   └── supabase.ts     # Cliente Supabase tipado
└── types/
    └── database.types.ts  # Tipos gerados pelo Supabase CLI
```

---

## Entidades e Responsabilidades

### `households`
O **lar** — unidade de multi-tenancy. Todo dado financeiro pertence a um household.
- Um usuário pode pertencer a múltiplos households (via `household_memberships`)
- `householdId` é o principal escopo de todas as queries

### `profiles`
Extensão do usuário Supabase Auth. Criado automaticamente via trigger ao signup.
- Armazena: `full_name`, `avatar_url`, `locale` (pt-BR | en, default pt-BR)
- `id` = `auth.users.id` (1:1)

### `household_memberships`
Tabela pivot: relaciona `profiles` ↔ `households` com `role` (owner/member).
- Criada no setup inicial e ao aceitar convites
- RLS usa `my_household_ids()` helper que consulta esta tabela

### `household_invites`
Convites por email para entrar em um household existente.
- `token`: UUID gerado automaticamente (unique)
- `accepted_at`: timestamp de aceite (NULL = pendente)
- `expires_at`: 7 dias após criação
- Criados pela Edge Function `send-invite-email` (não insert direto do frontend)
- Aceitos via `AcceptInvitePage` (`/accept-invite?token=xxx`)

### `categories`
Categorias de transações/bills/budgets do household.
- `type`: `income` | `expense` | `both`
- `color`: hex string para identificação visual
- Categorias padrão são criadas automaticamente via trigger ao criar um household

### `transactions`
**Entidade central** — cada gasto ou receita registrado.
- `type`: `income` | `expense`
- `date`: data da ocorrência (não de criação)
- `created_by`: UUID do usuário que criou (referência `auth.users`, sem FK explícita)
- `person_id`: UUID de quem realizou o gasto (FK → `profiles`, nullable) — para relatórios por pessoa
- Pode ter `category_id` (opcional)
- Pode ser parcelado via `installment_group_id`

### `installment_groups`
Agrupa transações de um parcelamento (ex: 12x de R$100).
- Cada parcela é uma `transaction` separada com `installment_number` e `installment_total`

### `transaction_members`
Tabela pivot para rateio de transações entre membros (divisão de despesas).

### `goals`
Metas de poupança com progresso.
- `target_amount`: valor alvo
- `current_amount`: atualizado automaticamente via trigger ao inserir `goal_contributions`
- `target_date`: prazo opcional
- `color`: cor de identificação
- `is_completed`: marcado quando `current_amount >= target_amount`

### `goal_contributions`
Cada aporte em uma meta.
- Ao inserir/deletar, trigger atualiza `goals.current_amount`

### `budgets`
Limite de gasto mensal por categoria.
- Escopo: `(household_id, category_id, month, year)` — único por mês
- Spending calculado via query de `transactions` filtrada pelo mesmo mês/ano/categoria

### `bills`
Contas fixas e recorrentes.
- `due_day`: dia do mês do vencimento (1–31)
- `is_active`: toggle para pausar sem excluir
- `reminder_days_before`: INT nullable — NULL = sem lembrete; valor = dias antes do vencimento para enviar email
- `reminder_last_sent_at`: TIMESTAMPTZ — evita envios duplicados no mesmo mês
- **Sem relação direta com transactions** — são definições estáticas; lançamento de transaction é sempre manual
- Dashboard exibe contas com `getDaysUntilDue() <= 7`

---

## Features — Como Funcionam

### Autenticação
- Email/senha + OAuth (Google, Apple) via Supabase Auth
- Pós-login: verifica `household_memberships`
  - Se houver membership → carrega `householdId` → vai para `/` (ou `redirect` param)
  - Se não houver → vai para `/setup` para criar ou entrar em um lar
- Email não confirmado: mensagem de alerta com opção de reenviar confirmação
- Rotas `/login` e `/register` aceitam `?redirect=` para pós-auth navigation (usado pelo fluxo de convite)

### Multi-Household
- Um usuário pode pertencer a múltiplos lares (como owner ou member)
- `AuthContext` expõe `households[]`, `activeHouseholdId`, `setActiveHouseholdId`
- `householdId` é alias de `activeHouseholdId` para compatibilidade com hooks existentes
- Lar ativo persiste em `localStorage` key `hf:activeHouseholdId`
- Trocar lar chama `queryClient.invalidateQueries()` (sem filtro = invalida tudo)
- `HouseholdSwitcher` no `AppSidebar` permite trocar entre lares
- `HouseholdPage` permite criar novo lar e ver todos os lares do usuário

### i18n
- Idiomas suportados: `pt-BR` (padrão) e `en`
- Locale persistido em `profiles.locale` no banco
- `AuthContext.setLocale()` atualiza banco + estado + chama `i18n.changeLanguage()`
- Ao carregar perfil, `i18n.changeLanguage(profile.locale)` é chamado automaticamente
- Seletor de idioma em Settings (`/settings`) seção "Idioma"
- Componentes usam `useTranslation()` hook para strings da UI

### Convite por Email
- Flow: `HouseholdPage` chama Edge Function `send-invite-email` (não insert direto)
- Edge Function valida que caller é owner, cria registro em `household_invites`, envia email via Resend
- Email contém link `{APP_URL}/accept-invite?token={token}`
- `AcceptInvitePage`: se autenticado → aceita diretamente; se não → mostra login/register com token preservado no `redirect` param
- Env vars necessárias: `RESEND_API_KEY`, `APP_URL`

### Lembretes de Contas a Pagar (Cron)
- Edge Function: `supabase/functions/send-bill-reminders/index.ts`
- Roda via cron diário — sem JWT do usuário; usa `SUPABASE_SERVICE_ROLE_KEY`
- Busca bills ativos com `reminder_days_before IS NOT NULL`, calcula dias até vencimento, envia email se hoje == `reminder_days_before` e ainda não enviou neste mês
- Busca emails dos membros via `supabase.auth.admin.getUserById()` (profiles não armazena email)
- Usa helper compartilhado `supabase/functions/_shared/resend.ts`
- Env vars necessárias: `RESEND_API_KEY`, `APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Setup do cron (passo manual no Supabase Dashboard):**
1. Dashboard → Edge Functions → `send-bill-reminders` → Schedules → Add Schedule
2. Expressão cron: `0 11 * * *` (08:00 BRT / 11:00 UTC)
3. Não requer body ou headers — a função ignora o request

### Provedor de Email (Resend)
- Resend é o único provedor de email do projeto
- Helper compartilhado: `supabase/functions/_shared/resend.ts` — usado por todas as Edge Functions que enviam email
- Free tier: 3.000 emails/mês, 100/dia — suficiente para uso pessoal
- Se `RESEND_API_KEY` não estiver setada, o helper loga um warning e pula o envio (dev-friendly)
- From address: `Home Finances <noreply@homefi.app>`

### Dashboard (`/`)
- Cards de resumo mensal (receitas, despesas, saldo)
- Últimas 5 transações
- Contas próximas a vencer (≤7 dias)
- Atalhos rápidos para lançar transação

### Transações (`/transactions`)
- Filtros por mês, tipo e categoria
- TanStack Table com colunas: data, descrição, pessoa, categoria, tipo, valor, ações
- Coluna "Pessoa" ocultada quando household tem só 1 membro
- Sheet lateral para criar/editar (não dialog — para facilitar mobile)
- `person_id`: quem realizou (≠ `created_by` que é quem lançou no sistema)

### Categorias (`/categories`)
- CRUD simples com seletor de cor e tipo
- `key={editing?.id ?? 'new'}` garante remontagem ao trocar entre criar/editar

### Orçamentos (`/budgets`)
- Navegação por mês/ano
- Spending calculado dinamicamente via query de transactions
- Edição de orçamento desabilita o campo de categoria (imutável após criado)

### Metas (`/goals`)
- Progress bar com `current_amount / target_amount`
- Contribuições via dialog secundário com DatePicker
- `target_date` opcional (clearable DatePicker)
- Badge "Concluída" quando `is_completed = true`

### Contas a Pagar (`/bills`)
- Separadas em "Ativas" / "Inativas"
- Toggle de ativo/inativo inline via Switch
- Alertas visuais amber para vencimentos próximos (≤7 dias)
- Lembrete por email configurável por conta (`reminder_days_before`): 1, 3, 7 ou 15 dias antes
- **Não geram transactions automaticamente** — lançamento é sempre manual

### Relatórios (`/reports`)
- Toggle mensal/anual
- **Vista mensal**: bar chart rolling de 6 meses + pie chart por categoria + gasto por pessoa
- **Vista anual**: bar chart dos 12 meses + cards de totais + navegação de ano
- Gasto por pessoa usa `person_id` (não `created_by`)
- Empty state em "Por pessoa" explica como atribuir transações

### Layout Responsivo
- **Desktop (md+)**: sidebar permanente à esquerda
- **Mobile**: top bar com hamburguer → Sheet drawer com mesmo `AppSidebar`
- `DashboardTemplate` gerencia `mobileSidebarOpen` state
- `AppSidebar` recebe `onClose` para fechar drawer ao navegar

---

## Padrões de Desenvolvimento

### Camadas de Dados (api/ + queries/)
- **`src/api/`**: funções assíncronas puras — sem React, sem hooks. Recebem todos os parâmetros explicitamente (householdId, userId, payload). Apenas chamadas Supabase.
- **`src/queries/`**: hooks React Query que chamam `api/` e obtêm contexto de `useAuth()`. Um arquivo por entidade.
- **`src/queries/keys.ts`**: factory de query keys com hierarquia `all/list/summary` para invalidação por prefixo.
- Nomenclatura: `useEntityName()` (list), `useCreateEntity()`, `useUpdateEntity()`, `useDeleteEntity()`
- Invalidar queries relevantes nas mutations via `queryClient.invalidateQueries({ queryKey: queryKeys.entity.all(householdId) })`

### Formulários
- React Hook Form + Zod sempre
- Para campos de data: `Controller` + `DatePicker` (nunca `<Input type="date">`)
- Para selects controlados: `value={watch('field')}` + `onValueChange={(v) => setValue('field', v)}`
- Remontagem ao trocar criar/editar: `key={editing?.id ?? 'new'}` no componente de dialog/sheet

### Componentes UI (shadcn/Radix UI)
- Todos em `src/components/ui/` usando Radix UI (`@radix-ui/react-*`) como primitivo
- Usar pacotes individuais (ex: `@radix-ui/react-dialog`), não o umbrella `radix-ui`
- Animações via `data-[state=open]` / `data-[state=closed]` com `animate-in`/`animate-out` do Tailwind
- Estado checked via `data-[state=checked]` (padrão Radix)
- `SelectContent` aceita `position` prop (`popper` | `item-aligned`) — preservado para compatibilidade
- `PopoverContent` renderiza via Portal por padrão — sem necessidade de hack z-index

### Banco de Dados
- Migrations em `supabase/migrations/` com prefixo numérico: `000N_nome.sql`
- RLS habilitado em todas as tabelas
- Usar `my_household_ids()` helper nas políticas RLS
- Triggers para `updated_at` em todas as tabelas mutáveis
- Usar Supabase MCP (`apply_migration`) para aplicar migrations — não rodar SQL direto

### TypeScript
- Tipos de banco em `src/types/database.types.ts` (gerados via `npm run db:types`)
- Usar `Tables<'tabela'>`, `TablesInsert<'tabela'>`, `TablesUpdate<'tabela'>` do Supabase
- Tipos derivados com joins: `type Bill = Tables<'bills'> & { categories: {...} | null }`

### Formatação
- Moeda: sempre `formatBRL()` de `src/lib/currency.ts`
- Datas: `date-fns` com locale `ptBR` da `date-fns/locale`
- ISO dates para banco: `format(date, 'yyyy-MM-dd')`
- Exibição de datas: `format(parseISO(str), "dd 'de' MMM yyyy", { locale: ptBR })`

### Segurança
- Nunca expor service_role key no frontend
- Usar apenas `anon` key (variável `VITE_SUPABASE_ANON_KEY`)
- Todo acesso ao banco via Supabase PostgREST com RLS ativo
- `household_id` nunca vem do frontend diretamente em inserts — sempre do `useAuth()`

---

## Variáveis de Ambiente

```env
# Frontend (Vite)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Edge Functions (Supabase Dashboard → Settings → Edge Functions)
RESEND_API_KEY=re_xxxx
APP_URL=https://yourdomain.com
# SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente pelo Supabase
```

---

## Comandos Úteis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção (TypeScript check + Vite)
npm run lint         # ESLint
npm run format       # Prettier
npm run db:types     # Regenerar tipos do banco
npm run db:push      # Aplicar migrations pendentes
```

---

## Problemas Conhecidos / Decisões de Design

1. **`created_by` vs `person_id`**: `transactions.created_by` referencia `auth.users` (sem FK explícita) — é quem *registrou* a transação. `person_id` (FK → `profiles`) é quem *realizou* o gasto. Relatórios por pessoa usam `person_id`.

2. **Bills ≠ Transactions**: Contas a pagar são definições de despesas recorrentes, não lançamentos reais. O lançamento como transaction é sempre manual — sem auto-lançamento.

3. **Supabase MCP**: O Bash tool pode ser não-funcional no ambiente Windows/MINGW. Usar o MCP do Supabase para migrations e o Write/Edit tool para código.

4. **Register + redirect**: Após cadastro com `?redirect=`, o usuário precisa confirmar email antes de logar. A tela de confirmação exibe link para o destino (ex: aceitar convite) para que o usuário possa navegar após confirmar.
