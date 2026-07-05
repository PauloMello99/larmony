# Memory-bank RAG (local, larmony)

Busca semântica sobre `.memory/`, `docs/`, os `README.md` dos packages e `.claude/CLAUDE.md`.
**Não** indexa código-fonte (último recurso, lido sob demanda). Tooling local do larmony.

Stack: **Qdrant** (Docker, `localhost:6333`) + **Ollama** (`localhost:11434`) servindo
**nomic-embed-text** (768d, cosine). Coleção: `larmony_memory`.

A recall é **obrigatória**: para perguntas "onde/como funciona X", chame a MCP tool
`memory_search(...)` (servidor `larmony-memory`) **antes** de ler o código.

## Setup (uma vez) — WSL

Ollama nativo no WSL (`nomic-embed-text`), Qdrant no Docker Desktop (exposto em
`localhost:6333`) e um venv dedicado em `~/larmony-rag-venv`. Use sempre o venv —
`python`/`pip3` "puros" no WSL podem resolver para o shim do pyenv do Windows.

```bash
# 1. Modelo de embedding
ollama pull nomic-embed-text

# 2. Qdrant em Docker (a partir da raiz do repo)
docker compose -f docker-compose.rag.yml up -d

# 3. venv dedicado + deps (inclui o pacote `mcp` do servidor MCP)
REPO=/mnt/c/Users/Paulo/Documents/Repos/Pessoal/larmony
python3 -m venv ~/larmony-rag-venv
~/larmony-rag-venv/bin/python -m pip install -r "$REPO/bin/scripts/rag/requirements.txt"

# 4. Build inicial do índice
~/larmony-rag-venv/bin/python "$REPO/bin/scripts/rag/index.py"
```

Ou rode o slash command `/rag-setup` (documenta os passos acima).

## Uso

```bash
# Rebuild completo (recria a coleção)
~/larmony-rag-venv/bin/python bin/scripts/rag/index.py

# Upsert incremental (o que os hooks rodam)
~/larmony-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate

# Consulta manual (CLI)
~/larmony-rag-venv/bin/python bin/scripts/rag/query.py "como funciona o multi-tenancy?"
```

IDs de chunk são determinísticos — reindexar sobrescreve em vez de duplicar.

## Servidor MCP (`larmony-memory`)

`mcp_server.py` expõe duas tools para a sessão Claude (config em `.mcp.json`):

| Tool | Função |
|---|---|
| `memory_search(query, k=5)` | Top-k chunks (breadcrumb + score + texto) |
| `memory_status()` | Nome da coleção + nº de chunks indexados (saúde do índice) |

## Automação (hooks)

| Hook | Ação |
|---|---|
| PostToolUse (Write/Edit em `.memory/`) | reindex incremental imediato |

(SessionStart entra na evolução do RAG — ver roadmap.)

## Variáveis de ambiente (overrides)

| Var | Default |
|---|---|
| `RAG_QDRANT_URL` | `http://localhost:6333` |
| `RAG_OLLAMA_URL` | `http://localhost:11434` |
| `RAG_EMBED_MODEL` | `nomic-embed-text` |
| `RAG_COLLECTION` | `larmony_memory` |

## O que é indexado

Definido em `config.py → INDEX_GLOBS`:
- `.memory/**/*.md` — banco de memória principal
- `docs/**/*.md` — documentação (planos, testes, etc.)
- `packages/*/README.md` — docs dos pacotes
- `.claude/CLAUDE.md` — regras do projeto

## Dashboard Qdrant

http://localhost:6333/dashboard
