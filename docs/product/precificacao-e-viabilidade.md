# Precificação e Viabilidade Comercial — Larmony

> **Data da análise:** 2026-07-11 · **Base:** commit `e2e4cbd` (branch `development`)
> **Cenário comercial definido pelo responsável:** o Larmony **não será vendido como projeto**.
> Será operado como **SaaS próprio B2C** (assinaturas por lar). A análise, portanto, cobre:
> (a) o **valor do ativo já construído** (custo de reprodução — referência de valuation);
> (b) o **investimento restante até o lançamento comercial**;
> (c) os **custos recorrentes de operação**;
> (d) a **validação do pricing de assinatura** e o **ponto de equilíbrio**.
>
> **Moeda:** BRL. **Taxa horária de referência:** cenários de **R$ 90 / R$ 135 / R$ 180 por hora**
> (faixas típicas de mercado BR para desenvolvimento sênior/consultoria, definidas pelo responsável).
> **Premissa cambial** (só para converter preços de serviços em USD): US$ 1 ≈ R$ 5,50.
>
> Este documento **não é aconselhamento jurídico, tributário ou de investimento**. Alíquotas e
> cláusulas devem ser validadas com contador e advogado.

---



## 1. Resumo executivo

**O que é.** Controle financeiro doméstico **multi-usuário** — o "lar" (household) é o tenant,
com isolamento por RLS no Postgres. Diferencial competitivo declarado e implementado: gestão
financeira **compartilhada** com **rateio automático de despesas entre membros** e parcelamento,
algo que os concorrentes B2C brasileiros (ex.: Organizze, Mobills) não entregam. Não é greenfield:
é o **replatforming de um produto já validado** (`old-larmony`, que rodou em produção) sobre
arquitetura nova (NestJS Clean Architecture + Next.js + Supabase/RLS + Railway).

**Estado atual.** O produto v1 + v1.1 está **funcionalmente completo até o milestone M12**
(households, convites, categorias, transações com parcelas e rateio, dashboard, orçamentos
versionados, metas, lançamentos programados com engine de recorrência, relatórios, notificações
multicanal i18n, cron com timezone por lar). Staging está **verde no Railway**; produção ainda
não foi provisionada. ~32 mil linhas de código de produto (13,8k backend + 17,8k frontend),
25 ADRs, 13 specs e2e de backend + 7 unit + 11 specs Playwright de frontend.

**A lacuna crítica é monetização:** o **billing (Stripe) é apenas um shell** — existe a tabela
`subscriptions`, mas zero módulo NestJS, telas "Em breve" e a landing anuncia todos os planos
como grátis, apesar do pricing já decidido em ADR (Premium R$ 14,90/mês; tier "Conectado" com
Open Finance a R$ 29,90–44,90/mês). **Sem billing não há receita.**

**Complexidade.** Alta no que já foi construído (multi-tenancy RLS de produção, engine de
recorrência com fuso, dispatcher de notificações); **média** no que falta para lançar (billing
Stripe é trabalho conhecido e bem delimitado).

**Principais riscos:** dependência de uma única pessoa (bus factor 1), testes fora do gate de CI,
LGPD/termos não endereçados formalmente (dados financeiros são sensíveis), custo fixo do agregador
de Open Finance (piso Pluggy R$ 2.500/mês — corretamente desacoplado com gatilho no ADR-0025),
e risco de mercado (CAC/churn em B2C financeiro é o maior determinante do resultado — fora do
alcance desta análise técnica).

**Números-chave (detalhados nas seções 6, 7 e 9):**


| Métrica                                          | Faixa                                            | Confiança                    |
| ------------------------------------------------ | ------------------------------------------------ | ---------------------------- |
| Valor de reprodução do ativo atual               | **R$ 135k – 270k** (central ~R$ 200k @ R$ 135/h) | Média                        |
| Esforço restante até o lançamento comercial      | **~310 h PERT** (180–520 h)                      | Média-alta                   |
| Investimento restante (com contingência 25%)     | **R$ 35k – 70k** (central ~R$ 52k)               | Média                        |
| Custo fixo mensal de operação (pré-Open Finance) | **R$ 350 – 800/mês**                             | Média                        |
| Ponto de equilíbrio operacional                  | **~30–60 lares Premium** (R$ 14,90)              | Média                        |
| Gatilho Open Finance (já decidido, ADR-0025)     | ~150–200 lares Premium ou tier próprio ~80 lares | Alta (é decisão documentada) |


**Modelo comercial recomendado:** confirmar o já decidido — **SaaS freemium B2C por lar**,
Premium R$ 14,90/mês, Open Finance como **tier separado** (nunca embutido no Premium), via Stripe.

**Nível de confiança geral da análise: médio-alto** para escopo/estado/esforço restante (baseado
em evidência direta do código); **médio** para valores de reprodução; **baixo-médio** para
projeções de receita (dependem de CAC/churn, não observáveis no repositório).

---



## 2. Evidências analisadas


| Fonte                                                                                                                                          | O que sustenta                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `.memory/roadmap.md`                                                                                                                           | Milestones M1–M12 concluídos; M13 em espera com gatilho; billing como próximo milestone técnico             |
| `.memory/adr/` (25 ADRs, em especial 0003, 0005, 0011, 0015, 0017, 0020, 0023, 0024, 0025)                                                     | Decisões de arquitetura, deploy, dinheiro em centavos, unificação de recorrências, Open Finance desacoplado |
| `docs/product/visao-e-dominio-v1.md` + `docs/product/features/01..14`                                                                          | Escopo funcional alvo e specs por milestone                                                                 |
| `docs/product/features/14-open-finance.md`                                                                                                     | Tabela de custos de agregadores (Pluggy R$ 2.500/mês etc.), unit economics, fases do M13                    |
| `apps/backend/src/` (~306 arquivos TS, ~13,8k LOC)                                                                                             | 15 módulos, 74 rotas em 14 controllers, Clean Architecture, RLS request-scoped com 2 pools                  |
| `apps/backend/src/database/`                                                                                                                   | 9 migrations up/down, migrator custom, 16 arquivos de schema (~15 tabelas ativas)                           |
| `apps/backend/test/` (13 specs e2e) + 7 `.spec.ts` unit                                                                                        | Cobertura real de scheduled-transactions, rateio, RLS, budgets, reports                                     |
| `apps/frontend/src/` (~240 arquivos, ~17,8k LOC)                                                                                               | 15 features, 25 componentes UI, i18n pt-BR/en/es, React Query + query-keys, telemetria                      |
| `apps/frontend/e2e/` (11 specs Playwright)                                                                                                     | Fluxos principais testados ponta a ponta                                                                    |
| `apps/backend/src/database/schema/subscriptions.ts`                                                                                            | Shell de billing (colunas Stripe sem código que as use)                                                     |
| `apps/frontend/src/pages/households/[householdSlug]/settings/subscription.tsx`, `admin/billing.tsx`, `features/landing/components/pricing.tsx` | Telas de billing placeholder; landing anuncia planos grátis                                                 |
| `.github/workflows/ci.yml`                                                                                                                     | CI roda types+lint+build; **não roda testes** (TODO DX-3)                                                   |
| `docs/deployment.md`, `railway.json`, `Dockerfile`s, `.env.example`s                                                                           | Topologia Railway staging/prod, cron `*/15`, migrations no boot                                             |
| Histórico git                                                                                                                                  | 88 commits, 2026-07-04 → 2026-07-11 (8 dias corridos)                                                       |


**Fatos vs. inferências vs. premissas** — ao longo do documento:
**[F]** = fato observado no repositório · **[I]** = inferência a partir de evidências ·
**[P]** = premissa/cenário assumido na ausência de informação.

---



## 3. Escopo identificado — inventário funcional

Estados usados: *Pronto p/ produção · Implementado e testado · Implementado sem validação ·
Parcial · Estrutura inicial · Não iniciado*. Esforço = horas restantes (0 quando concluído).


| #        | Funcionalidade                                                                                      | Estado                                                                               | Complexidade | Criticidade                    | Risco técnico                 | Esforço restante                      |
| -------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------ | ------------------------------ | ----------------------------- | ------------------------------------- |
| M1       | Households (tenancy, convites, membros, transferência, switcher, onboarding, landing)               | Implementado e testado (e2e)                                                         | Alta         | Alta                           | Baixo                         | 0                                     |
| M2       | Categorias + Transações (CRUD)                                                                      | Implementado e testado                                                               | Média        | Alta                           | Baixo                         | 0                                     |
| M3       | Dashboard (KPIs, trends, resumos)                                                                   | Implementado e testado                                                               | Média        | Alta                           | Baixo                         | 0                                     |
| M4       | Parcelamento + Rateio entre membros                                                                 | Implementado e testado (e2e 220L)                                                    | Alta         | Alta                           | Baixo                         | 0                                     |
| M6       | Metas + contribuições                                                                               | Implementado e testado                                                               | Média        | Média                          | Baixo                         | 0                                     |
| M8       | Relatórios mensal/anual (+ envio por e-mail)                                                        | Implementado e testado                                                               | Média        | Média                          | Baixo                         | 0                                     |
| ADR-0020 | Lançamentos programados (unifica contas a pagar + recorrências; engine no cron)                     | Implementado e testado (e2e 451L + unit)                                             | Muito alta   | Alta                           | Médio (engine de datas/fuso)  | 0                                     |
| M10      | Orçamentos recorrentes/versionados                                                                  | Implementado e testado                                                               | Alta         | Média                          | Baixo                         | 0                                     |
| M11      | Notificações multicanal (in-app + e-mail; dedup; preferências; i18n render-at-send)                 | Implementado e testado                                                               | Alta         | Média                          | Baixo                         | 0 (SMS/WhatsApp = stubs intencionais) |
| M12      | Cron com timezone + hora preferida por lar                                                          | Implementado e testado                                                               | Alta         | Média                          | Médio (fusos)                 | 0                                     |
| —        | Auth (signup/login/refresh/recuperação/avatar/exclusão de conta)                                    | Implementado e testado                                                               | Média        | Alta                           | Médio (token em localStorage) | 4–8 h (revisão)                       |
| —        | Painel admin de plataforma (stats, users, households, audit, suspensão)                             | Implementado sem validação (sem testes dedicados)                                    | Média        | Baixa                          | Baixo                         | 8–16 h (validação)                    |
| —        | i18n do app (pt-BR/en/es)                                                                           | **Parcial** — infra completa; só dashboard+login traduzidos; e-mails hardcoded pt-BR | Média        | Média                          | Baixo                         | 24–70 h                               |
| **B1**   | **Billing/entitlements (Stripe): checkout, webhooks, portal, gating por plano, trial/grace, telas** | **Estrutura inicial (shell)** [F]                                                    | **Alta**     | **CRÍTICA — bloqueia receita** | Médio (webhooks/idempotência) | **60–150 h**                          |
| **B2**   | Landing/pricing alinhada aos planos pagos + paywall UX                                              | Parcial (landing anuncia tudo grátis) [F]                                            | Baixa        | Alta                           | Baixo                         | 12–36 h                               |
| **M13**  | **Open Finance (agregador: conexão, importação, sync, conciliação)**                                | **Não iniciado** (zero código) [F]; decisão de espera com gatilho [F, ADR-0025]      | Muito alta   | Baixa hoje / alta no futuro    | Alto (terceiro, custo fixo)   | **130–360 h** (opcional, pós-gatilho) |
| —        | SMS/WhatsApp (Twilio etc.)                                                                          | Não iniciado (portas + noop stubs) [F]                                               | Média        | Baixa                          | Médio                         | Fora do escopo v1                     |
| —        | Permissões por módulo                                                                               | Não iniciado (coluna reservada; só roles owner/member) [F]                           | Média        | Baixa                          | Baixo                         | Fora do escopo v1                     |


**[I]** O núcleo do produto está pronto; o caminho crítico para receita é exclusivamente
**B1 + B2** mais o hardening de produção (seção 4).

---



## 4. Estado atual do projeto

**Pronto (implementado, testado, com deploy de staging verde):**
todo o núcleo M1–M12 listado acima; pipeline CI (types+lint+build); deploy config-as-code
(Railway + Dockerfiles + migrations no boot); telemetria Better Stack integrada; auditoria;
seed de dev; RAG/memória de engenharia.

**Parcial:**

- i18n: infraestrutura trilíngue completa, rollout de telas incompleto; e-mails só pt-BR [F].
- Documentação de setup: `.memory/` e `docs/` internos são excelentes, mas o `README.md` raiz
ainda é o template do Turborepo [F].
- Notificações: canais in-app + e-mail reais; SMS/WhatsApp são stubs [F].

**Ausente:**

- Billing/entitlements (Stripe) — shell sem código [F]. **Bloqueia o modelo de negócio.**
- Open Finance — zero código [F]; deliberadamente adiado com gatilho [F].
- Fila/broker de mensageria (assíncrono é in-process + cron pull) [F] — adequado à escala
inicial [I], limite conhecido para escala futura.

**Implementado sem validação:**

- Painel admin e módulos mail/audit não têm testes dedicados [F].
- Testes existem mas **não são gate de CI** [F] — qualquer regressão passa no pipeline hoje.

**Necessário para produção (mesmo sem billing):**

1. Provisionar ambiente de produção (Railway env `production` + Supabase pago) — hoje intocado [F].
2. Trocar a senha `app_user_dev` da migration 0003 em produção [F — gotcha documentado].
3. Ativar testes no CI (o TODO DX-3 está desatualizado: a suíte já existe) [F].
4. Rotina de backup/restore verificada + runbook de operação (não evidenciados no repo) [I].
5. LGPD: política de privacidade, termos de uso, consentimento — nada encontrado no repo [F];
  exclusão de conta já existe no backend [F], o que ajuda no direito de eliminação.
6. Decisão consciente sobre sessão em localStorage (XSS) vs. cookie httpOnly [F/I].

---



## 5. Avaliação de maturidade (0–5)


| Dimensão            | Nota    | Justificativa                                                                                                                                                                                                                |
| ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitetura         | **5**   | Clean Architecture consistente em 15 módulos, um use-case por operação, portas/adaptadores, monorepo disciplinado, 25 ADRs. Acima da média de mercado.                                                                       |
| Qualidade do código | **4,5** | TS strict total (`noUncheckedIndexedAccess`), lint `--max-warnings 0` no CI, débito visível baixíssimo (1 TODO de produto). Desconto meio ponto por shells herdados e migrations não squashadas.                             |
| Segurança           | **4**   | Defense-in-depth raro em produto desse porte: guards + RLS `NOBYPASSRLS` com 2 pools e `set_config` por request; teste e2e de isolamento entre lares. Descontos: token em localStorage, senha dev em migration, sem pentest. |
| Banco de dados      | **4**   | Modelagem coerente (centavos inteiros, versionamento de orçamento), 9 migrations com down, migrator custom com rollback. Desconto: sem evidência de índices revisados p/ volume nem teste de restore.                        |
| Testes              | **3**   | Suíte real e bem dirigida (e2e de RLS, rateio, engine 451L; Playwright no front), mas **fora do gate de CI**, sem unit no frontend, admin/mail sem cobertura.                                                                |
| Infraestrutura      | **3,5** | Staging verde, config-as-code, healthcheck, migrations no boot. Produção não provisionada; réplica única; sem estratégia de fila.                                                                                            |
| Observabilidade     | **3**   | Better Stack front+back, filtro global de exceções, audit log. Sem APM/métricas de negócio/alertas configurados como código.                                                                                                 |
| Documentação        | **4**   | Interna excepcional (`.memory/`, ADRs, specs, deployment passo a passo). README raiz é template; sem doc de operação/suporte para terceiros.                                                                                 |
| UX/UI               | **4**   | Design system próprio com tokens, mobile-first evidente, estados loading/empty/erro em 35+ arquivos, onboarding guiado, landing 3D. Dark-only (decisão); i18n incompleto nas telas.                                          |
| Performance         | **3**   | Sem gargalos evidentes na escala alvo; cache in-memory; React Query bem configurado. Sem load test, sem broker, `numReplicas: 1`. Nota reflete "não verificado", não "ruim".                                                 |
| Operação            | **2**   | Sem runbook de incidentes, backup/restore não demonstrado, suporte a usuário final inexistente (esperado pré-lançamento).                                                                                                    |
| Compliance          | **1,5** | Nada de LGPD/termos/privacidade no repo, tratando **dados financeiros** (sensíveis). Exclusão de conta e audit log existem (base boa). É a dimensão mais defasada em relação ao lançamento.                                  |


**Média ponderada informal: ~3,5/5** — perfil típico de produto **pré-lançamento saudável**:
engenharia acima da média, operação/compliance abaixo (ainda não exercitadas).

---



## 6. Estimativa de esforço (PERT)

Fórmula: `PERT = (Otimista + 4×Provável + Pessimista) / 6`. Horas de **uma pessoa sênior**.
**[P]** Estimativas assumem o padrão de produtividade convencional de mercado (com IA como
ferramenta de apoio, não como multiplicador extremo) — ver nota honesta em 6.1.

### 6.1 Esforço já representado pelo ativo atual (custo de reprodução)

**Nota metodológica honesta:** o repositório mostra **[F]** 88 commits em 8 dias corridos —
desenvolvimento fortemente acelerado por IA. O custo *incorrido* real, portanto, foi muito menor
que o valor abaixo. A tabela estima **o que custaria reproduzir o ativo contratando
desenvolvimento convencional** — é a referência correta para valuation do ativo, não para
contabilizar gasto passado.


| Disciplina                                                              | Otimista | Provável  | Pessimista | PERT         | Confiança |
| ----------------------------------------------------------------------- | -------- | --------- | ---------- | ------------ | --------- |
| Backend (15 módulos, 74 rotas, engine recorrência, notificações, admin) | 350      | 500       | 750        | **517**      | Média     |
| Frontend (15 features, dashboard, i18n, onboarding, admin, landing 3D)  | 350      | 500       | 750        | **517**      | Média     |
| Banco de dados (modelagem, RLS 2-pools, 9 migrations, migrator)         | 60       | 90        | 140        | **93**       | Média     |
| UX/UI (design system, tokens, 25 componentes, landing)                  | 80       | 120       | 200        | **127**      | Média     |
| Infra/DevOps (Railway, Docker, CI, cron, telemetria)                    | 30       | 50        | 80         | **52**       | Alta      |
| QA/testes existentes (13 e2e + 7 unit + 11 Playwright)                  | 60       | 90        | 140        | **93**       | Média     |
| Documentação/arquitetura/gestão (25 ADRs, specs, roadmap)               | 60       | 100       | 160        | **103**      | Média     |
| **Total reprodução**                                                    | **990**  | **1.450** | **2.220**  | **~1.500 h** | **Média** |


**Valor de reprodução:** 1.500 h × R$ 90–180/h ⇒ **R$ 135k – 270k** (central **~R$ 202k** @ R$ 135/h).
Intervalo completo (otimista×piso a pessimista×teto): R$ 89k – 400k. **[I]** Como o domínio já
vinha validado do `old-larmony`, uma equipe nova sem esse conhecimento tenderia ao lado alto.

### 6.2 Esforço para conclusão + produção (caminho crítico do lançamento)


| Disciplina             | Escopo                                                                                                             | Otim.   | Prov.   | Pess.   | PERT       | Principais incertezas                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ------- | ------- | ------- | ---------- | -------------------------------------------------------------------------- |
| Billing backend        | Módulo Stripe: checkout, webhooks idempotentes, portal, entitlements/gating, trial/grace, sync com `subscriptions` | 40      | 60      | 100     | **63**     | Edge cases de webhook, dunning, mudança de plano                           |
| Billing frontend       | Telas subscription/billing reais, paywall, gating de UI, admin billing                                             | 20      | 30      | 50      | **32**     | UX de upgrade/downgrade                                                    |
| Landing/pricing        | Alinhar planos pagos decididos (R$ 14,90 / tier Conectado), waitlist → conversão                                   | 12      | 20      | 36      | **21**     | Copy/posicionamento                                                        |
| i18n rollout           | Traduzir telas restantes + e-mails localizados (ADR-0018 pendente p/ e-mails)                                      | 24      | 40      | 70      | **42**     | Volume de strings; pode ser cortado do MVP de lançamento (lançar só pt-BR) |
| QA                     | Testes no CI (gate), e2e de billing, smoke de produção                                                             | 12      | 20      | 40      | **22**     | Flakiness dos e2e no CI                                                    |
| Segurança              | Senha `app_user` de prod, secrets, revisão de sessão (localStorage vs cookie), headers, rate limits                | 16      | 28      | 48      | **29**     | Decisão sobre storage do token                                             |
| Compliance LGPD        | Política de privacidade, termos, consentimento, fluxo de exportação de dados                                       | 16      | 28      | 56      | **31**     | Exige revisão jurídica externa (custo à parte)                             |
| Infra produção         | Provisionar env prod (Railway+Supabase), domínio, backups + teste de restore, runbook                              | 12      | 20      | 36      | **21**     | Primeira ativação do ambiente                                              |
| Homologação/beta       | Beta fechado com lares reais, correções de fricção                                                                 | 12      | 20      | 32      | **21**     | Feedback imprevisível                                                      |
| Documentação           | README real, doc de setup/operação/suporte                                                                         | 8       | 12      | 24      | **13**     | —                                                                          |
| Gestão/alinhamentos    | Planejamento, revisões (reduzido: time solo)                                                                       | 8       | 16      | 28      | **17**     | —                                                                          |
| **Total até produção** |                                                                                                                    | **180** | **294** | **520** | **~312 h** | **Confiança média-alta**                                                   |




### 6.3 Esforço pós-lançamento (primeiros 90 dias)


| Disciplina                                                 | Otim. | Prov. | Pess. | PERT    |
| ---------------------------------------------------------- | ----- | ----- | ----- | ------- |
| Estabilização, bugfix, suporte inicial, ajustes de billing | 40    | 80    | 140   | **~83** |


Depois disso, **[P]** regime de manutenção estimado em **10–25 h/mês** (correções, dependências,
pequenas evoluções) enquanto a base for pequena.

### 6.4 M13 Open Finance (módulo opcional, pós-gatilho)


| Fase          | Escopo                                              | Otim.   | Prov.   | Pess.   | PERT       |
| ------------- | --------------------------------------------------- | ------- | ------- | ------- | ---------- |
| 0             | PoC com agregador (trial Pluggy/Meu Pluggy)         | 16      | 24      | 40      | **25**     |
| 1             | Conexão + importação inicial                        | 40      | 70      | 110     | **72**     |
| 2             | Sync contínuo + conciliação com lançamentos manuais | 50      | 80      | 130     | **83**     |
| 3             | Rateio/notificações sobre transações importadas     | 20      | 35      | 60      | **37**     |
| **Total M13** |                                                     | **126** | **209** | **340** | **~217 h** |


Confiança **baixa-média** (depende do agregador escolhido e da qualidade dos dados dos bancos).
**Não incluir no investimento de lançamento** — decisão correta já registrada no ADR-0025.

---



## 7. Custos



### 7.1 Custos de implementação (esforço restante × taxa)


| Cenário  | Base (312 h) | + Contingência 25% (≈390 h) | Valor       |
| -------- | ------------ | --------------------------- | ----------- |
| R$ 90/h  | R$ 28.080    | R$ 35.100                   | **~R$ 35k** |
| R$ 135/h | R$ 42.120    | R$ 52.650                   | **~R$ 53k** |
| R$ 180/h | R$ 56.160    | R$ 70.200                   | **~R$ 70k** |


**[I]** Se o próprio responsável executa (sem desembolso), isso é **custo de oportunidade**,
não caixa — mas deve entrar em qualquer conta de retorno do projeto.
Pós-lançamento (90 dias, ~~83 h): +R$ 7,5k / 11k / 15k conforme a taxa.
M13 Open Finance (~~217 h): +R$ 19,5k / 29k / 39k — somente após o gatilho.

### 7.2 Custos de infraestrutura

**Iniciais (one-off):**


| Item                    | Custo                        | Nota                                             |
| ----------------------- | ---------------------------- | ------------------------------------------------ |
| Domínio larmony.me      | ~R$ 170–280/ano              | **[F]** domínio já existe e verificado no Resend |
| Setup ambiente produção | 0 (horas já contadas em 6.2) | Railway/Supabase não cobram setup                |


**Recorrentes mensais (pré-Open Finance)** — **[P]** preços de tabela dos provedores em 2026,
convertidos a R$ 5,50/US$; validar na contratação:


| Serviço                                                   | Cenário enxuto             | Cenário base    | Variável por consumo          |
| --------------------------------------------------------- | -------------------------- | --------------- | ----------------------------- |
| Railway (prod: backend+frontend+cron; staging leve)       | ~R$ 60                     | ~R$ 160         | por uso de CPU/RAM/egress     |
| Supabase (prod Pro; staging free) [F: topologia ADR-0011] | ~R$ 140                    | ~R$ 140         | storage/MAU acima do incluído |
| Resend                                                    | R$ 0 (free 3k e-mails/mês) | ~R$ 110         | por volume de e-mails         |
| Better Stack                                              | R$ 0 (free tier)           | ~R$ 140         | por volume de logs            |
| Domínio (rateado)                                         | ~R$ 20                     | ~R$ 20          | —                             |
| **Total infra**                                           | **~R$ 220/mês**            | **~R$ 570/mês** | cresce com a base de usuários |


**Variáveis pós-Open Finance** **[F — docs/product/features/14-open-finance.md]:**
Pluggy **R$ 2.500/mês mínimo** + excedente por requisição (alternativas: Belvo ~R$ 6.000/mês;
Tecnospeed R$ 1.500 adesão + R$ 540/mês, a validar em PoC). Este é o maior custo do produto e
justifica o tier separado.

### 7.3 Custos comerciais e administrativos


| Item                                | Cenário                                                                                                                                                                                                                                                 | Nota                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Meio de pagamento (Stripe BR)       | ~4% + taxa fixa por transação **[P — confirmar tabela vigente]**                                                                                                                                                                                        | Em ticket de R$ 14,90, taxas percentuais+fixas pesam ~6–9% da receita |
| Contabilidade (PJ)                  | R$ 200–500/mês **[P]**                                                                                                                                                                                                                                  | Necessária se operar como PJ/Simples                                  |
| Impostos                            | **Não calculados com alíquota inventada.** Cenários na seção 9 — Simples Nacional (anexo III ou V conforme fator R, faixas iniciais historicamente entre ~6% e ~15,5%) vs. pessoa física (inviável para SaaS recorrente) **[P — validar com contador]** |                                                                       |
| Jurídico (termos, privacidade LGPD) | R$ 2k–6k one-off **[P]**                                                                                                                                                                                                                                | Recomendado antes do lançamento pago                                  |
| Suporte/atendimento                 | 0 (fundador) → custo de oportunidade                                                                                                                                                                                                                    | Escala com a base                                                     |
| Inadimplência/chargebacks           | reserva 2–3% da receita **[P]**                                                                                                                                                                                                                         | Cartão recorrente B2C                                                 |
| Marketing/CAC                       | **Não estimável pelo repositório** — maior incógnita comercial                                                                                                                                                                                          | Ver seção 13                                                          |


---



## 8. Matriz de riscos

Severidade = Probabilidade × Impacto. Reserva expressa em horas ou R$ quando cabível.


| Risco                                                                                                                     | Prob.               | Impacto | Sev.                    | Mitigação                                                                                              | Reserva                            |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ----------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| **Bus factor 1** (uma pessoa detém todo o conhecimento; operação, suporte e evolução dependem dela)                       | Alta                | Alto    | **Crítica**             | Documentação já é forte (25 ADRs); runbook de operação; backups automatizados; considerar par eventual | — (estrutural)                     |
| **Billing mal implementado** (webhooks perdidos, estados de assinatura inconsistentes → perda de receita/acesso indevido) | Média               | Alto    | **Alta**                | Idempotência, reconciliação periódica Stripe↔DB, e2e de billing, usar entitlements server-side         | 20–30 h (incluída na contingência) |
| **Regressões silenciosas** (testes existem mas não rodam no CI) [F]                                                       | Alta                | Médio   | **Alta**                | Ativar `pnpm test` no CI antes de qualquer código de billing                                           | 8–16 h                             |
| **LGPD/termos ausentes** com dados financeiros sensíveis                                                                  | Média               | Alto    | **Alta**                | Jurídico antes do lançamento pago; consentimento; DPIA simples; canal de titular                       | R$ 2k–6k + 31 h                    |
| **Custo fixo do agregador OF** (R$ 2.500/mês vira prejuízo estrutural se ativado cedo)                                    | Baixa (já mitigado) | Alto    | Média                   | **Já mitigado pelo ADR-0025** (gatilho por demanda); manter disciplina                                 | —                                  |
| **CAC/churn B2C** (mercado competitivo: Organizze/Mobills; ticket baixo)                                                  | Alta                | Alto    | **Crítica (comercial)** | Beta fechado, waitlist da landing, diferencial multi-usuário como cunha; medir churn cedo              | fora do escopo técnico             |
| Dependência Supabase/Railway (lock-in moderado, aumentos de preço)                                                        | Média               | Médio   | Média                   | Drizzle + Postgres puro facilitam migração; Docker próprio                                             | —                                  |
| Sessão em localStorage (XSS) [F]                                                                                          | Baixa               | Alto    | Média                   | CSP, sanitização, considerar cookie httpOnly na janela de hardening                                    | 8–16 h                             |
| Senha `app_user_dev` esquecida em prod [F — gotcha documentado]                                                           | Baixa               | Alto    | Média                   | Checklist de go-live (já documentado em deployment.md)                                                 | 1 h                                |
| Escala do cron/notificações in-process (sem fila)                                                                         | Baixa (curto prazo) | Médio   | Baixa                   | Aceitável até milhares de lares [I]; broker só se necessário                                           | —                                  |
| Migrations não squashadas / hash frágil do migrator (ADR-0003: não editar .sql)                                           | Baixa               | Médio   | Baixa                   | Disciplina já documentada; squash planejado                                                            | —                                  |
| Homologação tardia com usuários reais (retrabalho de UX)                                                                  | Média               | Médio   | Média                   | Beta fechado antes do lançamento público (já previsto em 6.2)                                          | incluída                           |


**Contingência recomendada: 25%** sobre o esforço restante (312 h → ~390 h). Justificativa:
escopo restante é bem conhecido (reduz risco), mas billing + LGPD + primeira produção são
territórios novos para o projeto e não há gate de testes hoje.

---



## 9. Formação do preço (adaptada ao cenário SaaS próprio)

Como não há venda a cliente externo, "preço" aqui se decompõe em três perguntas:

### 9.1 Quanto vale o ativo já construído? (referência de valuation)

`Valor de reprodução = 1.500 h PERT × taxa` ⇒


| Cenário                | Valor          |
| ---------------------- | -------------- |
| Conservador (R$ 90/h)  | **R$ 135.000** |
| Recomendado (R$ 135/h) | **R$ 202.500** |
| Premium (R$ 180/h)     | **R$ 270.000** |


Uso: negociação de sociedade, aporte, seguro, ou decisão de "vale a pena continuar?".
**[I]** Prêmios justificáveis sobre esse valor: domínio validado em produção (old-larmony),
multi-tenancy RLS de qualidade rara, documentação que reduz dependência do autor.
Descontos que um comprador aplicaria: bus factor, ausência de receita atual, testes fora do CI.

### 9.2 Quanto falta investir para lançar?


| Cenário                                        | Custo-base (312 h) | Contingência 25% | Jurídico/LGPD | Infra 1º ano (~R$ 570/mês×12 + domínio) | **Investimento até operar** |
| ---------------------------------------------- | ------------------ | ---------------- | ------------- | --------------------------------------- | --------------------------- |
| Conservador (R$ 90/h, infra enxuta R$ 220/mês) | R$ 28.100          | R$ 7.000         | R$ 2.000      | R$ 2.900                                | **~R$ 40.000**              |
| Recomendado (R$ 135/h)                         | R$ 42.100          | R$ 10.500        | R$ 4.000      | R$ 7.100                                | **~R$ 63.700**              |
| Premium (R$ 180/h, tudo terceirizado)          | R$ 56.200          | R$ 14.000        | R$ 6.000      | R$ 7.100                                | **~R$ 83.300**              |


(Margem não se aplica — não há revenda. Impostos sobre serviços não se aplicam se o esforço for
do próprio fundador; se contratar terceiros PJ, somar NF do prestador.)

### 9.3 O pricing de assinatura fecha a conta? (unit economics)

**Preços já decididos** **[F — ADR-0025 / spec 14]**: freemium; **Premium R$ 14,90/mês por lar**;
**"Conectado" (Open Finance) R$ 29,90–44,90/mês**, nunca embutido no Premium. Âncora competitiva:
Organizze cobra R$ 35 (manual) / R$ 45 (conectado) — há espaço de preço **[F citado na spec]**.

**Margem por lar Premium (mensal)** — cenários de imposto explícitos, sem inventar alíquota exata:


| Componente                  | Cenário Simples ~6% | Cenário Simples ~15,5% |
| --------------------------- | ------------------- | ---------------------- |
| Receita                     | R$ 14,90            | R$ 14,90               |
| Stripe (~4% + fixa) **[P]** | −R$ 1,00            | −R$ 1,00               |
| Impostos                    | −R$ 0,89            | −R$ 2,31               |
| **Margem de contribuição**  | **~R$ 13,00**       | **~R$ 11,60**          |


**Ponto de equilíbrio operacional (custos fixos ÷ margem por lar):**


| Estrutura de custo fixo mensal                        | Lares Premium p/ empatar |
| ----------------------------------------------------- | ------------------------ |
| Infra enxuta (R$ 220)                                 | **~17–19**               |
| Infra base + contabilidade (R$ 570 + R$ 300 ≈ R$ 870) | **~67–75**               |


**[I]** O negócio empata operacionalmente com **algumas dezenas de lares pagantes** — viável.
Para **remunerar o fundador** (ex.: R$ 8k/mês), seriam necessários ~620–690 lares Premium; isso
dimensiona a ambição real do projeto.

**Tier Conectado (pós-gatilho):** piso Pluggy R$ 2.500/mês ÷ margem de ~~R$ 26–37 por lar
(preço R$ 29,90–44,90 menos taxas/impostos) ⇒ **~~70–95 lares Conectado** só para pagar o
agregador — coerente com o gatilho de ~150–200 Premium documentado no ADR-0025. Manter a regra:
**só ativar com demanda comprovada (waitlist) e como plano separado.**

**Payback do investimento restante (cenário recomendado, R$ 63,7k):** com margem ~R$ 13/lar,
200 lares Premium pagam o investimento em ~24 meses; 500 lares, em ~10 meses. **[P]** Sem dados
de CAC/churn, isso é aritmética, não projeção.

---



## 10. Modelo comercial recomendado

**Modelo principal: SaaS freemium B2C, cobrança por lar (household), via Stripe** — confirma a
decisão já documentada (ADR-0015/0025). Superior às alternativas porque:

- *Projeto fechado/licença*: não se aplica — não há cliente contratante; o valor está na recorrência.
- *T&M*: não se aplica pelo mesmo motivo.
- *Assinatura por usuário*: pior que por lar — o diferencial é o lar multi-usuário; cobrar por
membro puniria justamente o caso de uso diferenciado.

**Estrutura de planos (alinhada ao que está decidido):**


| Plano             | Preço                                                             | Conteúdo                                                                                                |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Grátis (Pessoal)  | R$ 0                                                              | Núcleo manual com limites (ex.: 1 lar, X transações/mês) — limites a definir na implementação do gating |
| Premium (Família) | **R$ 14,90/mês por lar** (considerar anual com desconto ~2 meses) | Lar multi-usuário completo: rateio, parcelas, orçamentos versionados, relatórios, notificações          |
| Conectado         | **R$ 29,90–44,90/mês** — só após gatilho                          | Tudo do Premium + Open Finance (importação automática)                                                  |


**Métrica de cobrança:** lar/mês. **Trial:** usar o `trial_ends_at`/`grace_period_days` já
previstos no schema (14 dias de grace já é default no shell [F]).
**Custos à parte do plano:** nenhum para o usuário final (B2C); internamente, o agregador OF é o
custo variável que define o preço do tier Conectado.
**Vantagens:** receita recorrente, ticket baixo com margem alta pós-infra, gating técnico já
arquitetado (feature flags ADR-0009 + coluna de permissões reservada).
**Riscos do modelo:** CAC/churn B2C (ver seção 8), dependência de cartão de crédito
(avaliar Pix recorrente/boleto no Stripe quando disponível para reduzir atrito).

---



## 11. Roadmap de lançamento (substitui marcos de pagamento)

Fases com critério de saída — o "pagamento" aqui é o próprio negócio destravando receita:


| Fase                           | Escopo                                                       | Esforço               | Critério de saída                                                                     |
| ------------------------------ | ------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------- |
| **0. Hardening mínimo**        | Testes no CI, senha prod, secrets, backups+restore testado   | ~50 h                 | CI vermelho bloqueia merge; restore demonstrado                                       |
| **1. Billing**                 | Módulo Stripe completo + telas + gating + e2e                | ~115 h                | Assinar, fazer upgrade/downgrade e cancelar funcionam em staging com Stripe test mode |
| **2. Compliance + landing**    | LGPD/termos, pricing real na landing, paywall                | ~50 h                 | Docs publicados; checkout acessível da landing                                        |
| **3. Beta fechado pagante**    | 10–30 lares reais (waitlist), correções                      | ~40 h                 | Churn/feedback aceitáveis; zero incidentes de cobrança                                |
| **4. Lançamento público**      | Produção plena, i18n conforme decisão (pode lançar só pt-BR) | ~55 h                 | Produto público cobrando                                                              |
| **5. Estabilização (90 dias)** | Suporte, bugfix, métricas                                    | ~83 h                 | Operação em regime                                                                    |
| **6. (Gatilho) Open Finance**  | M13 fases 0–3 + contrato agregador                           | ~217 h + R$ 2.500/mês | ≥150–200 Premium ou waitlist equivalente [F — ADR-0025]                               |


---



## 12. Exclusões de escopo (desta estimativa)

Não estão contemplados nos números das seções 6, 7 e 9:

- Aplicativo mobile nativo (iOS/Android) — o produto é web mobile-first.
- Canais SMS/WhatsApp (Twilio/WhatsApp Business) — stubs permanecem desligados.
- Permissões por módulo (além de owner/member).
- OAuth social (Google/Apple).
- Marketing, aquisição, produção de conteúdo, SEO, gestão de comunidade.
- Migração de dados de usuários do `old-larmony` (se existirem usuários a migrar, é escopo novo — ver seção 13).
- Pentest formal / certificações de segurança.
- Squash das migrations herdadas (planejado, não bloqueante).
- Fila/broker de mensageria e alta disponibilidade multi-réplica.
- Suporte 24×7, SLA formal, operação assistida.
- Open Finance (M13) — estimado à parte (6.4), fora do investimento de lançamento.

---



## 13. Perguntas pendentes (afetam materialmente os números)


| Pergunta                                                                                                 | Por que importa                                                                             | Afeta           | Cenário usado enquanto isso              |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------- |
| Qual regime tributário (PF, MEI*, Simples III/V)? *MEI tem restrições para atividade de SaaS/intelectual | Define margem por assinante e obrigação de contabilidade                                    | Seções 7.3, 9.3 | Dois cenários Simples (~6% e ~15,5%)     |
| Existem usuários ativos no `old-larmony` a migrar?                                                       | Migração de dados financeiros é escopo relevante (20–60 h + risco) e acelera a base inicial | Seções 6.2, 11  | Assumido **sem migração**                |
| O fundador executa o trabalho restante ou contrata?                                                      | Muda desembolso real vs. custo de oportunidade                                              | Seção 9.2       | Apresentados ambos (taxa como proxy)     |
| Meta de lares pagantes em 12 meses e orçamento de aquisição (CAC)?                                       | É o maior determinante de viabilidade — a engenharia já não é o gargalo                     | Seção 9.3       | Sem projeção de receita; só break-even   |
| Lançar trilíngue ou só pt-BR?                                                                            | i18n rollout é ~42 h que podem sair do caminho crítico                                      | Seções 6.2, 11  | Incluído no total; marcado como cortável |
| Stripe aceitará o fluxo desejado (Pix recorrente? boleto?)                                               | Métodos locais reduzem churn involuntário em B2C BR                                         | Seção 10        | Assumido cartão via Stripe               |
| Quem faz suporte ao usuário no lançamento?                                                               | Custo recorrente ou tempo do fundador                                                       | Seções 7.3, 6.3 | Fundador (custo de oportunidade)         |


---



## 14. Recomendação final

- **Valor de referência do ativo (não vender/ceder por menos):** **R$ 135k** (piso conservador de
reprodução); referência central **~R$ 200k**. Relevante para sociedade/aporte, não para venda —
que não está nos planos.
- **Investimento restante até operar cobrando:** planejar **R$ 55k–70k** em valor-equivalente
(central ~~R$ 64k @ R$ 135/h, já com contingência de 25%, jurídico e 1º ano de infra). Se o
fundador executa, o desembolso de caixa cai para **~~R$ 10k–15k** (jurídico + infra + contabilidade),
e o resto é custo de oportunidade (~390 h).
- **Modelo de cobrança:** SaaS freemium por lar via Stripe — **Premium R$ 14,90/mês** (manter),
anual com desconto, **Conectado R$ 29,90–44,90** somente pós-gatilho. Não baixar o Premium:
a âncora competitiva (Organizze R$ 35/45) dá espaço; o risco é CAC, não preço.
- **Margem esperada por lar Premium:** ~R$ 11,60–13,00/mês (78–87% de margem de contribuição).
- **Break-even operacional:** ~~20–75 lares Premium conforme estrutura de custo fixo; **~~650 lares**
para remunerar o fundador em ~R$ 8k/mês.
- **Reserva de contingência:** 25% do esforço restante (~78 h), já incluída nos números.
- **Prazo estimado até o lançamento público:** ~~310–390 h de trabalho ⇒ **~~2,5–3,5 meses** em
dedicação de meio período (~40 h/semana equivaleria a ~2 meses); ritmo real observado no repo
sugere que pode ser mais rápido **[I]**.
- **Principais condicionantes:** (1) billing bem testado antes de qualquer usuário pagante;
(2) testes como gate de CI **antes** de começar o billing; (3) LGPD/termos publicados antes de
cobrar; (4) disciplina no gatilho do Open Finance — é a decisão que protege o caixa.
- **Nível final de confiança:** **médio-alto** no esforço/estado (evidência direta), **médio** nos
custos de infra/impostos (cenários), **baixo** em projeção de receita (sem dados de mercado).

---



## Resumo Comercial para Proposta

*(Adaptado ao contexto: não há cliente externo — este one-pager serve para apresentar o projeto a
um sócio, investidor ou para decisão própria de go/no-go. Não expõe horas internas, taxas,
margem nem contingência.)*

---



### Larmony — Finanças do lar, feitas para mais de uma pessoa

**O que é.** Plataforma web de controle financeiro doméstico em que o **lar** é a unidade: várias
pessoas compartilham transações, com **rateio automático de despesas**, parcelamentos, orçamentos,
metas, lançamentos programados, relatórios e notificações — em português, inglês e espanhol.

**Estado.** Produto funcionalmente completo e testado em ambiente de staging, com arquitetura de
nível de produção (isolamento de dados por lar no banco, auditoria, telemetria, deploy
automatizado). Já validado em versão anterior que rodou em produção.

**Entregáveis até o lançamento.** Implementação da cobrança (assinaturas via Stripe), páginas de
planos, termos de uso e política de privacidade (LGPD), ambiente de produção com backups, beta
fechado com lares reais e lançamento público.

**Prazo.** Aproximadamente **2 a 3,5 meses** a partir do início da fase de cobrança, incluindo
beta fechado.

**Investimento.** Lançamento estimado entre **R$ 40 mil e R$ 83 mil** em valor-equivalente de
desenvolvimento e serviços (conforme quem executa), mais custos recorrentes de operação a partir
de **~R$ 220–870/mês**.

**Modelo de receita.** Assinatura mensal por lar: plano gratuito de entrada, **Premium a
R$ 14,90/mês** e, futuramente, plano **Conectado (importação bancária automática via Open
Finance) a R$ 29,90–44,90/mês** — abaixo dos R$ 35–45 praticados pelo principal concorrente,
com funcionalidade multi-usuário que ele não oferece.

**Custos recorrentes.** Infraestrutura em nuvem gerenciada (Railway, Supabase, Resend, Better
Stack) com custo inicial baixo e crescimento proporcional à base. O módulo de Open Finance só é
ativado quando a base de assinantes cobre o custo do provedor de dados bancários.

**Itens opcionais (fora do lançamento).** Aplicativo mobile nativo, notificações por
SMS/WhatsApp, login social, migração de dados de versões anteriores, integração Open Finance
(ativada por demanda).

**Exclusões.** Marketing e aquisição de usuários, suporte 24×7 e certificações formais de
segurança não estão contemplados nesta fase.

**Validade.** Estimativas referentes a jul/2026; preços de serviços de terceiros sujeitos a
revisão na contratação.