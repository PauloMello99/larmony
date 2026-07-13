# ADR-0016 — Evolução do RAG: bge-m3, chunking token-aware, parent-document e hybrid search

**Status:** Aceito — implementado em 2026-07-05 (Fase 3 do bootstrap)
**Data:** 2026-07-04
**Supersede parcialmente:** ADR-0002/ADR-0008 (mantém Qdrant + Ollama + MCP; troca modelo e retrieval)

## Contexto

O RAG herdado funciona (indexação incremental por hash, breadcrumbs, filtros), mas:

- **nomic-embed-text é EN-only** e toda a documentação é pt-BR;
- chunking é **char-based** (1500 chars), cego a code fences e tabelas;
- retorno é o chunk isolado (600 chars) — sem contexto do documento/seção pai;
- busca é dense-only, sem sinal lexical (termos exatos como `reminder_last_sent_at`
  dependem de sorte semântica);
- código-fonte não é indexado; não há hook SessionStart.

## Decisão

Manter a stack local (Qdrant Docker + Ollama + venv WSL + FastMCP) e evoluir:

1. **Embedding: `bge-m3`** (Ollama, 1024d, contexto 8k, multilingual forte em pt).
   Sem prefixos `search_document:`/`search_query:` (específicos do nomic).
2. **Chunking token-aware**: tokenizer XLM-RoBERTa (pacote `tokenizers`, cache local,
   fallback ≈ chars/3.3). `CHUNK_TOKENS=400`, `OVERLAP_TOKENS=60` (~15%), merge de
   fragmentos <80 tokens. Code fences e tabelas markdown são **blocos atômicos**
   (nunca cortados no meio). Chunks carregam offsets `char_start/char_end`.
3. **Parent-document retrieval sem duplicar storage**: payload guarda
   `parent_source/parent_section/parent_start/parent_end` (seção H1/H2 dona,
   cap ~1600 tokens); o `memory_search` lê o arquivo do disco e devolve a seção-pai
   deduplicada por `(parent_source, parent_section)`; se o arquivo divergiu do hash
   indexado, degrada para o snippet do filho.
4. **Hybrid search**: named vectors (`dense` cosine 1024 + `sparse` BM25 via
   `fastembed` `Qdrant/bm25` com `Modifier.IDF`); query com prefetch dense
   (threshold `RAG_MIN_SCORE`) + sparse e fusão **RRF**.
5. **Indexação de código TS**: globs `apps/*/src/**/*.ts{,x}` e
   `packages/*/src/**/*.ts{,x}` (excl. spec/dist/.next/types gerados);
   `code_chunker.py` divide por símbolos top-level via regex (sem tree-sitter);
   payload `memory_type="code"` + `app/module/layer` indexados. `memory_search`
   **exclui código por padrão** (docs são a fonte primária; código é opt-in via filtro).
6. **Hook SessionStart** dispara `reindex.sh` (fire-and-forget). Downloads de
   artefatos (fastembed/tokenizers) acontecem no `/rag-setup`, nunca em hook.

## Consequências

- Troca de dimensão (768→1024) exige **rebuild full** da coleção; o venv precisa
  estar atualizado antes do primeiro hook rodar.
- Embedding ~2–3x mais lento que o nomic — irrelevante com o skip incremental por hash.
- Índice cresce com o código indexado; filtros default mantêm o recall de docs limpo.

## Alternativas consideradas

- **Trocar o vector store** (pgvector/LanceDB) — reescreve mais, perde o dashboard e
  o sparse nativo do Qdrant. Rejeitado.
- **`paraphrase-multilingual`** (768d, ctx 512) — contexto curto demais para seção-pai.
- **`embeddinggemma`** — ctx 2k e retrieval pt inferior ao bge-m3 nos benchmarks públicos.
- **Coleção separada para pais** — só se justificaria se o repo pudesse estar ausente
  no momento da busca; leitura do disco é mais simples e sempre fresca.

## Adendo (2026-07-13) — Avaliação de retrieval + tuning + Qdrant compartilhado

Primeira medição do RAG (não havia harness). Ferramenta versionada:
`bin/scripts/rag/eval.py` + golden set `eval/golden.jsonl` (~30 queries), rodando
pelo **mesmo caminho de produção** (`hybrid_search`/`expand_parents`). Baseline e
metodologia em `bin/scripts/rag/EVAL.md`.

**Baseline (n=30, 1437 chunks):** hybrid (RRF) hit@3 0.97 / hit@5 **1.00** / MRR 0.736;
dense hit@3 0.90 / hit@5 1.00 / MRR 0.829; sparse hit@5 0.73; dbsf hit@5 0.97.

**Decisões guiadas pela evidência (nenhum parâmetro alterado — a config já é boa):**
- **top_k=5 mantido** — o recall satura em k=5 (hit@5=1.00; k=8/10 idênticos).
- **`RAG_MIN_SCORE=0.35` mantido** — irrelevante na faixa 0.25–0.45 (hit-rate
  idêntico; MRR dentro do ruído).
- **Fusão RRF mantida** — bate DBSF em hit-rate e MRR nas execuções.
- **Chunking 400/60 mantido** — sem sinal de fragmentação/perda de contexto
  (hit@5=1.00, seções-pai retornadas inteiras); um sweep exigiria reindex full e
  não se justifica pelos números.
- O ganho do híbrido concentra-se em **termo/símbolo/código** (hit@3 0.82→1.00);
  em semântica, dense e híbrido empatam. BM25 rende onde o denso é fraco.

**Reranking (cross-encoder/MMR) — avaliado e NÃO adotado agora.** Com recall
saturado (hit@5=1.00) um reranker não melhora recall, só reordena um top-5 que o
agente lê inteiro; o único delta seria MRR (dense 0.829 > hybrid 0.736), que está
dentro do ruído medido (o MRR do híbrido variou 0.73–0.78 entre execuções idênticas)
e é cosmético a k=5. Custo (modelo + latência num tool interativo) não compensa.
**Gatilho para revisitar:** base crescer a ponto de hit@5 cair < ~0.9, ou fluxo que
exija precisão no top-1.

**Infra — Qdrant compartilhado (1 container / N coleções).** `docker-compose.rag.yml`
passou a definir **um único** container (`name: rag`, `container_name: rag-qdrant`,
imagem pinada `v1.18.1`, healthcheck bash `/dev/tcp`) sobre **volume nomeado**
`rag-storage` (Docker-managed, `rag_rag-storage`) — antes cada projeto subia seu
próprio container sobre bind mount por-repo. Todos os projetos rodam o mesmo compose
(idempotente) e usam sua própria coleção (Larmony: `larmony_memory`). O arquivo
passou a ser **versionado** (saiu do `.gitignore`), pois `/rag-setup`/README/CLAUDE.md
dependem dele. Hooks consolidados no `.claude/settings.json` (SessionStart sobe o
Qdrant + **um** reindex canônico via `reindex.sh`; novo Stop hook), eliminando o
double-reindex que existia entre `settings.json` e `settings.local.json`.
