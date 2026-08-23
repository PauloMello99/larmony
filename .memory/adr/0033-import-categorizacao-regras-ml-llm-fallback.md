# ADR-0033 — Import/categorização: pipeline em camadas (regras+ML), sem serviço próprio de IA

- **Status:** Aceito
- **Data:** 2026-08-22
- **Relacionados:** ADR-0017 (dinheiro em centavos — toda extração de valor
  desta pipeline converte pra centavos na borda, nunca deixa o LLM devolver
  o valor final), ADR-0025 (Open Finance desacoplado do lançamento — este
  ADR cobre o caminho manual CSV/OFX/PDF citado como "ponte" naquela
  decisão), ADR-0015 (household tenancy — a regra de cross-referência de
  membro do lar e a memória por comerciante são escopadas por
  `household_id`)

## Contexto

Investigação de viabilidade (não um plano de feature original — nasceu de
"dá pra ter um LLM pequeno e rápido pro Larmony?") evoluiu, ao longo de
várias rodadas de PoC com dados reais (5 extratos Nubank de meses
diferentes + 2 PDFs reais da Caixa), pra uma pergunta mais concreta: qual é
a arquitetura de import/categorização de transações, quanto custa, e onde
cada peça roda. Relatório completo com todos os números publicado como
artifact durante a investigação; resumo dos achados que fundamentam esta
decisão:

1. **Self-hosting de LLM/GPU é a opção mais cara e operacionalmente mais
   arriscada** — Railway não tem GPU; RunPod tem cold start real de 7–15s
   e custaria ~US$280/mês fixo pra manter warm sem tráfego que justifique.
2. **LLM genérico como motor primário de categorização é a opção mais
   cara, mais lenta E menos confiável** — testado ao vivo: um modelo
   pequeno (`gpt-oss-20b`) rotulou 3 Pix de pessoa física como "Salário"
   com alta confiança (incl. R$23.891,84); ambos os modelos testados
   (pequeno e grande) trataram uma fatura de cartão de R$13.015,32 como
   categoria única, quando na real ela soma dezenas de compras.
3. **Regras + CNPJ→CNAE + memória por lar resolveram 76,6–96,1% dos meses
   "normais"** (jul/mai/jun de 2026, mesma conta), mas **despencaram pra
   12,9–16,9% em meses antigos** (nov/2024, dez/2025) — causa raiz
   encontrada: a regra mais valiosa (movimentação interna de conta
   compartilhada, 63,8% da cobertura de jul/2026) tinha **zero
   ocorrências** nesses meses, porque o relacionamento/conta compartilhada
   do lar simplesmente não existia ainda. Cobertura de import **não é uma
   constante do produto** — varia com o tempo e o comportamento do lar.
4. **Cross-referência com membros do lar** (dado que o Larmony já tem,
   não depende do banco escrever nada específico) é um sinal mais robusto
   e bank-agnostic que qualquer regra de texto amarrada ao jargão de um
   banco — sozinha levou jul/2026 de 74,5% pra 85,1% (mais que a camada de
   CNPJ inteira).
5. **Um classificador de ML simples (TF-IDF + regressão logística)
   generaliza casos que a normalização exata não pega** (testado: nomes de
   comerciante em ordem de palavra diferente, "SUPERMERCADO DELTA MAX
   LTDA" vs. "DELTA SUPERMERCADOS") — mas só funciona bem com
   `class_weight="balanced"` (dataset é naturalmente desbalanceado) e
   precisa rodar **depois** da checagem estrutural, nunca como
   classificador único sobre o texto bruto (senão sobrescreve a detecção
   de movimentação interna).
6. **PDF de extrato não é padronizado nem entre formatos** — o PDF real da
   Caixa não tinha camada de texto nenhuma (é imagem, não texto
   selecionável), exigindo OCR de verdade. Testado ao vivo com Docling
   (CPU-only, MIT): 0 valor monetário errado em 2 documentos reais, mas
   14–40s de CPU por PDF de 1 página.
7. **Cerebras não pôde ser testado** — a `CEREBRAS_API_KEY` do projeto não
   tem billing ativo (`payment_required` em toda chamada). Groq cobriu a
   mesma faixa de custo/velocidade pesquisada, então não bloqueou a
   investigação, mas a comparação fica incompleta.

Amostra de validação é pequena e de 1 banco só (Nubank, 5 meses, mesma
conta) + 2 documentos PDF de outro banco (Caixa) — as decisões abaixo
refletem isso: preferem arquitetura extensível e componentes baratos de
trocar a otimizar prematuramente para um cenário que não foi validado em
escala nem em diversidade de bancos.

## Decisão

### 1. Pipeline de categorização em camadas, dentro do backend NestJS existente

Novo módulo `apps/backend/src/modules/statement-import` (Clean
Architecture, um use-case por operação, mesmo padrão dos módulos
existentes — `.memory/domain-rules.md`), sem service layer própria de IA.
Ordem de execução (cada camada só roda se a anterior não resolveu):

1. **Regras estruturais** (TS puro, regex) — padrões que indicam
   "não é uma compra categorizável" (movimentação interna, fatura de
   cartão). Zero custo, zero dependência externa, zero risco de
   alucinação.
2. **Cross-referência com membros do lar** — compara a contraparte da
   transação (nome/CPF extraído do memo) contra `household_members` já
   cadastrados. Bank-agnostic por construção (não depende de jargão do
   banco). Roda **antes** do dicionário de keyword pra não deixar um nome
   de comerciante incidental (ex. dentro de um memo de movimentação
   interna) vencer a checagem de pessoa conhecida.
3. **Dicionário de keyword** (TS puro, regex por substring de
   comerciante) — bootstrap pra comerciantes conhecidos sem precisar de
   histórico prévio.
4. **CNPJ → CNAE** — regex extrai CNPJ do memo (formato nacional fixo,
   bank-agnostic), consulta BrasilAPI (gratuita; **exige header
   `User-Agent` de navegador**, achado da PoC — sem isso todo request
   falha com 403), mapeia CNAE → categoria via tabela pequena com cache
   local. Render menor do que o esperado (na PoC, só 2 de 8 CNPJs
   mapearam pra categoria útil) — tratar como reforço de sinal, não fonte
   primária.
5. **Memória por lar** — tabela nova `merchant_category_memory`
   (`household_id`, `merchant_key` normalizado, `category_id`), populada
   quando o usuário revisa/corrige a categorização pós-import. Cobre
   comerciantes recorrentes sem custo por chamada e sem alucinação.
6. **Classificador de ML** (camada 5) — **não entra no launch inicial**,
   ver seção 3 abaixo.
7. **LLM (fallback estreito)** — só a sobra residual (tipicamente Pix de
   pessoa física sem contexto, comerciante nunca visto). Groq
   (`gpt-oss-120b`, não o `20b` — o menor teve o erro de "Salário
   fantasma"), com `reasoning_effort:"low"` e schema compacto (índice
   curto + código de categoria, não UUID/nome completo — achado de
   engenharia da PoC que reduz custo/latência sensivelmente).

Import de PDF: **OCR/layout primeiro (extrai texto/tabela estruturada),
regras acima depois** — nunca o LLM lê o PDF direto pra extrair valor
monetário (risco de alucinação documentado e testado). Ver decisão de
onde o OCR roda na seção 4.

### 2. Registro de adapters por banco + normalizador genérico de fallback

Mesmo padrão que agregadores de open finance BR (Pluggy, Belvo) usam pro
mesmo problema — memo de extrato não é padronizado entre bancos, mesmo
com o transporte (OFX) sendo um padrão. `detectBank()` via `<FI><ORG>` do
OFX ou heurística de coluna do CSV → escolhe o normalizador de nome de
comerciante daquele banco; sem adapter dedicado, cai no normalizador
genérico (stopwords bancárias PT-BR + remoção de CPF/CNPJ/agência/conta).
**Validado só contra Nubank** (adapter específico bate o genérico por
margem grande — 85,1% vs. 76,6% em jul/2026 na regra de membro do lar) —
adapters novos entram sob demanda, priorizados por telemetria real de
banco mais usado, não decididos agora sem dado.

### 3. Classificador de ML (camada 5): adiado do launch, sem serviço próprio quando entrar

**Decisão:** a camada 5 não entra na primeira versão do import. As
camadas 1–5 (regras+CNPJ+membro do lar+memória) já cobrem a maior parte do
volume nos meses onde o comportamento do lar está estabelecido, e o
ganho medido do classificador foi sobre casos que a **camada 4 (memória)
já resolve na prática** assim que o usuário corrige uma vez — o
classificador generaliza pra comerciante *nunca visto*, um ganho mais
estreito que não foi medido isoladamente (só o "consegue generalizar",
não "quanto isso vale sobre memória sozinha").

**Quando entrar** (gatilho: volume de correção acumulada por lar/agregada
insuficiente pra memória sozinha cobrir bem, medido em produção — não
antes): treino em Python (scikit-learn, como validado na PoC — TF-IDF +
regressão logística com `class_weight="balanced"`) é um **job offline
periódico** (script/cron de retreino, não um serviço), não uma API viva.
A inferência (vetorizar + multiplicar pesos + softmax) é aritmética
simples o suficiente pra **reimplementar em TypeScript puro** dentro do
próprio backend (sem `onnxruntime` nem dependência de runtime Python em
produção) — o modelo treinado (vocabulário TF-IDF + matriz de pesos) é
exportado como JSON/binário pequeno e carregado no boot do backend.
**Resultado: zero serviço novo, zero container Python em produção**, só
um artefato de modelo versionado e um job de treino que roda fora do
caminho crítico.

Alternativa rejeitada: manter um microserviço Python vivo (FastAPI +
scikit-learn) só pra inferência — desproporcional pro tamanho do modelo
(TF-IDF+LogReg é matemática trivial) e adicionaria uma superfície
operacional nova (deploy, healthcheck, scaling) pra um componente que roda
em milissegundos.

### 4. OCR/PDF: API gerenciada, não self-host

Docling (testado, CPU-only, MIT, 0 valor errado em 2 PDFs reais) provou
que o **método** (OCR/layout dedicado, nunca LLM lendo o PDF direto) é
correto. Mas rodá-lo em produção significa um runtime Python inteiro
(modelos de OCR/layout baixados, ~14–40s de CPU por página) dentro de um
monorepo que hoje só tem Node — isso **seria** um serviço novo (container
próprio, Dockerfile próprio, deploy próprio no Railway), o tipo de
complexidade que esta investigação inteira vem evitando quando o volume
esperado não justifica.

**Decisão:** usar uma **API gerenciada de OCR** (AWS Textract como
baseline de custo — ~US$0,0015/página no plano texto — ou Azure Document
Intelligence/Reducto se a acurácia de tabela em produção não for boa o
suficiente com Textract) para o caminho de PDF, chamada diretamente do
backend NestJS via HTTP — **sem servidor próprio, sem Python em
produção**. Import de PDF é caminho secundário (a maioria dos bancos
oferece CSV/OFX; PDF é fallback pra quem não tem opção melhor) — o volume
esperado inicial não justifica manter um serviço Python só pra isso.
Import de PDF continua **assíncrono** (fila/job em background) pela
latência de qualquer OCR (segundos por página), gerenciado ou não.

**Revisitar** se o volume de import por PDF crescer o suficiente pra o
custo por página da API gerenciada superar o custo de operar um
Docling self-hospedado (comparação de custo real, não hipotética, só
decidível com telemetria pós-lançamento).

### 5. Relatório mensal e chatbot — sem mudança de arquitetura

- **Relatório mensal:** módulo `reports` já existente calcula os números
  (soma/agregação) — só uma chamada LLM pequena e barata (mesmo pool do
  fallback de categorização) pra narrar o texto, nunca recalcular valor.
  Sem serviço novo.
- **Chatbot:** Claude Haiku 4.5 via API, chamado direto do backend.
  Prompt caching por household (system prompt fixo). Toda escrita de
  transação passa por validação determinística e confirmação do usuário
  antes de persistir — nunca confiança cega no function-call do modelo.
  Sem serviço novo. Fica **fora do escopo desta ADR de import** — decisão
  de UX/produto do chatbot em si (fluxo de confirmação, function-calling
  schema) fica pra ADR própria quando essa feature entrar em
  desenvolvimento.

### 6. Nenhum serviço de IA/ML próprio nesta arquitetura

Resumo direto à pergunta "vai ter service próprio?": **não.** Toda a
pilha roda dentro do backend NestJS existente (novo módulo, TS puro) mais
chamadas HTTP a APIs externas (BrasilAPI, Groq, Anthropic, um provedor de
OCR gerenciado). Nenhum container novo, nenhuma GPU, nenhum runtime Python
em produção. A única peça que PODERIA virar serviço próprio no futuro
(inferência de ML) foi desenhada de propósito pra não precisar — modelo
pequeno o bastante pra rodar embutido.

## Custo estimado (ordem de grandeza, early-stage — centenas de lares)

| Item | Onde roda | Custo |
|---|---|---|
| Regras 1–3 (estrutural, membro do lar, keyword) | Backend NestJS, in-process | US$0 — CPU já pago do backend |
| CNPJ → CNAE (BrasilAPI) | Chamada HTTP externa | US$0 (free tier; monitorar rate limit) |
| Memória por lar | Tabela nova, mesma Postgres/Supabase | Custo de storage desprezível |
| Classificador ML (quando entrar) | In-process, modelo embutido | US$0 infra; treino offline periódico (minutos de CPU, não recorrente por request) |
| OCR de PDF (API gerenciada) | Chamada HTTP externa | ~US$0,0015–0,03/página conforme provedor; centenas de páginas/mês = poucos dólares |
| LLM fallback de categorização | Groq API | ~US$0,02–0,03 por 1.000 transações (medido) |
| Relatório mensal (LLM) | Groq/Gemini Flash-Lite API | Trivial — poucas chamadas curtas por lar/mês |
| Chatbot (Claude Haiku) | Anthropic API | Depende de volume de conversa; cache de prompt reduz custo recorrente |
| **Self-host de GPU/LLM** | — | **Rejeitado** (ver seções 2–3 do relatório da investigação) |

**Nenhum custo fixo de infraestrutura de IA** — tudo é pay-per-use externo
ou CPU já paga do backend existente. O custo escala com uso, não existe
antes de haver usuário real importando extrato.

## Alternativas rejeitadas

- **LLM genérico como motor primário de categorização** — mais caro, mais
  lento e menos confiável que regras+ML pro que foi medido (erros
  concretos de alta confiança encontrados: "Salário" fantasma, fatura
  como categoria única).
- **Self-host de LLM (Railway/RunPod)** — sem GPU no Railway; cold start
  de 7–15s no RunPod ou ~US$280/mês fixo pra manter warm. Decisão já
  registrada informalmente na investigação, ratificada aqui.
- **Microserviço Python vivo pra inferência de ML** — desproporcional
  pro tamanho do modelo (TF-IDF+LogReg); modelo cabe embutido no backend.
- **Self-host de Docling em produção pro caminho de PDF** — funcionaria
  (testado, 0 erro de valor em 2 documentos), mas exigiria runtime Python
  novo/serviço novo pra um caminho de import secundário; API gerenciada
  evita essa superfície operacional a um custo por página baixo.
- **RAG (embeddings + geração) pra memória por comerciante** — testado
  contra normalização determinística + match exato; RAG seria
  over-engineering pra um problema de *lookup* ("já vi esse comerciante
  antes?"), não de geração de texto.

## Consequências

- Import de extrato ganha um módulo novo (`statement-import`) sem exigir
  nenhuma peça de infraestrutura nova além de uma tabela
  (`merchant_category_memory`) e chamadas HTTP a serviços externos já
  mapeados (BrasilAPI, Groq, um provedor de OCR gerenciado).
- Cobertura de categorização **não deve ser comunicada como número fixo**
  em nenhum lugar do produto (UI, docs, marketing) — validado que varia
  de ~13% a ~96% dependendo do mês/comportamento do lar. Qualquer
  telemetria de cobertura precisa vir junto do contexto temporal.
- O classificador de ML fica como dívida arquitetural conhecida e
  registrada, não esquecida — entra quando a telemetria de produção
  mostrar volume de correção suficiente, com plano de inferência já
  desenhado (embutido, sem serviço novo).
- Escolha de provedor de OCR gerenciado (Textract vs. Azure vs. Reducto)
  fica em aberto — decisão de implementação, não bloqueante desta ADR.
  Cotação/teste formal fica para o kickoff da feature.
- Validação cruzada só cobriu 1 banco (Nubank, 5 meses) + 2 documentos
  PDF de outro banco (Caixa) — extrapolação pra outros bancos é decisão
  de design informada por padrão de mercado, não validação direta. Testar
  com mais bancos reais é pré-requisito antes de declarar o normalizador
  genérico "pronto" pra produção.
- `CEREBRAS_API_KEY` do projeto segue sem billing ativo — comparação
  Groq vs. Cerebras em produção real fica pendente até isso ser resolvido.

## Fora de escopo

- Fluxo de UX do chatbot (confirmação de escrita, function-calling
  schema) — ADR própria quando a feature entrar em desenvolvimento.
- Escolha final do provedor de OCR gerenciado — decisão de implementação.
- Squash/migration da tabela `merchant_category_memory` — desenho de
  schema fica para o plano de implementação da feature.
- Integração de Open Finance/agregador (Pluggy etc.) — já desacoplada do
  lançamento pelo ADR-0025; este ADR cobre só o caminho manual
  (CSV/OFX/PDF) citado como ponte naquela decisão.

## Adendo (2026-08-22) — Camada de processamento dedicada em Python

### Contexto do adendo

Ao pedir o plano de implementação, o responsável revisou a seção 4 (OCR via
API gerenciada, "sem servidor próprio") e a decisão implícita de reimplementar
a camada 5 (ML) em TypeScript, e pediu pra reconsiderar com um critério
explícito: **Python lida melhor com tratamento de dados** (OCR, parsing,
ML) do que forçar tudo pra dentro do runtime Node do backend — pediu pra
avaliar formalmente "mesmo serviço com threads" vs. "serviço próprio em
Python" vs. "serverless" antes de fechar o plano.

Isso **reverte especificamente** a parte da decisão original que evitava um
serviço novo pra OCR/ML por causa da superfície operacional — não invalida
o resto do ADR (pipeline em camadas, ordem de execução, regras/CNPJ/memória
por lar/LLM fallback estreito continuam exatamente como decidido acima).

### Opções avaliadas

| Opção | Fica com Python? | Novo serviço? | Trade-off principal |
|---|---|---|---|
| **A. Mesmo serviço (NestJS), worker threads** | Não (worker_threads é só Node) | Não | Não atende ao critério "Python pra dado" sem virar um híbrido frágil (subprocess Python dentro do container Node — 2 runtimes num container, CPU de OCR/ML concorrendo com o event loop da API) |
| **B. Serviço Python dedicado, container no Railway** | Sim, nativo | Sim — 1 novo serviço, mesma plataforma já operada | Novo deploy target (Dockerfile próprio, envs, Better Stack), mas reusa 100% do conhecimento operacional já existente (Railway, ADR-0011) |
| **C. Serverless Python (Cloud Run/Lambda)** | Sim, nativo | Sim — **e novo vendor** (AWS/GCP, hoje só Railway+Supabase) | Escala a zero (custo só por invocação), mas exige IAM/observabilidade/deploy pipeline novos pra um único componente; cold start de container Python com modelo de OCR precisa de imagem com modelo pré-baked (senão repete o download visto na PoC) |

### Decisão do adendo

**Opção B** — serviço Python dedicado, deployado como container próprio no
Railway (mesma plataforma de `backend`/`frontend`/cron já em uso — ADR-0011),
arquitetado como **worker assíncrono**, não API síncrona request-response:

- **Escopo do serviço**: absorve parsing (CSV/OFX/PDF), as camadas 1–4
  (regras estruturais, cross-referência de membro do lar, keyword, CNPJ→CNAE,
  lookup de memória) e a camada 5 (classificador ML, quando entrar —
  agora nativo em Python, sem a ginástica de reimplementar TF-IDF em TS
  cogitada na versão original desta ADR) e o OCR de PDF (Docling
  self-hospedado, CPU-only — reavaliar API gerenciada só se o custo por
  página em produção justificar trocar, não ao contrário).
- **Fronteira de dados, mantida do desenho original**: o serviço Python
  **nunca acessa Postgres/RLS diretamente**. Ele é computação sem estado —
  recebe do backend NestJS (via HTTP interno) o arquivo/linhas já
  autenticadas e escopadas por household, mais o contexto necessário
  (dicionário de memória do lar, nomes de membros cadastrados), e devolve
  transações candidatas categorizadas + confiança. **Toda persistência,
  RLS e regra de tenancy continuam 100% no backend NestJS**
  (`CreateTransactionUseCase` e afins) — preserva ADR-0005/ADR-0015 sem
  duplicar lógica de segurança multi-tenant numa segunda linguagem/codebase.
- **Gatilho assíncrono**: reusa o cron tick unificado já existente
  (`@CronJobName`/`DiscoveryService`, `POST /internal/cron/tick`) como rede
  de segurança/reconciliação de jobs presos, mas o disparo principal é
  imediato (backend enfileira o job ao receber o upload, não espera o
  próximo tick de 15min) — mesmo princípio dos jobs de billing existentes
  (`billing-reconciliation.job.ts`).
- **Notificação de conclusão**: reusa o dispatcher multicanal existente
  (`DispatchNotificationUseCase`, ADR-0023) — usuário recebe aviso in-app
  quando o import terminar de processar e está pronto pra revisão.

### Por que não Opção C agora

Import é um fluxo bursty (uso ocorre quando o usuário decide importar, não
tráfego constante) — em teoria um bom encaixe pra serverless com scale-to-zero.
Mas adicionar AWS/GCP como segundo/terceiro vendor de nuvem, só pra um
componente, contradiz o padrão já repetido nesta investigação inteira de
"não adicionar superfície operacional nova sem dado real que justifique"
(mesmo raciocínio do ADR contra self-host de GPU). **Revisitar** se o
volume de import justificar comparar custo real Railway-sempre-ligado vs.
serverless pay-per-invocação — não decidir agora sem dado de produção.

### Consequências do adendo

- A seção 4 original ("API gerenciada de OCR, sem servidor próprio") e a
  parte da seção 3 sobre reimplementar o classificador em TS **ficam
  substituídas** por esta decisão — Docling roda dentro do serviço Python
  novo, não via API externa gerenciada (a API gerenciada vira alternativa
  de fallback/comparação de custo, não a escolha inicial).
- Plano de implementação detalhado (fases, contrato entre serviços, schema
  de jobs) em `docs/product/features/16-import-extrato.md`.
- Novo serviço = nova entrada de monitoramento/observabilidade (Better
  Stack) e novo Dockerfile/config de deploy no Railway — dívida
  operacional aceita conscientemente, não descoberta depois.
