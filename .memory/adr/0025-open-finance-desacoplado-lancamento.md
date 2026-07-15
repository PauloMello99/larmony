# ADR-0025 — M13 Open Finance desacoplado do lançamento + gatilho de ativação

**Status:** Aceito
**Data:** 2026-07-11

## Contexto

Com M1–M12 completos, o M13 (conexão bancária via agregador de Open Finance,
spec `docs/product/features/14-open-finance.md`) era o candidato natural a
próximo milestone, atrelado ao plano "Conectado" da assinatura B2C (decisão
comercial 2026-07-10: freemium + Premium R$ 14,90/mês por lar). Executamos a
parte de discovery da Fase 0 (pesquisa de mercado 2026-07-11) para decidir se o
Open Finance entra no lançamento do produto.

**Custos levantados** (dados públicos + relatos de mercado; cotação formal
pendente): Pluggy (Dados) **R$ 2.500/mês mínimo** + excedente por requisição;
Belvo ~R$ 6.000/mês; Tecnospeed R$ 1.500 adesão + R$ 540/mês (produto orientado
a ERPs, adequação a PFM a validar); Klavi sem preço público (foco crédito B2B);
Meu Pluggy gratuito mas com cadastro prévio do usuário no site da Pluggy (UX
inaceitável em produto pago; serve para PoC). Fontes na spec do M13.

**Unit economics**: só o piso da Pluggy exige ~168 lares Premium (R$ 14,90)
para empatar — antes de Stripe, infra e impostos. No dia zero (0 clientes) é
R$ 30k/ano de burn fixo. O mercado precifica conexão bancária como tier
separado e mais caro (Organizze Conectado R$ 45/mês vs R$ 35 manual).

**Regulatório**: a premissa da spec de "renovação de consentimento a cada 12
meses" estava defasada — desde a **Resolução Conjunta nº 7/2023** o
consentimento pode ter prazo **indeterminado** (revogável a qualquer momento).

**Técnico**: a integração em si é rápida (~3–5 semanas Fases 1–2) — widget +
sandbox prontos nos agregadores, e o repo já tem port pattern, cron tick,
regra DRIZZLE_ADMIN para escrita via webhook/cron, RLS household-scoped,
centavos na borda (ADR-0017), notificações (M11) e timezone (M12). O
pré-requisito real é **billing/entitlements (Stripe)**, hoje shell.

## Decisão

1. **O produto lança SEM Open Finance.** O M13 sai do caminho crítico do
   lançamento — o gargalo é o custo fixo do agregador contra base zero de
   clientes, não a engenharia.
2. **Gatilho de ativação das Fases 1–3**: ~150–200 lares Premium pagantes OU
   waitlist do plano Conectado suficiente para sustentar o piso do agregador
   com o tier no preço definido. Registrado também na spec do M13.
3. **Plano "Conectado" nunca embutido no Premium a R$ 14,90** — nasce como
   tier separado a ~R$ 29,90–44,90/mês (faixa de mercado). Preço final é
   decisão comercial em aberto no momento da ativação.
4. **Enquanto isso**: (a) waitlist do Conectado na landing/app para medir
   demanda a custo zero; (b) PoC da Fase 0 com trial de 14 dias da Pluggy ou
   Meu Pluggy + cotações formais (Tecnospeed, Klavi) — a escolha do agregador
   e o ADR de consentimento/LGPD ficam para o kickoff da ativação, com PoC já
   feita; (c) opcional: importação **CSV/OFX** no Premium como ponte — reduz o
   "trabalho de digitar" sem custo recorrente e prepara o pipeline de
   dedup/conciliação que o M13 reusará.
5. **Próximo milestone técnico do lançamento é billing/entitlements (Stripe)**
   — necessário para o lançamento comercial de qualquer forma e pré-requisito
   do gating do Conectado.

## Consequências

- O roadmap ganha um milestone de billing antes do M13; o M13 fica "em espera
  com gatilho" em vez de sequenciado por data.
- A spec `14-open-finance.md` foi corrigida (consentimento por prazo
  indeterminado; tabela de custos; gatilho) — a Fase 0 remanescente no kickoff
  é só a escolha final do agregador (PoC + cotações) e o ADR de LGPD.
- O lembrete de renovação de consentimento (Fase 3) vira condicional ao prazo
  que o agregador reportar.
- Risco aceito: concorrentes já oferecem conexão bancária; mitigado pelo
  posicionamento de preço na faixa manual (R$ 14,90 vs R$ 35 do Organizze) e
  pela waitlist como validação de demanda.
