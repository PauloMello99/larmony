# 14 — Integração Open Finance (M13)

> **Proposta (2026-07-10)**: conexão bancária via Open Finance Brasil com
> importação e conciliação automática de transações. Escrita como prompt/brief
> para o time de engenharia — mesmo contrato das specs M10–M12 (escopo + regras;
> plano de implementação + ADRs no kickoff; numeração de ADR a confirmar no
> kickoff — a reserva 0021–0023 do roadmap ficou defasada, 0021 já foi consumido
> pelo design system).
>
> **Atualização (2026-07-11, ADR-0025): milestone em espera com gatilho.** A
> Fase 0 (discovery de custo dos agregadores) mostrou piso fixo inviável com
> base zero de clientes (Pluggy R$ 2.500/mês mínimo) — a integração técnica em
> si é rápida e compatível com o repo, o gargalo é comercial. Ativa com
> ~150–200 lares Premium ou waitlist equivalente do plano Conectado. O
> pré-requisito (billing/entitlements) foi endereçado no M14 (ADR-0026). Ver
> `.memory/adr/0025-open-finance-desacoplado-lancamento.md` para a decisão
> completa.

## Papel

Vocês são o time de engenharia do **Larmony** (monorepo Turborepo: `apps/backend`
NestJS 11 + Drizzle + Supabase/RLS, `apps/frontend` Next.js pages router + React
Query). A missão deste milestone é levar o Larmony da categoria "lançamento manual"
para a categoria "conectado": o usuário conecta suas contas bancárias via **Open
Finance Brasil** e o Larmony importa e concilia transações automaticamente.

## Por que isso importa (contexto de negócio)

- O Larmony será vendido como assinatura B2C por lar (freemium + Premium R$ 14,90/mês).
- Os concorrentes precificam a conexão bancária como o degrau mais caro do mercado
  (Organizze Conectado: R$ 45/mês vs R$ 35/mês do plano manual). Sem open finance,
  o Larmony compete apenas na faixa manual; com ela, destrava um plano superior
  ("Conectado") e o principal motivo de churn desaparece: o trabalho de digitar.
- O diferencial do Larmony é o **lar multi-usuário** (rateio, `person_id`). Open
  finance + rateio automático entre membros é uma combinação que nenhum concorrente
  entrega hoje.

## Restrição regulatória central (leiam antes de desenhar)

O Larmony **não é instituição participante** do Open Finance Brasil e não vai se
tornar uma. O acesso se dá via **agregador licenciado** (modelo usado por todos os
apps de finanças do mercado). A Fase 0 deve avaliar e escolher entre candidatos
como **Pluggy, Belvo, Klavi** (e outros que encontrarem), comparando: cobertura de
bancos, preço por conexão/usuário/mês, modelo de consentimento (**hoje por prazo
indeterminado, Resolução Conjunta BCB/CVM nº 7/2023 — revogável a qualquer
momento pelo usuário; a premissa anterior desta spec de "renovação a cada 12
meses" estava defasada**), webhooks vs polling, sandbox, SLA e aderência LGPD
(nós nunca custodiamos credenciais bancárias — só o agregador).

## Convenções do repositório que este trabalho DEVE seguir

- Backend: um use-case por operação; use-cases nunca importam Drizzle direto;
  novo módulo `open-finance` (ou `bank-connections`) no padrão de 4 camadas
  (`domain/` → `application/` → `infrastructure/` → `interface/`) — usar `/new-module`.
- Agregador atrás de um **port** (`IBankAggregator`) — a escolha de fornecedor é
  detalhe de infraestrutura trocável, nunca vaza para domain/application.
- Dinheiro em **centavos inteiros** (`_cents`) — ADR-0017. Atenção: agregadores
  devolvem decimal; conversão na borda, com testes de arredondamento.
- Toda tabela nova é household-scoped com **RLS** (padrão da migration
  `0001_rls_policies.sql`); escrita disparada por webhook/cron usa `DRIZZLE_ADMIN`,
  nunca o use-case request-scoped (regra documentada no roadmap §M9).
- Sincronização periódica entra como job no cron tick existente (`@CronJobName`
  + DiscoveryService), não como scheduler novo.
- Gating por plano: conexão bancária é recurso do plano **Conectado** — integrar
  com a camada de entitlements (feature flags ADR-0009 / `household-module.guard`).
- **Toda fase entrega seus testes junto** (e2e backend com Supabase local +
  Playwright no frontend, com o agregador fakeado no port).
- Decisões relevantes viram **ADR** em `.memory/adr/` e esta spec é a referência
  de escopo do milestone.

## Escopo por fases (cada fase é entregável e demonstrável isolada)

**Fase 0 — Discovery + ADR (bloqueia as demais)**
Comparativo de agregadores com custo por conexão em 3 cenários de volume (100 /
1.000 / 10.000 lares conectados); PoC de sandbox com o finalista; ADR da escolha
+ ADR do modelo de consentimento/LGPD (o que armazenamos, por quanto tempo, como
o usuário revoga e o que acontece com os dados importados na revogação).

**Fase 1 — Conexão e importação inicial**
Fluxo de consentimento no frontend (widget do agregador), entidades
`bank_connections` + `bank_accounts` + transações importadas com origem
(`source: manual | imported`), importação inicial (90 dias), estado de conexão
visível (ativa / expirada / erro / revogada).

**Fase 2 — Sincronização contínua + conciliação**
Webhook (preferencial) ou polling no cron; **dedup idempotente** (id externo do
agregador como chave); conciliação com lançamentos manuais e com os gerados pelos
lançamentos programados existentes (sugerir merge, nunca duplicar silenciosamente
— espelhar a filosofia gaps-over-dups do engine M9); categorização sugerida
mapeando categoria do agregador → categorias do lar.

**Fase 3 — Integração com o diferencial do lar**
Transação importada participa de rateio e relatórios (`person_id` = dono da conta
conectada); regras de auto-rateio por conta ("tudo desta conta divide igual");
lembrete de renovação do consentimento (condicional ao prazo que o agregador
escolhido reportar — hoje indeterminado, Res. Conj. 7/2023) via módulo de notificações.

## Fora de escopo (explícito)

Iniciação de pagamentos (ITP), investimentos/previdência, contas PJ, participação
direta no diretório Open Finance, migração de dados de outros apps.

## Critérios de aceite do milestone

1. Usuário Premium/Conectado conecta um banco no sandbox e vê transações importadas
   com badge de origem em < 2 min.
2. Re-execução de qualquer sync não cria duplicatas (teste e2e de idempotência).
3. Revogação de consentimento remove o vínculo e cumpre o definido no ADR de LGPD.
4. Membro sem permissão no módulo não vê nem conecta contas (RLS + guard testados).
5. Lançamento manual pré-existente conciliável com importado sem perda do rateio.
6. Custo por lar conectado documentado e refletido na margem do plano Conectado.

## Dependências e sequenciamento

- **Pré-requisito**: camada de entitlements/billing (Stripe) — é o gating do plano
  Conectado. Sequenciar antes ou em paralelo à Fase 0.
- Fase 3 (lembrete de renovação) depende do módulo de notificações do M11.

## Primeiro entregável esperado

Plano de implementação da Fase 0 (candidatos, critérios de comparação, prazo da
PoC) antes de qualquer código — mesmo processo dos milestones M1–M12.
