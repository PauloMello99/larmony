# Memory-bank RAG (local, larmony)

Busca semântica **híbrida** (dense + BM25, fusão RRF) com **parent-document
retrieval** sobre `.memory/`, `docs/`, READMEs dos packages, `.claude/CLAUDE.md`
e — opt-in — o código TypeScript (`apps/*/src`, `packages/*/src`). Ver ADR-0016.

Stack: **Qdrant** (Docker, `localhost:6333`, named vectors `dense`+`sparse`) +
**Ollama** (`localhost:11434`) servindo **bge-m3** (1024d, multilingual, ctx 8k) +
**fastembed** (BM25 CPU). Coleção: `larmony_memory`.

A recall é **obrigatória**: para perguntas "onde/como funciona X", chame a MCP tool
`memory_search(...)` (servidor `larmony-memory`) **antes** de ler o código.
Código indexado é **opt-in** na busca (`include_code=True` ou filtros
`app`/`module`/`layer`/`memory_type="code"`).

## Como funciona

- **Chunking token-aware** (`chunker.py`): headings → blocos atômicos (code fences
  e tabelas nunca são cortados) → chunks de ~400 tokens com overlap de 60
  (tokenizer XLM-RoBERTa do bge-m3, cache em `.rag/tokenizer/`).
- **Código** (`code_chunker.py`): split por símbolos top-level; payload
  `memory_type="code"` + `app`/`module`/`layer` derivados do path.
- **Parent-document** (`mcp_server.py`): cada chunk guarda offsets da seção
  H1/H2 dona; a busca devolve a **seção inteira lida do disco** (dedupe por
  seção; se o arquivo mudou desde a indexação, degrada para o snippet do chunk).
- **Hybrid**: prefetch dense (threshold `RAG_MIN_SCORE`=0.35) + sparse BM25,
  fusão RRF no Qdrant.
- **Incremental**: `chunk_hash` por chunk — só re-embeda o que mudou; órfãos
  são removidos.

## Setup (uma vez) — WSL

```bash
# 1. Modelo de embedding
ollama pull bge-m3

# 2. Qdrant em Docker (a partir da raiz do repo)
docker compose -f docker-compose.rag.yml up -d

# 3. venv dedicado + deps
REPO=/mnt/c/Users/Paulo/Documents/Repos/Pessoal/larmony
python3 -m venv ~/larmony-rag-venv
~/larmony-rag-venv/bin/pip install -r "$REPO/bin/scripts/rag/requirements.txt"

# 4. Warm-up dos artefatos (tokenizer + BM25 — nunca dentro de hooks)
~/larmony-rag-venv/bin/python "$REPO/bin/scripts/rag/warmup.py"

# 5. Build inicial do índice
~/larmony-rag-venv/bin/python "$REPO/bin/scripts/rag/index.py"
```

Ou rode o slash command `/rag-setup` (documenta os passos acima).

## Uso

```bash
# Rebuild completo (recria a coleção; obrigatório ao trocar modelo/dim)
~/larmony-rag-venv/bin/python bin/scripts/rag/index.py

# Upsert incremental (o que os hooks rodam)
~/larmony-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate

# Consulta manual (CLI) — docs
~/larmony-rag-venv/bin/python bin/scripts/rag/query.py "como funciona o rateio?"
# — código
~/larmony-rag-venv/bin/python bin/scripts/rag/query.py --code --app backend "guard do cron"
```

IDs de chunk são determinísticos — reindexar sobrescreve em vez de duplicar.

## Servidor MCP (`larmony-memory`)

`mcp_server.py` expõe duas tools para a sessão Claude (config em `.mcp.json`):

| Tool | Função |
|---|---|
| `memory_search(query, k, memory_type, document, section, app, module, layer, include_code)` | Top-k seções-pai (hybrid + parent expansion) |
| `memory_status()` | Coleção + nº de chunks por memory_type |

## Automação (hooks)

| Hook | Ação |
|---|---|
| SessionStart | reindex incremental em background (fire-and-forget) |
| PostToolUse (Write/Edit em `.memory/`) | reindex incremental imediato |

## Variáveis de ambiente (overrides)

| Var | Default |
|---|---|
| `RAG_QDRANT_URL` | `http://localhost:6333` |
| `RAG_OLLAMA_URL` | `http://localhost:11434` |
| `RAG_EMBED_MODEL` | `bge-m3` |
| `RAG_EMBED_DIM` | `1024` |
| `RAG_COLLECTION` | `larmony_memory` |
| `RAG_CHUNK_TOKENS` / `RAG_OVERLAP_TOKENS` | `400` / `60` |
| `RAG_MIN_SCORE` | `0.35` (threshold do prefetch dense) |

## O que é indexado

`config.py → INDEX_GLOBS` (markdown) e `CODE_GLOBS` (TypeScript, com
`CODE_EXCLUDES` para specs/dist/tipos gerados).

## Dashboard Qdrant

http://localhost:6333/dashboard
