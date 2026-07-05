Bootstrap (uma vez) do RAG/memória semântica do larmony: Ollama + Qdrant + venv dedicado.

Tudo roda no WSL. Execute, em ordem:

```powershell
# 1. Modelo de embedding no Ollama
ollama pull nomic-embed-text

# 2. Qdrant em Docker (a partir da raiz do repo)
docker compose -f docker-compose.rag.yml up -d

# 3. venv dedicado + deps (inclui o pacote `mcp` do servidor MCP)
wsl -e bash -lc "python3 -m venv ~/larmony-rag-venv && ~/larmony-rag-venv/bin/python -m pip install -r /mnt/c/Users/Paulo/Documents/Repos/Pessoal/larmony/bin/scripts/rag/requirements.txt"

# 4. Build inicial do índice
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/index.py
```

Verifique:
```powershell
docker ps            # deve listar o container do Qdrant
ollama list          # deve listar nomic-embed-text
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py "clean architecture"
```

Depois disso, o servidor MCP `larmony-memory` (`memory_search` / `memory_status`) fica
disponível na sessão, e o hook PostToolUse (escritas em `.memory/`) mantém o índice
fresco automaticamente. Dashboard do Qdrant: http://localhost:6333/dashboard
