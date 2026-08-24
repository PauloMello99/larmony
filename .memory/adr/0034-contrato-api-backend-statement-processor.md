# ADR-0034 — Contrato de API entre `backend` e `statement-processor`

- **Status:** Aceito
- **Data:** 2026-08-22
- **Relacionados:** ADR-0033 (+ adendo — decisão de ter um serviço Python
  dedicado, worker assíncrono, nunca toca Postgres/RLS diretamente),
  ADR-0017 (centavos inteiros — todo valor cruza a fronteira já como
  inteiro), ADR-0009 (feature flags — chamada ao processor fica atrás de
  flag até a Fase 1 estabilizar), ADR-0026 (idempotência de webhook Stripe
  — mesmo padrão aplicado ao callback do processor)

## Contexto

Primeiro entregável esperado da spec `docs/product/features/16-import-extrato.md`:
o contrato de API entre `apps/backend` (NestJS, dono de toda persistência/
RLS/tenancy) e `apps/statement-processor` (Python, computação sem estado —
parsing CSV/OFX/PDF + camadas de categorização + LLM fallback). Sem esse
contrato fechado, a Fase 1 não pode começar.

Restrição herdada do ADR-0033 (não repetir a decisão, só aplicar): o
processor nunca lê/escreve Postgres — tudo que ele precisa pra categorizar
(memória de comerciante já aprendida, membros do lar, categorias do
household) chega no request; tudo que ele decide (transações candidatas)
volta pro backend, que é quem persiste.

## Decisão

### Fluxo

1. Backend recebe o upload (`POST /households/:id/statement-imports`, guards
   de auth/RLS existentes), gera um `jobId` (UUID, também PK de
   `statement_import_jobs`), grava o job com status `pending` e chama o
   processor.
2. Processor responde **imediatamente** com `202 Accepted` (nunca processa
   síncrono, nem CSV pequeno — um único contrato, sem caminho duplo) e
   processa em background.
3. Processor chama o callback do backend com o resultado (sucesso ou erro).
4. Backend grava as transações candidatas em `statement_import_candidates`
   (staging — **nunca direto em `transactions`**) e notifica o usuário
   (`DispatchNotificationUseCase`, ADR-0023).
5. Cron tick (`@CronJobName`) roda um job de reconciliação: jobs `pending`/
   `processing` há mais de N minutos sem callback viram `failed` (timeout),
   liberando retry manual.

### `POST /jobs` (backend → processor)

```
Headers:
  x-processor-secret: <PROCESSOR_SHARED_SECRET>
  Content-Type: application/json

Body:
{
  "jobId": "uuid",                    // idempotency key, gerado pelo backend
  "householdId": "uuid",
  "source": "csv" | "ofx" | "pdf",
  "file": { "encoding": "base64", "data": "..." },
  "callbackUrl": "https://.../internal/statement-imports/{jobId}/callback",
  "context": {
    "categories": [
      { "code": "ALI", "id": "uuid-real-do-household", "name": "Alimentação", "type": "expense" }
      // as 13 categorias default sempre presentes com "code"; categorias
      // customizadas do household (capability custom_categories) entram
      // SEM "code" — o processor nunca as atribui, ficam de fora do
      // vocabulário fechado de categorização automática nesta versão
    ],
    "merchantMemory": [
      { "merchantKey": "DELTA SUPERMERCADOS", "categoryCode": "ALI" }
    ],
    "householdMembers": [
      { "name": "Helena Delisa Vallim", "userId": "uuid" }
    ]
  }
}

Resposta (síncrona, imediata):
202 { "jobId": "uuid", "status": "accepted" }
400 { "errorCode": "INVALID_FILE" | "UNSUPPORTED_SOURCE", "errorMessage": "..." }
401 (secret inválido/ausente)
```

### `POST /internal/statement-imports/:jobId/callback` (processor → backend)

```
Headers:
  x-processor-secret: <PROCESSOR_SHARED_SECRET>   // mesmo segredo, mesma
                                                    // direção de confiança
                                                    // do CronSecretGuard
  Content-Type: application/json

Body (sucesso):
{
  "jobId": "uuid",
  "status": "completed",
  "transactions": [
    {
      "externalId": "string",   // FITID do OFX; hash determinístico
                                 // (sha256 de data+valor+descrição
                                 // normalizada) gerado pelo processor
                                 // quando a fonte não tem id nativo
                                 // (CSV/PDF) — usado pro backend
                                 // deduplicar reimport do mesmo período
      "date": "2026-07-19",
      "amountCents": 195000,
      "type": "income" | "expense",
      "description": "texto original truncado a 200 chars",
      "categoryCode": "ALI" | null,
      "categoryConfidence": "high" | "medium" | "low",
      "resolvedBy": "structural" | "household_member" | "keyword" |
                     "cnpj_cnae" | "merchant_memory" | "ml_classifier" |
                     "llm_fallback" | "unresolved",
      "merchantKey": "string normalizado" | null
    }
  ],
  "stats": {
    "total": 94,
    "resolvedByRules": 72,
    "resolvedByLlm": 8,
    "unresolved": 14,
    "processingMs": 1830
  }
}

Body (erro):
{
  "jobId": "uuid",
  "status": "failed",
  "errorCode": "OCR_FAILED" | "PARSE_ERROR" | "INVALID_FILE" | "TIMEOUT" | "INTERNAL_ERROR",
  "errorMessage": "string curta, sem detalhe interno sensível — log completo fica só no processor"
}
```

`amountCents` já vem **inteiro**, sinal correto (positivo=income,
negativo nunca — o `type` carrega a direção, evita ambiguidade de sinal
duplicada entre `amountCents` e `type`). Conversão de formatos regionais
(`1.940,56`, ou `D`/`C` do extrato da Caixa) acontece **dentro do
processor** — o backend nunca recebe string de valor pra parsear.

### Autenticação

Mesmo padrão do `CronSecretGuard` (`common/guards/cron-secret.guard.ts`):
header fixo comparado a uma env. Reusa o **mesmo segredo**
(`PROCESSOR_SHARED_SECRET`, nova env, presente nos dois serviços) nas duas
direções — backend→processor e processor→backend — porque é uma relação de
confiança mútua 1:1 entre dois serviços internos, não pública. Sem HMAC de
payload nem rotação automática nesta versão (mesma simplicidade do cron;
revisar se o processor algum dia for multi-tenant entre produtos, o que não
é o caso).

### Idempotência e retry

- `jobId` é a chave de idempotência dos dois lados. Callback duplicado do
  mesmo `jobId` (retry de rede) é tratado como no-op se o job já está
  `completed`/`failed` — mesmo padrão dos webhooks Stripe (ADR-0026,
  `stripe_webhook_events`).
- Timeout de espera pelo callback: 30s pra `csv`/`ofx`, 20min pra `pdf`
  (corrigido na Fase 3 — ver Addendum no fim do documento). Job de
  reconciliação do cron tick marca como `failed` (`TIMEOUT`) o que passar
  do prazo sem callback.
- Reimport do mesmo período: `externalId` funciona como chave de dedup —
  candidato cujo `externalId` já existe (em `statement_import_candidates`
  confirmado ou em `transactions.notes`/campo de origem) é marcado
  `duplicate` sem virar nova revisão pro usuário. Dedup fino (conciliação
  com lançamento manual pré-existente sem `externalId` igual) fica fora de
  escopo desta ADR — é o mesmo problema já registrado como fora de escopo
  na spec 16 e no ADR-0025 (Open Finance).

### Resolução de categoria (`categoryCode` → `categoryId` real)

O processor só conhece o vocabulário fechado de 13 códigos das categorias
default (`SAL`, `FRE`, `INV`, `OIN`, `ALI`, `MOR`, `TRA`, `SAU`, `EDU`,
`LAZ`, `VES`, `ASS`, `OUT`) — nunca decide sobre categoria customizada do
household. O backend resolve `categoryCode` para o `id` real via o mapa
`context.categories` que ele mesmo enviou no request (a mesma lista, então
a resposta nunca referencia um código fora do que foi oferecido). Se o
household apagou/renomeou a categoria default correspondente, o código
volta sem `id` correspondente no mapa — vira `categoryId: null`
(`unresolved`, revisão manual obrigatória). O processor nunca inventa nem
cria categoria.

### Tabelas novas (Drizzle, RLS household-scoped — padrão da migration `0001_rls_policies.sql`)

```
statement_import_jobs
  id uuid PK
  household_id uuid FK households
  source text (csv|ofx|pdf)
  status text (pending|processing|completed|failed)
  error_code text nullable
  created_at timestamptz
  completed_at timestamptz nullable
  -- arquivo bruto NÃO é persistido por padrão (minimização de dado,
  -- mesmo princípio do webhook Stripe do ADR-0026) — só o resultado

statement_import_candidates    -- STAGING, nunca é `transactions`
  id uuid PK
  job_id uuid FK statement_import_jobs
  household_id uuid FK households
  external_id text
  date date
  amount_cents integer
  type text (income|expense)
  description text
  category_id uuid FK categories nullable
  category_confidence text (high|medium|low) nullable
  resolved_by text
  merchant_key text nullable
  status text (pending_review|confirmed|dismissed|duplicate)
  transaction_id uuid FK transactions nullable  -- preenchido na confirmação
  unique(household_id, external_id)

merchant_category_memory
  id uuid PK
  household_id uuid FK households
  merchant_key text
  category_id uuid FK categories
  updated_at timestamptz
  unique(household_id, merchant_key)
```

Confirmação de um candidato pelo usuário: cria a `transaction` real via
`CreateTransactionUseCase` existente (sem novo caminho de escrita de
transação), grava/atualiza `merchant_category_memory` se o usuário
corrigiu a categoria sugerida, marca o candidato como `confirmed` com
`transaction_id` preenchido. **Staging separado de `transactions`** (não
uma coluna de status nela) porque `transactions` não tem hoje nenhum
conceito de "rascunho" e todo código existente (relatórios, orçamentos,
overview) assume que toda linha é uma transação real e confirmada —
misturar exigiria auditar/filtrar por status em todo lugar que já lê
`transactions`, risco desproporcional pra uma feature nova.

## Alternativas rejeitadas

- **Resposta síncrona do processor pra CSV/OFX** (só PDF assíncrono) —
  rejeitado por criar 2 contratos diferentes pro mesmo endpoint,
  complicando o cliente HTTP do backend e o tratamento de erro por pouco
  ganho de latência (CSV/OFX já processam em milissegundos nas PoCs; a
  espera pelo callback é imperceptível).
- **Backend faz polling em `GET /jobs/:id`** em vez de callback — rejeitado
  por exigir um loop de polling novo no backend (mais um scheduler) quando
  o padrão de callback + cron de reconciliação já resolve com a
  infraestrutura existente (mesmo princípio dos webhooks já usados no
  projeto).
- **Reusar `transactions` com coluna `status`** em vez de tabela de
  staging separada — rejeitado (ver seção "Tabelas novas" acima).
- **HMAC de payload** em vez de segredo fixo no header — avaliado como
  complexidade desproporcional para uma comunicação interna 1:1 entre dois
  serviços do mesmo produto; mesma decisão já tomada pro cron.

## Consequências

- `IStatementProcessor` (porta no backend) implementa exatamente este
  contrato — troca de processor (self-host vs. gerenciado, v1 vs v2 de
  modelo) nunca muda a assinatura da porta.
- `PROCESSOR_SHARED_SECRET` é env nova nos dois serviços — entra no
  `.env.example` de `backend` e do novo `statement-processor`, e nas
  variáveis do Railway (staging + prod) antes do primeiro deploy.
- Nenhum dado de arquivo bruto fica persistido além do processamento —
  reduz superfície de dado sensível em repouso (LGPD), mas significa que
  reprocessar um job falho exige o usuário reenviar o arquivo (aceito;
  arquivo já está na máquina do usuário).
- `statement_import_candidates` é uma tabela nova de porte considerável
  (staging temporário) — job de limpeza (candidatos `dismissed`/
  `confirmed` antigos) fica como follow-up de manutenção, não bloqueia o
  lançamento da Fase 1/2.

## Fora de escopo

- Conciliação fina entre import e lançamentos manuais/programados
  pré-existentes sem `externalId` — mesmo escopo já excluído na spec 16 e
  no ADR-0025.
- Rotação automática de `PROCESSOR_SHARED_SECRET` — rotação manual como
  qualquer outro segredo do projeto.
- Versionamento de contrato (ex.: `Accept-Version` header) — só um
  consumidor (o próprio backend), sem terceiros; revisar se o processor
  algum dia servir outro cliente.

## Addendum (Fase 3 — correção do timeout de PDF)

Os "14-40s" citados na decisão original eram **por página**, não por
documento — mal-interpretado ao definir o timeout inicial de 5min. Medido
com Docling+EasyOCR reais (sem GPU) contra o fixture de teste (PDF
escaneado, 6 páginas): ~6-8min de ponta a ponta, e cachear o
`DocumentConverter` entre jobs do mesmo processo não reduz isso — o custo
é OCR por página, não carregamento de modelo (que already é ~segundos).
`PDF_TIMEOUT` corrigido para 20min (folga real sobre o pior caso medido).

Risco residual aceito: um extrato com significativamente mais de 6 páginas
ainda pode estourar 20min. Correção definitiva seria o processor reportar
progresso/heartbeat pro backend em vez de um timeout fixo — fora do escopo
da Fase 3, candidato a follow-up se extratos muito longos aparecerem em
produção.

Jobs de PDF são serializados no processor (`_PDF_OCR_LOCK` em
`job_runner.py` — um único `DocumentConverter`/EasyOCR Reader cacheado
por processo, não seguro pra chamada concorrente de múltiplas threads).
Isso significa que os 20min cobrem fila de espera + OCR, não só OCR —
se dois PDFs grandes chegarem juntos, o segundo pode consumir boa parte
do orçamento só esperando o primeiro terminar. Isso vale com o `uvicorn`
de 1 worker atual (`Dockerfile` não passa `--workers`) — o lock e o cache
são module-level, então escalar pra N workers criaria N locks/converters
independentes e voltaria a permitir OCR concorrente de verdade; revisar
esta nota se o serviço um dia escalar horizontalmente dentro do mesmo
container.
