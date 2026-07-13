Bootstrap (uma vez) do RAG/memória semântica do larmony: Ollama + Qdrant + venv dedicado.

Tudo roda no WSL. Execute, em ordem:

```powershell
# 1. Modelo de embedding no Ollama (bge-m3: multilingual, 1024d — ADR-0016)
wsl ollama pull bge-m3

# 2. Qdrant em Docker (a partir da raiz do repo)
docker compose -f docker-compose.rag.yml up -d

# 3. venv dedicado + deps (mcp, fastembed, tokenizers)
wsl -e bash -lc "python3 -m venv ~/larmony-rag-venv && ~/larmony-rag-venv/bin/pip install -r /mnt/c/Users/Paulo/Documents/Repos/Pessoal/larmony/bin/scripts/rag/requirements.txt"

# 4. Warm-up dos artefatos (tokenizer XLM-RoBERTa + modelo BM25 — nunca em hooks)
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/warmup.py

# 5. Build inicial do índice (docs + código)
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/index.py
```

Verifique:
```powershell
docker ps            # deve listar o container do Qdrant
wsl ollama list      # deve listar bge-m3
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py "clean architecture"
```

Depois disso, o servidor MCP `larmony-memory` (`memory_search` / `memory_status`) fica
disponível na sessão, e os hooks (SessionStart em background + PostToolUse em escritas
de `.memory/`) mantêm o índice fresco automaticamente.
Dashboard do Qdrant: http://localhost:6333/dashboard
