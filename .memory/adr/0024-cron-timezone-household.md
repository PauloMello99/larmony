# ADR-0024 — Assertividade dos disparos: timezone + hora por lar (M12)

**Status:** Aceito
**Data:** 2026-07-11

## Contexto

O cron é um tick periódico (serviço Railway batendo em `/internal/cron/tick` a
cada `*/15`) e cada job resolvia "agora" com `new Date()` no relógio do processo
(UTC em produção). Logo, disparos agendados por data caíam na primeira janela do
dia **em UTC** — um lembrete no Brasil chegava ~00h–02h. O M12 (spec
`13-cron-horario-timezone.md`) adiciona timezone + hora preferida para os
disparos acontecerem no dia e na hora certos. ADR-0022 já prometia migrar a
âncora `currentPeriodStart` de UTC para o fuso do lar aqui.

## Decisão

1. **Timezone + hora por LAR, não por usuário** (escopo confirmado com o
   usuário). Migration 0008: `households.timezone` (IANA, NOT NULL default
   `America/Sao_Paulo`) + `households.notification_hour` (smallint 0–23, default
   9). **Não** há `users.timezone`/`users.notification_hour` nem dedup
   por-usuário — o dedup segue na granularidade atual (por-entrada /
   lar×mês), só re-chaveado para a **data local do lar**. Membros de um lar
   familiar quase sempre compartilham fuso; o dedup per-user do spec fica para
   pós-v1.1. **Trade-off explícito**: implementar hora por-destinatário exigiria
   redesenhar o modelo de dedup que o ADR-0023 fixou como "nunca por usuário".
2. **date-fns-tz** (companheiro do `date-fns@4` já instalado) — DST via IANA,
   nunca offset fixo. Helper único `common/time/tz-clock.ts`: `zonedNow(tz, now)`
   (Date cujos getters locais refletem o fuso), `localISODate(tz, now)`
   (yyyy-MM-dd local, via `formatInTimeZone` — à prova do gotcha do driver `pg`
   que devolve `date` como meia-noite UTC), `localHour(tz, now)` (0–23). **Ponto
   único de injeção**: onde um job usava `new Date()` cru, passa a usar estes
   helpers com o fuso do lar.
3. **O tick e o `InternalCronController` não mudam** (continuam burros, sem
   passar "agora"); cada job resolve o relógio local. Semântica por job:
   - **engine auto**: `findDue` busca até um teto seguro (data local de
     `Pacific/Kiritimati`, UTC+14 = maior data possível) com JOIN do
     `households.timezone`; o corte fino `nextRunDate <= hoje_local(lar)` e o
     catch-up rodam por `localISODate(tz)`. Gera quando a data da ocorrência
     chega no fuso do lar; a notificação `auto_launch` sai na geração (é evento
     de sistema — hora preferida **não** se aplica).
   - **lembretes**: janela (`nextManualOccurrence`/`daysBetween`) e dedup
     (`alreadySentToday`) no dia local do lar + gate `localHour(tz) >=
     notification_hour` (>=, tolera atraso de tick; a dedup diária impede
     reenvio).
   - **relatório mensal**: gate "último dia do mês" e `periodKey` por
     `zonedNow(tz)` + gate de hora, **por lar** (sem early-return global, pois o
     último dia difere por fuso); dedup lar×mês com chave em data local.
4. **Âncora de orçamentos migrada (ADR-0022 cumprido)**: `currentPeriodStart`/
   `currentMonthYear` passam a **exigir** `timezone` e computam via
   `localISODate` (string, robusto a qualquer TZ do processo). Os chamadores
   household-scoped resolvem o fuso do lar: repositório de budgets
   (`findTimezone` interno em create/upsert/endSeries), `list-budgets`
   (default de mês/ano + projeção) e o overview (`get-household-overview` passa
   `zonedNow(household.timezone)` — a entidade já é carregada ali).
5. **Validação estrita de fuso**: `households.timezone` é validado contra
   `Intl.supportedValuesOf("timeZone")` (`common/time/timezones.ts`) nos DTOs —
   um fuso inválido faria date-fns-tz lançar no tick do cron, então a entrada é
   barrada (400) antes de persistir.

## Consequências

- Frontend: criação de lar auto-detecta o fuso do navegador
  (`Intl.DateTimeFormat().resolvedOptions().timeZone`) e o envia (sem campo
  visível); Configurações do lar ganham seletor de fuso (lista IANA) + hora de
  notificação. `HouseholdSummary`/entidade expõem `timezone`/`notificationHour`.
  i18n pt-BR/en/es.
- `Intl.supportedValuesOf` existe no runtime (Node 22 / navegador) mas ainda não
  na lib de tipos do TS — cast pontual no back e no front.
- Cobertura: unit de `tz-clock` (Kiritimati/Midway/DST em Europe/Berlin) e dos 3
  jobs com `now` controlado e fusos extremos (engine gera no dia local; lembrete
  respeita a hora; relatório no último dia local); e2e de households cobre
  create default/com-fuso, update de fuso+hora e rejeição de fuso inválido.
- Transição de dedup (spec): `reminder_last_sent_at` e `notification_dedup`
  passam a ser comparados em data local do lar; marcadores UTC pré-existentes
  podem divergir por 1 dia na virada — irrelevante em staging/prod atuais.

## Fora de escopo (decidido)

- `users.timezone` + `users.notification_hour` + entrega e dedup por-usuário —
  pós-v1.1.
- Digest / quiet-hours (já fora no spec).
- Hora preferida para eventos event-driven (meta atingida, orçamento estourado)
  e para a geração do auto-launch — disparam na hora.
- Offsets fixos — sempre IANA.
