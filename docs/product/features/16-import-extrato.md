# 16 — Import de extrato (CSV/OFX/PDF) com categorização automática

> **Proposta (2026-08-22)**: plano de implementação da decisão registrada em
> `.memory/adr/0033-import-categorizacao-regras-ml-llm-fallback.md` (+ adendo do
> mesmo dia). Escrita como prompt/brief pro time de engenharia — mesmo contrato
> das specs M10–M15.
>
> **Atualização (2026-08-22, ADR-0034): contrato de API fechado.** O
> "primeiro entregável esperado" (contrato `backend`↔`statement-processor`)
> já está registrado em `.memory/adr/0034-contrato-api-backend-statement-processor.md`
> — `POST /jobs` (backend→processor, sempre assíncrono, sem caminho síncrono
> pra CSV/OFX), callback com `categoryCode` do vocabulário fechado de 13
> categorias default, staging em `statement_import_candidates` (nunca direto
> em `transactions`), idempotência por `jobId`/`externalId`, auth por
> segredo compartilhado (mesmo padrão do `CronSecretGuard`). Fase 1 pode
> começar com esse contrato como base.
>
> **Atualização (2026-08-22): Fase 1 implementada.** `apps/statement-processor`
> (FastAPI, fora do grafo do Turborepo) com `POST /jobs`, parsing OFX
> (padrão) + CSV (adapter Nubank), camadas 1–3 (estrutural/keyword/
> CNPJ→CNAE) portadas das PoCs, callback assíncrono, 18 testes (pytest)
> cobrindo os 2 bugs de regex encontrados na investigação (mercado→Mercado
> Pago, âncora do LELLO) como regressão. Fixtures de teste são **dados
> sintéticos**, não os extratos reais da investigação (decisão de
> privacidade — ver `apps/statement-processor/README.md`). Falta: Dockerfile
> validado em build real, deploy Railway, Fases 2–5.
>
> **Atualização (2026-08-23): Fase 2 implementada + débito da Fase 1 quitado.**
> A sessão que devia implementar só a Fase 2 encontrou o módulo backend
> inteiro faltando (`IStatementProcessor`, `statement_import_jobs`/
> `statement_import_candidates`, controllers, callback) — a Fase 1 anterior só
> tinha entregue o serviço Python. As duas foram construídas juntas nesta
> sessão:
> - **Processor Python**: `rules/merchant_key.py` (normalizador de
>   comerciante/pessoa) + `rules/household_member.py` (cross-referência)
>   integrados ao `pipeline.py` na ordem estrutural→memória→membro do
>   lar→keyword→CNPJ, 39 testes pytest.
> - **Backend**: migrations 0007–0010 (`merchant_category_memory`,
>   `statement_import_jobs`, `statement_import_candidates`, índice de
>   reconciliação — RLS household-scoped nas 3 tabelas, provado por e2e
>   cross-tenant), módulo `statement-import` completo (4 camadas),
>   `ProcessorSecretGuard`, 2 eventos novos de notificação (7 locales,
>   sempre contagem — nunca percentual isolado), job de cron de
>   reconciliação de timeout. Resolução `categoryCode → categoryId` via
>   mapa estático `DEFAULT_CATEGORY_CODES` (nome↔código dos 13 defaults,
>   sem coluna `code` em `categories`) — se um nome default mudar em
>   `drizzle-household.repository.ts`, a resolução quebra silenciosamente
>   pra households novos (vira `categoryId: null` crescente, sem erro).
> - **Limite de body global subiu pra 10mb** (`main.ts`/`test/helpers.ts`,
>   `useBodyParser`) — CSV/OFX em base64 excedia o default de 100kb do
>   Express. Verificado que não quebra a verificação de assinatura do
>   webhook Stripe (rawBody preservado).
> - **Achado crítico na revisão final** (ver
>   `.memory/statement-import-amount-cents-sign-gotcha.md`):
>   `amountCents` cruzava a fronteira processor→backend com o sinal nativo
>   do extrato (negativo pra despesa) em vez de sempre positivo, como o
>   próprio ADR-0034 já mandava — inverteria silenciosamente somas de
>   orçamento. Corrigido nos dois lados; backend agora rejeita (nunca coage)
>   `amountCents` não-positivo no callback. `completeJob`+`insertCandidates`
>   também unificados numa transação atômica (evitava job `completed` órfão
>   sem candidatos em caso de crash no meio).
> - **Decisão em aberto, não validada com produto**: gate de assinatura do
>   import de extrato ficou igual ao de transações (`ActiveSubscriptionGuard`
>   simples, tier Essencial) — assumido por analogia, não confirmado; revisar
>   antes do lançamento se o import de extrato deveria ser exclusivo do tier
>   Completo.
> - **Fora desta sessão**: frontend (tela de revisão pós-import), Dockerfile
>   validado, deploy Railway, Fases 3–5.

## Papel

Vocês são o time de engenharia do **Larmony** (monorepo Turborepo:
`apps/backend` NestJS 11 + Drizzle + Supabase/RLS, `apps/frontend` Next.js
pages router + React Query). A missão desta feature: usuário importa um
extrato bancário (CSV, OFX ou PDF) e o Larmony devolve transações já
categorizadas pra revisão — sem exigir digitação manual, e sem depender de
Open Finance (ADR-0025, em espera com gatilho comercial).

## Por que isso importa (contexto de negócio)

- Import manual (CSV/OFX/PDF) foi citado no ADR-0025 como "ponte" antes do
  Open Finance ativar — reduz o trabalho de digitar sem o custo fixo de
  agregador (~R$2.500+/mês mínimo, inviável com base zero de clientes).
- Investigação de viabilidade (múltiplas PoCs com dados reais — extratos
  Nubank de 5 meses + 2 PDFs reais da Caixa) já validou que uma pipeline de
  regras+ML, sem LLM como motor primário, resolve a maior parte do volume
  sem custo por chamada e sem risco de alucinação. O relatório completo da
  investigação está publicado como artifact (link nas notas de sessão,
  `.memory/sessions/2026-08-21-llm-viability-investigation.md`) — leiam
  antes de começar, tem os números reais por trás de cada decisão abaixo.

## Restrição central (leiam antes de desenhar)

**O serviço de processamento (Python, ver arquitetura abaixo) nunca acessa
Postgres/RLS diretamente.** Ele é computação sem estado: recebe do backend
NestJS o arquivo (ou linhas já parseadas) mais o contexto do lar (memória de
comerciante já aprendida, nomes de membros cadastrados) via HTTP interno, e
devolve transações candidatas categorizadas + confiança. **Toda
persistência, autenticação, RLS e regra de tenancy continuam 100% no
backend NestJS** — o serviço novo nunca duplica lógica de segurança
multi-tenant numa segunda linguagem/codebase. Isso preserva ADR-0005
(multi-tenant RLS) e ADR-0015 (household tenancy) sem exceção.

## Arquitetura (decisão já fechada — ADR-0033 + adendo)

```
Usuário faz upload (CSV/OFX/PDF)
        │
        ▼
apps/backend (NestJS)                      apps/statement-processor (Python)
  POST /households/:id/statement-imports      FastAPI, worker assíncrono
  - guards de auth/RLS/household existentes    - sem acesso a Postgres
  - valida arquivo, cria import_job (pending)  - sem estado entre requests
  - monta household_context:                  - parsing CSV/OFX/PDF (Docling)
      merchant_memory[] (já lido do repo)      - camadas 1-4: estrutural,
      household_members[]                        membro do lar, keyword, CNPJ→CNAE
  - chama POST /jobs no processor  ────────►   - camada 5 (ML) quando existir
                                                - LLM fallback (Groq) na sobra
                                    ◄────────  - POST callback com resultado
  - recebe callback (CronSecretGuard-like,
    mesmo padrão de proteção do /internal/cron)
  - persiste como transações "pendentes de
    revisão" (staging, não commitadas ainda)
  - notifica usuário (DispatchNotificationUseCase, ADR-0023)
  - cron tick (@CronJobName) reconcilia jobs presos, não é o gatilho principal
        │
        ▼
Usuário revisa/corrige no frontend
  - confirma → CreateTransactionUseCase (existente) + grava correção em
    merchant_category_memory (camada 4, alimenta o próximo import)
```

`apps/statement-processor` vive no monorepo (mesma árvore, revisão de PR
junto do resto), mas **fora do grafo do Turborepo** — tooling próprio
(`uv`/`poetry` + `pytest` + Dockerfile próprio), deploy como serviço Railway
separado (mesma plataforma de `backend`/`frontend`/cron — ADR-0011), nunca
entra em `turbo.json`/`pnpm build`.

## Convenções do repositório que este trabalho DEVE seguir

- Backend: um use-case por operação; use-cases nunca importam Drizzle
  direto; novo módulo `statement-import` no padrão de 4 camadas
  (`domain/` → `application/` → `infrastructure/` → `interface/`) — usar
  `/new-module`.
- Chamada ao serviço Python atrás de uma **porta**
  (`IStatementProcessor`) — troca de implementação (self-host vs. API
  gerenciada de OCR, modelo de ML v1 vs v2) nunca vaza pra domain/application.
- Dinheiro em **centavos inteiros** (`_cents`) — ADR-0017. O processor
  Python devolve valor em centavos (inteiro), nunca decimal/float — conversão
  de string BR (`1.940,56`) pra centavos acontece **dentro do processor**,
  com teste de arredondamento dedicado (achado da PoC: extrato da Caixa usa
  `D`/`C` em vez de sinal negativo — regra de conversão específica).
- Toda tabela nova é household-scoped com **RLS** (padrão da migration
  `0001_rls_policies.sql`): `statement_import_jobs`, `merchant_category_memory`,
  transações em staging (ou reuso de `transactions` com uma coluna de status
  — decisão de schema na Fase 1).
- Callback do processor pro backend protegido pelo mesmo padrão de
  `CronSecretGuard` (`common/guards/`) — segredo compartilhado via env, não
  reinventar autenticação.
- Sincronização de jobs presos entra como job no cron tick existente
  (`@CronJobName` + `DiscoveryService`), não como scheduler novo.
- Notificação de import concluído usa `DispatchNotificationUseCase`
  (ADR-0023) — evento novo no catálogo, 7 locales.
- **Nunca deixar o LLM (fallback da camada residual) devolver o valor
  monetário final** — ele só categoriza; o valor já veio determinístico do
  parser/OCR antes dele ser chamado. Regra não-negociável, validada como
  risco real nas PoCs (fatura de cartão tratada como categoria única, Pix
  de pessoa física virando "Salário").
- **Nenhuma métrica de cobertura de categorização é reportada como número
  fixo** em UI/docs/telemetria — validado que varia de ~13% a ~96% conforme
  o mês/comportamento do lar (achado da investigação). Reportar sempre com
  contexto (período, nº de transações da amostra).
- Toda fase entrega seus testes junto: e2e backend (Supabase local, mock do
  processor via porta fake), testes do processor em `pytest` (fixtures com
  os extratos reais já usados na investigação — `_poc_templates/`, mover
  pra fixtures do serviço), Playwright no fluxo de revisão do frontend.
- Decisões relevantes viram **ADR** em `.memory/adr/` (a partir de
  **ADR-0034**) — esta spec é a referência de escopo do milestone.

## Escopo por fases (cada fase é entregável e demonstrável isolada)

**Fase 1 — Serviço `statement-processor`: esqueleto + CSV/OFX + regras 1–3**
FastAPI mínimo, Dockerfile, deploy Railway (staging primeiro). Endpoint
`POST /jobs` recebe CSV/OFX + household_context, roda parsing + camadas
estrutural/keyword/CNPJ→CNAE (portadas 1:1 das PoCs validadas em
`_poc_templates/run-poc-rules.mjs` — reescrever em Python, não traduzir
ingenuamente, os testes de fixture validam equivalência), devolve JSON
síncrono (CSV/OFX é instantâneo, não precisa de fila ainda). Sem OCR, sem
ML, sem LLM nesta fase — só prova o contrato de API e o boundary
sem-Postgres. `IStatementProcessor` no backend chamando via HTTP, atrás de
feature flag (ADR-0009).

**Fase 2 — Camada 4 (memória por lar) + fluxo de revisão end-to-end**
Tabela `merchant_category_memory` (RLS household-scoped) + endpoint no
backend que passa a memória atual como `household_context` a cada chamada.
Frontend: tela de revisão pós-import (lista transações candidatas, usuário
corrige categoria, confirma) — confirmação grava em
`merchant_category_memory` E cria a transação real via
`CreateTransactionUseCase`. Cross-referência de membro do lar (achado da
investigação: sozinha, mais valiosa que CNPJ) integrada aqui, lendo
`household_members` existente.

> ### Referência técnica da Fase 2 (algoritmo validado nas PoCs da investigação)
>
> A investigação (múltiplas PoCs com dados reais — ver
> `.memory/adr/0033-import-categorizacao-regras-ml-llm-fallback.md` §Contexto)
> validou o algoritmo abaixo antes deste plano existir. Registrado aqui
> porque as notas de sessão (`.memory/sessions/`) **não são versionadas no
> git** — uma sessão nova neste repo pode não ter acesso a elas.
>
> **Normalizador de comerciante/pessoa** (extrai a chave pra
> `merchant_key`/lookup em `merchant_category_memory`), validado contra
> memos reais do Nubank — implementar como `merchant_key.py` novo em
> `apps/statement-processor/src/statement_processor/rules/`:
>
> 1. Detecta e remove o "lead-in" do template de memo (lista ordenada,
>    primeiro match vence): `"transferência enviada pelo pix (saldo
>    compartilhado) - "`, `"transferência enviada pelo pix via open banking
>    - iniciada por: <nome> - "`, `"transferência enviada pelo pix - "`,
>    `"transferência recebida pelo pix - "`, `"transferência recebida - "`,
>    `"compra no débito - "`, `"pagamento de boleto efetuado - "`.
> 2. Corta no primeiro delimitador que separa nome de CPF/CNPJ/banco:
>    ` - `, `" (Transferência"`, `" CNPJ "`, CNPJ formatado
>    (`\d{2}\.\d{3}\.\d{3}/`), ou CPF mascarado (`•••`).
> 3. Remove sufixos de ruído: `"(Transferência enviada)"` /
>    `"(Transferência recebida)"`, e um run de **≥6 dígitos colados ao
>    final do nome** (CPF sem formatação às vezes aparece grudado, ex.
>    `"Mello 45507024863"`).
> 4. `trim().upper()`, colapsa espaços múltiplos.
>
> **Validado**: uniu corretamente 5 ocorrências do mesmo nome em 4
> templates de memo diferentes (com CNPJ, com CPF mascarado, com sufixo
> "(Transferência enviada)", sem nenhum identificador) — caso mais difícil
> encontrado. **Limitação conhecida, aceita por ora**: normalização exata
> não une comerciantes com nome em ordem de palavra diferente entre canais
> (ex. "SUPERMERCADO DELTA MAX LTDA" via Pix vs. "DELTA SUPERMERCADOS" via
> débito, mesma rede provável) — só a camada 5 (ML, TF-IDF) resolveu esse
> caso nas PoCs; fuzzy-match determinístico (Levenshtein/token-set) é uma
> alternativa mais barata a avaliar antes de puxar ML pra isso.
>
> **Cross-referência de membro do lar**: compara o resultado do
> normalizador acima contra os nomes de `context.householdMembers`
> (`str.upper()` de cada lado, match por inclusão — `member_name in key or
> key in member_name`, não igualdade estrita, pra tolerar nome
> parcial/completo). Match → `categoryCode: null`, `resolvedBy:
> "household_member"`, sem tentar adivinhar categoria (mesmo princípio da
> camada estrutural — "reconhecido como pessoa conhecida" ≠ "sei a
> categoria"). **Roda depois da camada estrutural, antes da keyword** —
> achado da PoC: se um nome de comerciante aparecer incidentalmente dentro
> de um memo de pessoa conhecida, a keyword não deve vencer.
>
> **Números medidos na PoC** (1 extrato, 94 transações, não é benchmark
> estatístico — mas é o único dado real disponível): a regra de membro do
> lar sozinha levou a cobertura (estrutural+keyword, sem CNPJ) de 74,5%
> pra **85,1%** — mais que a camada de CNPJ inteira (+2,1pp). Memória por
> lar (correção do usuário lembrada), simulada sobre os residuais do mesmo
> extrato: 22 transações residuais colapsaram em **15 comerciantes/pessoas
> únicos** — 15 correções manuais bastariam pra cobrir o mês inteiro; 7
> das 22 (31,8%) já se resolveriam sozinhas dentro do mesmo mês por
> repetição. **Ressalva importante, também validada**: essa cobertura
> **não é constante** — testada contra 4 meses adicionais da mesma conta,
> variou de ~13% a ~92% conforme o comportamento do lar no período (ver
> ADR-0033 §Contexto, itens 3–4). Nunca reportar como número fixo em
> UI/telemetria.

**Fase 3 — Import de PDF (OCR assíncrono)** ✅ implementado (2026-08-23)
Docling dentro do processor (modelo baixado no build da imagem Docker, não
em runtime — evita repetir o cold-start de download visto na PoC), motor
EasyOCR, parser genérico por heurística de cabeçalho de coluna (sem adapter
por banco). Import de PDF vira genuinamente assíncrono: job criado com
status `processing`, callback ao backend quando pronto, notificação ao
usuário (`DispatchNotificationUseCase`). Cron tick ganha job de
reconciliação (jobs presos são marcados `TIMEOUT`).

**Correção sobre os números da PoC**: os "14-40s" citados eram **por
página**, não por documento — o timeout inicial de 5min (ADR-0034) partia
dessa leitura errada. Medido com Docling+EasyOCR reais (CPU-only, sem GPU):
um PDF escaneado de 6 páginas levou ~6-8min de ponta a ponta; timeout
corrigido pra 20min. Jobs de PDF são serializados no processor (um único
modelo de OCR cacheado por processo, sem OCR concorrente) — ver addendum
na ADR-0034 pra detalhe completo.

**Fase 4 — LLM fallback (sobra residual)**
Groq (`gpt-oss-120b`, schema compacto — índice curto + código de categoria,
`reasoning_effort:"low"`, achados de engenharia da PoC) chamado pelo
processor só pra transações que as camadas 1–4 não resolveram. Rate
limit/retry-with-backoff do free tier tratado desde o dia 1 (achado da PoC:
8.000 tokens/min por org, estourava até com lotes pequenos).

**Fase 5 (opcional, gatilho por dado) — Classificador de ML embutido**
Só entra quando telemetria de produção mostrar volume de correção
(`merchant_category_memory`) insuficiente pra cobrir bem sem generalização
estatística. TF-IDF + regressão logística com `class_weight="balanced"`
(achado da PoC: sem isso colapsa pra classe majoritária), treino como job
periódico dentro do próprio processor Python (não vira serviço novo — já
está no serviço certo desde a Fase 1), roda **depois** da checagem
estrutural no pipeline (achado da PoC: senão sobrescreve detecção de
movimentação interna).

## Fora de escopo (explícito)

Chatbot financeiro (ADR própria quando entrar em desenvolvimento — fora
desta feature), relatório mensal narrado por LLM (feature separada, reusa
o mesmo pool de provider mas não depende deste serviço), Open Finance/
agregador (ADR-0025, em espera com gatilho comercial), dedup/conciliação
entre import manual e lançamentos programados existentes (avaliar quando
Open Finance ativar — a filosofia gaps-over-dups do M9 é a referência),
suporte a outro banco além de Nubank/Caixa no lançamento desta feature
(adapters novos entram sob demanda, guiados por telemetria real — achado
da investigação).

## Critérios de aceite do milestone

1. Usuário importa um CSV ou OFX do Nubank e vê transações candidatas
   categorizadas em menos de 5s (síncrono, sem OCR).
2. Usuário importa um PDF (Caixa ou similar) e recebe notificação quando
   o processamento assíncrono termina (Docling); 0 valor monetário
   divergente do documento original num teste com os PDFs reais já usados
   na investigação (`_poc_templates/Comprovante_*.pdf`).
3. Correção do usuário numa transação é lembrada e aplicada automaticamente
   num import seguinte com o mesmo comerciante (teste e2e da camada 4).
4. Nenhum valor monetário chega ao usuário tendo passado por geração de
   LLM em algum ponto do caminho (auditável: todo valor rastreável até o
   parser/OCR determinístico).
5. Serviço `statement-processor` cai (timeout, erro 500) sem derrubar nem
   degradar o resto do backend — falha isolada, com job marcado como erro
   e usuário notificado, retry manual disponível.
6. RLS/tenancy: household A nunca recebe contexto ou resultado de
   comerciante/memória do household B (teste e2e cross-tenant).

## Dependências e sequenciamento

- **Pré-requisito de infra**: Railway configurado pra rodar um 2º tipo de
  serviço (container Python) além dos existentes — validar no kickoff da
  Fase 1 antes de comprometer o resto do plano.
- Fase 3 (PDF) depende do módulo de notificações do M11 (já existe).
- Fase 5 (ML) depende de volume real de `merchant_category_memory` — não
  sequenciar por data, sequenciar por gatilho de dado (mesmo padrão do
  M13 Open Finance, ADR-0025).
- Escolha de provedor gerenciado de OCR como *fallback*/comparação de
  custo (não a escolha inicial, que é Docling self-hospedado) fica em
  aberto — decisão de implementação na Fase 3, não bloqueante.

## Primeiro entregável esperado

ADR-0034: contrato de API entre `apps/backend` e `apps/statement-processor`
(schema do request/callback, autenticação, formato de erro) + decisão de
schema das tabelas novas (`statement_import_jobs`,
`merchant_category_memory`, e se transações em revisão reusam `transactions`
com status ou vivem em tabela de staging separada) — antes de qualquer
código, mesmo processo dos milestones M1–M15.
