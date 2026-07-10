# 13 — Assertividade dos disparos: horário + timezone (M12)

> **Proposta (2026-07-10)**: hoje o cron é um tick periódico (serviço Railway
> dedicado batendo em `/internal/cron/tick`) e os jobs disparam na **primeira
> janela do dia em UTC** — ou seja, um lembrete pode chegar ~00h–02h no Brasil.
> Este milestone adiciona **timezone + horário preferido** a todos os disparos
> agendados por data. Decisão de modelo temporal a formalizar em ADR no
> kickoff (reservar ADR-0023).

## Princípios

- **O tick não muda**: continua periódico e burro (`*/5`–`*/15`); a
  inteligência de "é hora de disparar?" fica em cada job, que compara o
  relógio **local** do destinatário/lar com a janela-alvo e usa os marcadores
  de dedup já validados (`last_sent_at` etc.) na granularidade local.
- **Timezone sempre IANA** (`America/Sao_Paulo`), nunca offset fixo — DST é
  resolvido pela lib (date-fns-tz ou Luxon, decidir no ADR). Offsets
  armazenados quebram duas vezes por ano.
- Dois relógios distintos, com donos distintos:
  - **Dados do lar** (quando uma ocorrência "vence", o que é "último dia do
    mês") → `households.timezone`, definido na criação a partir do navegador
    do criador, editável em Configurações do lar.
  - **Entrega ao usuário** (a que horas a pessoa quer ser notificada) →
    `users.timezone` (auto-detectado no login via
    `Intl.DateTimeFormat().resolvedOptions().timeZone`, editável no Account) +
    `users.notification_hour` (default 09:00, editável junto às preferências
    do M11).

## Semântica por job

| Job | Hoje | Alvo |
|---|---|---|
| `scheduled-transactions-engine` (auto) | gera no 1º tick após meia-noite UTC | gera quando a data da ocorrência chega **no fuso do lar** (transação nasce com a data local correta) |
| `scheduled-transactions-reminders` (manual) | e-mail no 1º tick do dia UTC | dispara no dia certo (fuso do lar) **na hora preferida de cada destinatário** (fuso do usuário) |
| `monthly-report` (M11) | — | último dia do mês no fuso do lar, entregue na hora preferida de cada membro |

- Regra de disparo por destinatário: `agora_local(usuário) ≥ notification_hour`
  **e** ainda não enviado hoje (dedup na data local do usuário). Um mesmo
  evento de lar pode, portanto, sair em horários diferentes para membros em
  fusos diferentes — correto por design.
- Eventos **event-driven** (meta atingida, orçamento estourado, M11) disparam
  imediatamente — o usuário acabou de agir; hora preferida não se aplica.
  Digest/quiet-hours ficam fora de escopo (pós-v1.1).

## Auditoria de features afetadas (fazer no plano do milestone)

Levantamento inicial — confirmar varrendo os jobs registrados no
`InternalCronController` e todo uso de `new Date()` em comparação de datas:

- **Afetados**: `scheduled-transactions-engine`, `scheduled-transactions-reminders`,
  `monthly-report` (M11), e a semântica de `next_run_date`/catch-up do engine
  (o cursor precisa avançar em dias locais do lar, não UTC).
- **Provavelmente não afetados** (confirmar): expiração de convites (janela de
  7 dias, tolerante a fuso), navegação mês/ano de budgets/reports no frontend
  (o cliente já usa o relógio do browser — verificar consistência com o
  backend nas bordas de mês).
- **Gotcha conhecido**: o driver `pg` devolve `date` como `Date` JS
  (meia-noite UTC) — toda comparação de data em job deve normalizar via a lib
  de timezone, nunca `getDate()`/`toISOString().slice()` ingênuos.

## Regras

- `users.timezone` e `households.timezone` NOT NULL com default
  (`America/Sao_Paulo` na migration de backfill; novos registros sempre vêm do
  navegador).
- Dedup diário migra de "data UTC" para "data local do destinatário" —
  atenção à transição na migration (marcadores existentes não podem causar
  reenvio nem supressão no dia da virada).
- Nenhum job assume que o tick roda em horário exato — a janela deve tolerar
  atraso de até um intervalo de tick.
- Testes: e2e de cron com fusos extremos (`Pacific/Kiritimati` UTC+14,
  `Pacific/Midway` UTC−11) e borda de DST.

## Dependências

- M11 (`12-notificacoes-multicanal.md`) introduz o dispatcher e o
  `monthly-report`; este milestone define **quando** eles disparam. O job de
  relatório mensal pode nascer no M11 com baseline UTC e ser promovido aqui —
  ou os dois milestones podem ser executados em sequência imediata.
