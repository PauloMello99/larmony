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

> **⚠️ Atualização 2026-07-13 (pós-M14 + pré-produção).** A análise original acima é de
> **2026-07-11** (commit `e2e4cbd`), **antes** da entrega do billing (M14) e do gate de testes no
> CI. Desde então foram entregues e mergeados em `development`: **(1)** módulo de billing Stripe
> completo (**M14 B1–B7**) — checkout hospedado, webhooks idempotentes (`stripe_webhook_events`),
> portal, entitlements/gating server-side (`@RequireCapability` + guard), comp/desconto/trial por
> admin, reconciliação periódica Stripe↔DB e e2e contra **Stripe test mode**; **(2)** gate de
> testes no CI (job `test`: unit + e2e Supabase/Stripe em toda PR); **(3)** **LGPD** — termos de
> uso, política de privacidade e consentimento obrigatório no signup (`terms_accepted_at`/
> `terms_version`); **(4)** **backup/restore** com script `pnpm db:backup` + runbook
> (`docs/backup-restore.md`) + drill verificado; **(5)** **squash das migrations** (0000–0011 →
> `0000_baseline`) + hardening `helmet`/CSP (ADR-0027). O corpo abaixo foi reconciliado com esse
> estado. **As estimativas de esforço/investimento "restante" eram pré-M14**: o maior bloco
> (billing, ~115 h) e o hardening mínimo já foram entregues, então o que resta se resume a
> **provisionar produção + domínio, rollout de i18n e pricing/paywall da landing**. Os valores de
> reprodução do ativo (§6.1/§9.1) seguem válidos como referência de valuation.

---



## 1. Resumo executivo

**O que é.** Controle financeiro doméstico **multi-usuário** — o "lar" (household) é o tenant,
com isolamento por RLS no Postgres. Diferencial competitivo declarado e implementado: gestão
financeira **compartilhada** com **rateio automático de despesas entre membros** e parcelamento,
algo que os concorrentes B2C brasileiros (ex.: Organizze, Mobills) não entregam. Não é greenfield:
é o **replatforming de um produto já validado** (`old-larmony`, que rodou em produção) sobre
arquitetura nova (NestJS Clean Architecture + Next.js + Supabase/RLS + Railway).

**Estado atual.** O produto v1 + v1.1 está **funcionalmente completo até M12 + M14 (billing)**
(households, convites, categorias, transações com parcelas e rateio, dashboard, orçamentos
versionados, metas, lançamentos programados com engine de recorrência, relatórios, notificações
multicanal i18n, cron com timezone por lar, e **cobrança/entitlements via Stripe**). M13 (Open
Finance) segue deliberadamente adiado com gatilho. Staging está **verde no Railway**; produção
ainda não foi provisionada. ~32 mil linhas de código de produto (na análise original: 13,8k
backend + 17,8k frontend; o billing M14 acrescentou o módulo `subscriptions`), 27 ADRs,
suíte e2e de backend + unit + Playwright de frontend — **rodando como gate no CI**.

**A monetização deixou de ser lacuna:** o **billing (Stripe) foi implementado no M14 (B1–B7)** —
checkout hospedado, webhooks idempotentes, portal do cliente, entitlements/gating server-side,
comp/desconto/trial por admin e reconciliação periódica Stripe↔DB, com e2e contra Stripe test
mode. O pricing decidido em ADR (Premium R$ 14,90/mês; tier "Conectado" com Open Finance a
R$ 29,90–44,90/mês) está refletido no backend. **Falta apenas** alinhar o pricing/paywall da
landing (ainda anuncia planos como grátis) e provisionar produção para começar a cobrar.

**Complexidade.** Alta no que já foi construído (multi-tenancy RLS de produção, engine de
recorrência com fuso, dispatcher de notificações, billing com idempotência/reconciliação);
**baixa** no que falta para lançar (provisionamento de produção + landing/pricing + i18n).

**Principais riscos:** dependência de uma única pessoa (bus factor 1) e risco de mercado
(CAC/churn em B2C financeiro é o maior determinante do resultado — fora do alcance desta análise
técnica). O custo fixo do agregador de Open Finance (piso Pluggy R$ 2.500/mês) segue corretamente
desacoplado com gatilho no ADR-0025. *(Riscos da análise original já mitigados: testes agora são
gate de CI; LGPD/termos publicados; billing implementado e testado.)*

**Números-chave (detalhados nas seções 6, 7 e 9):**


| Métrica                                          | Faixa                                            | Confiança                    |
| ------------------------------------------------ | ------------------------------------------------ | ---------------------------- |
| Valor de reprodução do ativo atual               | **R$ 135k – 270k** (central ~R$ 200k @ R$ 135/h) | Média                        |
| Esforço restante até o lançamento comercial      | **~120 h** pós-M14 (billing + hardening já entregues; era ~310 h) | Média-alta  |
| Investimento restante (com contingência 25%)     | **~R$ 15k – 30k** pós-M14 (era R$ 35k–70k)       | Média                        |
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
| `.memory/roadmap.md`                                                                                                                           | Milestones M1–M12 + M14 (billing) concluídos; M13 (Open Finance) em espera com gatilho                      |
| `.memory/adr/` (25 ADRs, em especial 0003, 0005, 0011, 0015, 0017, 0020, 0023, 0024, 0025)                                                     | Decisões de arquitetura, deploy, dinheiro em centavos, unificação de recorrências, Open Finance desacoplado |
| `docs/product/visao-e-dominio-v1.md` + `docs/product/features/01..14`                                                                          | Escopo funcional alvo e specs por milestone                                                                 |
| `docs/product/features/14-open-finance.md`                                                                                                     | Tabela de custos de agregadores (Pluggy R$ 2.500/mês etc.), unit economics, fases do M13                    |
| `apps/backend/src/` (~306 arquivos TS, ~13,8k LOC)                                                                                             | 15 módulos, 74 rotas em 14 controllers, Clean Architecture, RLS request-scoped com 2 pools                  |
| `apps/backend/src/database/`                                                                                                                   | Migrations squashadas em `0000_baseline` (cadeia 0000–0011) + comando `baseline`; migrator custom; ~16 tabelas ativas |
| `apps/backend/test/` (specs e2e, incl. billing/webhook contra Stripe test mode) + `.spec.ts` unit                                              | Cobertura real de scheduled-transactions, rateio, RLS, budgets, reports, billing/entitlements               |
| `apps/frontend/src/` (~240 arquivos, ~17,8k LOC)                                                                                               | 15 features, 25 componentes UI, i18n pt-BR/en/es, React Query + query-keys, telemetria                      |
| `apps/frontend/e2e/` (11 specs Playwright)                                                                                                     | Fluxos principais testados ponta a ponta                                                                    |
| `apps/backend/src/modules/subscriptions/` (billing M14)                                                                                        | Billing implementado: checkout, webhooks idempotentes, portal, entitlements/gating, comp/desconto/trial, reconciliação |
| `apps/frontend/src/pages/households/[householdSlug]/settings/subscription.tsx`, `admin/billing.tsx`, `features/landing/components/pricing.tsx` | Telas de billing reais (assinatura/portal/admin); **pendente**: pricing/paywall da landing (ainda anuncia grátis)      |
| `.github/workflows/ci.yml`                                                                                                                     | CI roda types+lint+build **e testes** (job `test`: unit + e2e Supabase/Stripe) em toda PR                   |
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
| —        | i18n do app (alvo: 7 idiomas — pt-BR/en/es/zh/de/fr/ja)                                              | **Parcial** — infra completa; só dashboard+login traduzidos; e-mails hardcoded pt-BR. Rollout dos 7 idiomas = tarefa futura (§13) | Média        | Média                          | Baixo                         | tarefa futura                         |
| **B1**   | **Billing/entitlements (Stripe): checkout, webhooks, portal, gating por plano, trial/grace, telas** | **Implementado e testado (M14 B1–B7; e2e Stripe test mode)** [F]                     | **Alta**     | **CRÍTICA — destravou receita** | Médio (webhooks/idempotência) | **0**                                 |
| **B2**   | Landing/pricing alinhada aos planos pagos + paywall UX                                              | Parcial (landing ainda anuncia tudo grátis) [F]                                      | Baixa        | Alta                           | Baixo                         | 12–36 h                               |
| **M13**  | **Open Finance (agregador: conexão, importação, sync, conciliação)**                                | **Não iniciado** (zero código) [F]; decisão de espera com gatilho [F, ADR-0025]      | Muito alta   | Baixa hoje / alta no futuro    | Alto (terceiro, custo fixo)   | **130–360 h** (opcional, pós-gatilho) |
| —        | SMS/WhatsApp (Twilio etc.)                                                                          | Não iniciado (portas + noop stubs) [F]                                               | Média        | Baixa                          | Médio                         | Fora do escopo v1                     |
| —        | Permissões por módulo                                                                               | Não iniciado (coluna reservada; só roles owner/member) [F]                           | Média        | Baixa                          | Baixo                         | Fora do escopo v1                     |


**[I]** O núcleo do produto e o billing (**B1**) estão prontos; o caminho crítico restante para
receita é **B2** (pricing/paywall da landing) mais o provisionamento de produção (seção 4).

---



## 4. Estado atual do projeto

**Pronto (implementado, testado, com deploy de staging verde):**
todo o núcleo M1–M12 listado acima **+ billing/entitlements M14 (Stripe)**; pipeline CI
(types+lint+build **+ testes como gate**: unit + e2e Supabase/Stripe); deploy config-as-code
(Railway + Dockerfiles standalone + migrations no boot, cadeia squashada em `0000_baseline`);
telemetria Better Stack integrada; auditoria; seed de dev; RAG/memória de engenharia; hardening de
pré-produção (helmet + CSP/security headers, ADR-0027); backup/restore com script + runbook +
drill; LGPD (termos, privacidade, consentimento no signup).

**Parcial:**

- i18n: infraestrutura completa, rollout de telas incompleto; e-mails só pt-BR [F]. Decisão (§13):
  lançar suportando 7 idiomas (pt-BR/en/es/zh/de/fr/ja), com o rollout como tarefa futura própria.
- Documentação de setup: `.memory/` e `docs/` internos são excelentes, mas o `README.md` raiz
ainda é o template do Turborepo [F].
- Notificações: canais in-app + e-mail reais; SMS/WhatsApp são stubs [F].

**Ausente:**

- Open Finance — zero código [F]; deliberadamente adiado com gatilho [F].
- Fila/broker de mensageria (assíncrono é in-process + cron pull) [F] — adequado à escala
inicial [I], limite conhecido para escala futura.

**Implementado sem validação:**

- Painel admin (parte não-billing) e módulos mail/audit não têm testes dedicados [F].
  *(O admin de billing — comp/desconto/trial — tem cobertura de use-case no M14.)*

**Necessário para produção:**

1. Provisionar ambiente de produção (Railway env `production` + Supabase pago) — hoje intocado [F].
2. Trocar a senha `app_user_dev` da migration 0003 em produção [F — gotcha documentado].
3. Registrar o endpoint de webhook do Stripe em cada ambiente + setar `STRIPE_SECRET_KEY`/
   `STRIPE_WEBHOOK_SECRET` (ver `docs/deployment.md`) [F].
4. Rodar `migrator baseline` **uma vez** no banco existente antes do 1º deploy pós-squash
   (após `pnpm db:backup`) [F — README das migrations].

*(Itens da análise original já resolvidos: testes no CI = gate ativo; backup/restore = script +
drill; LGPD = publicada; sessão localStorage vs. cookie httpOnly = decidido em ADR-0027 — manter
localStorage + hardening, gatilho de migração = domínio próprio.)*

---



## 5. Avaliação de maturidade (0–5)


| Dimensão            | Nota    | Justificativa                                                                                                                                                                                                                |
| ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitetura         | **5**   | Clean Architecture consistente em 15 módulos, um use-case por operação, portas/adaptadores, monorepo disciplinado, 25 ADRs. Acima da média de mercado.                                                                       |
| Qualidade do código | **4,5** | TS strict total (`noUncheckedIndexedAccess`), lint `--max-warnings 0` no CI, débito visível baixíssimo. Migrations já squashadas (`0000_baseline`); desconto meio ponto residual por shells herdados pontuais.               |
| Segurança           | **4**   | Defense-in-depth raro em produto desse porte: guards + RLS `NOBYPASSRLS` com 2 pools e `set_config` por request; teste e2e de isolamento entre lares. Descontos: token em localStorage, senha dev em migration, sem pentest. |
| Banco de dados      | **4,5** | Modelagem coerente (centavos inteiros, versionamento de orçamento), cadeia squashada em `0000_baseline` com down, migrator custom com rollback, **restore drilado** (contagens idênticas). Desconto: sem evidência de índices revisados p/ volume. |
| Testes              | **4**   | Suíte real e bem dirigida (e2e de RLS, rateio, engine 451L, billing/webhook contra Stripe test mode; Playwright no front) **rodando como gate no CI**. Desconto: sem unit no frontend, admin não-billing/mail sem cobertura. |
| Infraestrutura      | **3,5** | Staging verde, config-as-code, healthcheck, migrations no boot. Produção não provisionada; réplica única; sem estratégia de fila.                                                                                            |
| Observabilidade     | **3**   | Better Stack front+back, filtro global de exceções, audit log. Sem APM/métricas de negócio/alertas configurados como código.                                                                                                 |
| Documentação        | **4**   | Interna excepcional (`.memory/`, ADRs, specs, deployment passo a passo). README raiz é template; sem doc de operação/suporte para terceiros.                                                                                 |
| UX/UI               | **4**   | Design system próprio com tokens, mobile-first evidente, estados loading/empty/erro em 35+ arquivos, onboarding guiado, landing 3D. Dark-only (decisão); i18n incompleto nas telas.                                          |
| Performance         | **3**   | Sem gargalos evidentes na escala alvo; cache in-memory; React Query bem configurado. Sem load test, sem broker, `numReplicas: 1`. Nota reflete "não verificado", não "ruim".                                                 |
| Operação            | **3**   | Backup/restore com script + runbook (`docs/backup-restore.md`) e drill verificado. Faltam runbook de incidentes e suporte a usuário final (esperado pré-lançamento).                                                         |
| Compliance          | **3**   | LGPD endereçada: termos de uso, política de privacidade e consentimento no signup (`terms_accepted_at`/`terms_version`); exclusão de conta e audit log já existiam. Falta revisão jurídica externa e CNPJ/controlador formal. |


**Média ponderada informal: ~4/5** (pós-M14 + pré-produção) — perfil de produto **pré-lançamento
saudável**: engenharia acima da média, operação/compliance agora endereçadas (backup drilado,
LGPD publicada, testes no gate de CI), com resíduo esperado antes do go-live (runbook de
incidentes, suporte, revisão jurídica).

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

> **Atualização 2026-07-13:** a tabela abaixo é a estimativa **original (pré-M14)**. Já foram
> **entregues**: *Billing backend* (63 h), *Billing frontend* (32 h), *QA — testes no gate + e2e de
> billing* (22 h), *Compliance LGPD* (31 h) e boa parte de *Segurança* (helmet/CSP, ADR-0027) e de
> *Infra produção* (backup/restore). O **restante real até o lançamento ≈ 120 h**: pricing/paywall
> da landing, provisionamento de produção + domínio, beta e documentação (o **rollout de i18n dos 7
> idiomas é tarefa futura** fora do caminho crítico — §13). As linhas entregues estão anotadas com
> **✅**.



| Disciplina             | Escopo                                                                                                             | Otim.   | Prov.   | Pess.   | PERT       | Principais incertezas                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ------- | ------- | ------- | ---------- | -------------------------------------------------------------------------- |
| ✅ Billing backend     | Módulo Stripe: checkout, webhooks idempotentes, portal, entitlements/gating, trial/grace, sync com `subscriptions` | 40      | 60      | 100     | **63**     | **Entregue (M14 B1–B7).**                                                  |
| ✅ Billing frontend    | Telas subscription/billing reais, paywall, gating de UI, admin billing                                             | 20      | 30      | 50      | **32**     | **Entregue** (paywall/pricing da landing ainda pendente — ver B2)         |
| Landing/pricing        | Alinhar planos pagos decididos (R$ 14,90 / tier Conectado), waitlist → conversão                                   | 12      | 20      | 36      | **21**     | Copy/posicionamento                                                        |
| ⏭ i18n rollout         | Traduzir telas restantes + e-mails localizados (ADR-0018 pendente p/ e-mails)                                      | 24      | 40      | 70      | **42**     | **Tarefa futura (§13)** — fora do caminho crítico de lançamento            |
| ✅ QA                  | Testes no CI (gate), e2e de billing, smoke de produção                                                             | 12      | 20      | 40      | **22**     | **Entregue** (gate ativo + e2e Stripe test mode)                          |
| ◑ Segurança            | Senha `app_user` de prod, secrets, revisão de sessão (localStorage vs cookie), headers, rate limits                | 16      | 28      | 48      | **29**     | Parcial: headers/CSP + decisão de sessão (ADR-0027) feitos; senha/secrets de prod pendentes |
| ✅ Compliance LGPD     | Política de privacidade, termos, consentimento, fluxo de exportação de dados                                       | 16      | 28      | 56      | **31**     | **Entregue** (termos/privacidade/consentimento); revisão jurídica externa à parte |
| ◑ Infra produção       | Provisionar env prod (Railway+Supabase), domínio, backups + teste de restore, runbook                              | 12      | 20      | 36      | **21**     | Parcial: backup/restore drilado; provisionamento de prod + domínio pendentes |
| Homologação/beta       | Beta fechado com lares reais, correções de fricção                                                                 | 12      | 20      | 32      | **21**     | Feedback imprevisível                                                      |
| Documentação           | README real, doc de setup/operação/suporte                                                                         | 8       | 12      | 24      | **13**     | —                                                                          |
| Gestão/alinhamentos    | Planejamento, revisões (reduzido: time solo)                                                                       | 8       | 16      | 28      | **17**     | —                                                                          |
| **Total até produção** |                                                                                                                    | **180** | **294** | **520** | **~312 h** *(estimativa original; ~148 h já entregues ✅ + i18n ⏭ futuro ⇒ **restante ≈ 120 h**)* | **Confiança média-alta** |




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

> **Pós-M14:** a tabela abaixo é a derivação **original (312 h)**. Com billing + hardening já
> entregues (~148 h) e i18n como tarefa futura, o **restante ≈ 120 h** ⇒ **~R$ 11k–22k** de
> custo-base (× R$ 90–180/h) antes de contingência.



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
| Meio de pagamento (Stripe BR)       | ~4% + taxa fixa por transação **[P — confirmar tabela vigente]**. Métodos decididos (§13): **cartão + Pix** recorrente quando disponível no Stripe BR                                                                                                     | Em ticket de R$ 14,90, taxas percentuais+fixas pesam ~6–9% da receita |
| Contabilidade (PJ)                  | R$ 200–500/mês **[P]**                                                                                                                                                                                                                                  | Necessária se operar como PJ/Simples                                  |
| Impostos                            | **Regime decidido (§13): Simples Nacional — inicialmente Anexo V (~15,5%), com possibilidade de Anexo III (~6%) se o Fator R ≥ 28% (folha ≥ 28% do faturamento).** Cenários detalhados na seção 9 **[P — validar com contador]**                          |                                                                       |
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
| **Billing mal implementado** (webhooks perdidos, estados de assinatura inconsistentes → perda de receita/acesso indevido) | Baixa (mitigado)    | Alto    | Média                   | **Mitigado no M14**: idempotência (`stripe_webhook_events`), reconciliação periódica Stripe↔DB, e2e contra Stripe test mode, entitlements server-side | — (endereçado)                     |
| **Regressões silenciosas** (testes fora do CI) [F]                                                                        | Baixa (mitigado)    | Médio   | Baixa                   | **Mitigado**: job `test` roda unit + e2e (Supabase/Stripe) como gate em toda PR                        | — (endereçado)                     |
| **LGPD/termos ausentes** com dados financeiros sensíveis                                                                  | Baixa (mitigado)    | Alto    | Média                   | **Mitigado**: termos/privacidade/consentimento publicados. Resíduo: revisão jurídica externa + CNPJ/controlador formal | R$ 2k–6k (jurídico)                |
| **Custo fixo do agregador OF** (R$ 2.500/mês vira prejuízo estrutural se ativado cedo)                                    | Baixa (já mitigado) | Alto    | Média                   | **Já mitigado pelo ADR-0025** (gatilho por demanda); manter disciplina                                 | —                                  |
| **CAC/churn B2C** (mercado competitivo: Organizze/Mobills; ticket baixo)                                                  | Alta                | Alto    | **Crítica (comercial)** | Beta fechado, waitlist da landing, diferencial multi-usuário como cunha; medir churn cedo              | fora do escopo técnico             |
| Dependência Supabase/Railway (lock-in moderado, aumentos de preço)                                                        | Média               | Médio   | Média                   | Drizzle + Postgres puro facilitam migração; Docker próprio                                             | —                                  |
| Sessão em localStorage (XSS) [F]                                                                                          | Baixa               | Alto    | Média                   | **Decidido (ADR-0027)**: manter localStorage + hardening (CSP/helmet já aplicados); gatilho de migração p/ cookie httpOnly = domínio próprio | — (decidido)                       |
| Senha `app_user_dev` esquecida em prod [F — gotcha documentado]                                                           | Baixa               | Alto    | Média                   | Checklist de go-live (já documentado em deployment.md)                                                 | 1 h                                |
| Escala do cron/notificações in-process (sem fila)                                                                         | Baixa (curto prazo) | Médio   | Baixa                   | Aceitável até milhares de lares [I]; broker só se necessário                                           | —                                  |
| Hash frágil do migrator (ADR-0003: não editar .sql)                                                                       | Baixa               | Médio   | Baixa                   | **Squash entregue** (0000–0011 → `0000_baseline` + comando `baseline`); disciplina de não editar .sql mantida | —                                  |
| Homologação tardia com usuários reais (retrabalho de UX)                                                                  | Média               | Médio   | Média                   | Beta fechado antes do lançamento público (já previsto em 6.2)                                          | incluída                           |


**Contingência recomendada: 25%** sobre o esforço restante. Justificativa: pós-M14, os territórios
antes novos (billing, LGPD, gate de testes) já foram entregues e testados; o restante (landing,
i18n, primeira produção) é bem conhecido — a contingência cobre sobretudo a primeira ativação do
ambiente de produção.

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
Descontos que um comprador aplicaria: bus factor, ausência de receita atual. *(O desconto por
"testes fora do CI" da análise original deixou de valer — o gate de testes está ativo.)*

### 9.2 Quanto falta investir para lançar?

> **Pós-M14:** a tabela abaixo é a conta **original (pré-billing)**. Com billing, LGPD, backup e
> gate de testes entregues, o investimento restante caiu para **~R$ 15k–30k** (ver §14 e o banner
> no topo). A tabela permanece como registro do racional original.



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

**Margem por lar Premium (mensal)** — regime decidido (§13): **Simples Nacional, adotar Anexo V
(~15,5%) como baseline**, migrando a Anexo III (~6%) se o Fator R ≥ 28%. Ambos os cenários abaixo
(a coluna ~15,5% é a de planejamento conservador):


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


**Métrica de cobrança:** lar/mês. **Trial:** implementado no M14 — trial por admin
(`trial_ends_at`) + grace, além dos campos já previstos no schema [F].
**Custos à parte do plano:** nenhum para o usuário final (B2C); internamente, o agregador OF é o
custo variável que define o preço do tier Conectado.
**Vantagens:** receita recorrente, ticket baixo com margem alta pós-infra, gating técnico já
arquitetado (feature flags ADR-0009 + coluna de permissões reservada).
**Riscos do modelo:** CAC/churn B2C (ver seção 8). Métodos de pagamento decididos (§13):
**cartão + Pix** (Pix recorrente quando disponível no Stripe BR, para reduzir churn involuntário).

---



## 11. Roadmap de lançamento (substitui marcos de pagamento)

Fases com critério de saída — o "pagamento" aqui é o próprio negócio destravando receita:


| Fase                           | Escopo                                                       | Esforço               | Critério de saída                                                                     |
| ------------------------------ | ------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------- |
| ✅ **0. Hardening mínimo**     | Testes no CI, senha prod, secrets, backups+restore testado   | ~50 h                 | **Entregue** — gate de testes ativo; restore drilado (senha/secrets de prod no go-live) |
| ✅ **1. Billing**              | Módulo Stripe completo + telas + gating + e2e                | ~115 h                | **Entregue (M14 B1–B7)** — assinar/upgrade/downgrade/cancelar em staging com Stripe test mode |
| ◑ **2. Compliance + landing**  | LGPD/termos, pricing real na landing, paywall                | ~50 h → **~25 h**     | LGPD/termos **publicados**; **pendente**: pricing/paywall reais na landing            |
| **3. Beta fechado pagante**    | 10–30 lares reais (waitlist), correções                      | ~40 h                 | Churn/feedback aceitáveis; zero incidentes de cobrança                                |
| **4. Lançamento público**      | Produção plena, i18n (7 idiomas — rollout como tarefa futura) | ~55 h                 | Produto público cobrando                                                              |
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
- Migração de dados de usuários do `old-larmony` — **decidido (§13): sem migração** (base zero).
- Pentest formal / certificações de segurança.
- Fila/broker de mensageria e alta disponibilidade multi-réplica.
- Suporte 24×7, SLA formal, operação assistida.
- Open Finance (M13) — estimado à parte (6.4), fora do investimento de lançamento.

---



## 13. Decisões de negócio (respondidas em 2026-07-13)

As perguntas pendentes da análise original foram **decididas pelo responsável**. Registro abaixo;
os números do corpo foram alinhados a estas decisões.


| Pergunta                                                          | Decisão (2026-07-13)                                                                                          | Afeta           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------- |
| Regime tributário?                                                | **Simples Nacional** — adotar inicialmente o **Anexo V (~15,5%)**, migrando ao **Anexo III (~6%)** se o **Fator R ≥ 28%**. | Seções 7.3, 9.3 |
| Existem usuários no `old-larmony` a migrar?                        | **Não** — sem migração; base zero.                                                                            | Seções 6.2, 11  |
| O fundador executa o restante ou contrata?                        | **Fundador executa** — desembolso de caixa ~R$ 10–15k; resto é custo de oportunidade.                         | Seção 9.2       |
| Meta de lares pagantes em 12 meses / orçamento de CAC?            | **Sem meta ainda** — não projetar receita nem orçar CAC agora; manter só o break-even como referência.        | Seção 9.3       |
| Idioma de lançamento?                                             | **Suportar 7 idiomas** (pt-BR, en-US, es-ES, zh-CN, de-DE, fr-FR, ja-JP); **rollout/revisão de i18n = tarefa futura** própria. | Seções 6.2, 11  |
| Métodos de pagamento (Stripe BR)?                                 | **Cartão + Pix** (Pix recorrente quando disponível no Stripe BR).                                             | Seção 10        |
| Quem faz suporte ao usuário no lançamento?                        | **Fundador** (suporte@larmony.me) — custo de oportunidade; adequado ao volume inicial.                        | Seções 7.3, 6.3 |


---



## 14. Recomendação final

- **Valor de referência do ativo (não vender/ceder por menos):** **R$ 135k** (piso conservador de
reprodução); referência central **~R$ 200k**. Relevante para sociedade/aporte, não para venda —
que não está nos planos.
- **Investimento restante até operar cobrando (pós-M14):** o maior bloco (billing ~115 h) e o
hardening mínimo já foram entregues. O restante em valor-equivalente caiu para **~R$ 15k–30k**
(landing/pricing, i18n, provisionamento de produção + domínio, beta; contingência 25%). Como o
**fundador executa** (§13), o desembolso de caixa fica em **~R$ 10k–15k** (jurídico + infra +
contabilidade) e o resto é custo de oportunidade (~120 h).
- **Modelo de cobrança:** SaaS freemium por lar via Stripe — **Premium R$ 14,90/mês** (manter),
anual com desconto, **Conectado R$ 29,90–44,90** somente pós-gatilho. Não baixar o Premium:
a âncora competitiva (Organizze R$ 35/45) dá espaço; o risco é CAC, não preço.
- **Margem esperada por lar Premium:** ~R$ 11,60–13,00/mês (78–87% de margem de contribuição).
- **Break-even operacional:** ~~20–75 lares Premium conforme estrutura de custo fixo; **~~650 lares**
para remunerar o fundador em ~R$ 8k/mês.
- **Reserva de contingência:** 25% do esforço restante (~78 h), já incluída nos números.
- **Prazo estimado até o lançamento público (pós-M14):** ~~120 h de trabalho restante ⇒ **~1–1,5
mês** em dedicação de meio período; ritmo real observado no repo sugere que pode ser mais rápido **[I]**.
- **Principais condicionantes:** (1) billing bem testado antes de qualquer usuário pagante — **✔ feito**
(M14 + e2e Stripe test mode); (2) testes como gate de CI — **✔ ativo**; (3) LGPD/termos publicados
antes de cobrar — **✔ publicados** (falta revisão jurídica externa); (4) disciplina no gatilho do
Open Finance — é a decisão que protege o caixa (mantida).
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
metas, lançamentos programados, relatórios e notificações — com suporte multilíngue (pt-BR no
lançamento; en, es e outros idiomas com rollout planejado).

**Estado.** Produto funcionalmente completo e testado em ambiente de staging, **incluindo a
cobrança por assinatura (Stripe): checkout, portal do cliente, controle de acesso por plano e
cortesias/descontos/trial por administrador**. Arquitetura de nível de produção (isolamento de
dados por lar no banco, auditoria, telemetria, deploy automatizado, termos/privacidade LGPD
publicados, backup/restore verificado). Já validado em versão anterior que rodou em produção.

**Entregáveis até o lançamento.** Restam: páginas de planos/paywall na landing, provisionamento do
ambiente de produção (com backups), beta fechado com lares reais e lançamento público. *(Cobrança,
LGPD e testes automatizados no pipeline já estão prontos.)*

**Prazo.** Aproximadamente **1 a 1,5 mês** a partir de agora, incluindo beta fechado.

**Investimento.** Restante estimado em **~R$ 15 mil a R$ 30 mil** em valor-equivalente de
desenvolvimento e serviços, mais custos recorrentes de operação a partir de **~R$ 220–870/mês**.

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