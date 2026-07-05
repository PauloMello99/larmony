Buscar manualmente no banco de memória semântica (coleção `larmony_memory`).

Execute (substitua pela sua query) — usa o venv dedicado do WSL:
```powershell
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py "$ARGUMENTS"
```

Exemplos:
```powershell
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py "monorepo conventions"
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py -k 8 "package aliasing"
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py "como funciona o multi-tenancy"
```

Filtros por metadata (escopo da busca):
```powershell
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py --type adr "consequências"
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py --document ADR-0010 "caixa"
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py --section "Consequências" "rls"
```

Diagnóstico do índice (saúde + validação de similaridade):
```powershell
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/health.py
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/health.py --validate --samples 5
```

Busca em código indexado (opt-in):
```powershell
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/query.py --code --app backend --module households "guard de owner"
```

Nota: durante um chat, o Claude deve buscar autonomamente via MCP tool
`memory_search` (servidor `larmony-memory`) **antes** de ler o código — aceita os mesmos
filtros (`memory_type`, `document`, `section`, `app`, `module`, `layer`, `include_code`).
Este comando CLI é para inspeção/debug manual.
