# 09 — Recorrência (M9)

## Escopo

- Transações recorrentes (ex.: salário mensal, assinatura) com geração automática.
- Schema novo (migration própria): campos/tabela de regra de recorrência — **não
  existem no baseline** de propósito (nunca foram implementados no old-larmony).

## A definir no plano (design próprio)

- Modelo: regra RRULE-like vs periodicidade simples (mensal/semanal/anual).
- Geração: no tick do cron (materializa próximas N ocorrências) vs on-read.
- Edição de série vs ocorrência única; fim de série; pausa.
- Relação com bills (evitar sobreposição conceitual: bill = definição estática +
  lembrete; recorrência = lançamento automático).
