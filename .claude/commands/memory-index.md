Reindexar o banco de memória do larmony no Qdrant (coleção `larmony_memory`).

Garanta que o Qdrant está rodando:
```powershell
docker compose -f docker-compose.rag.yml up -d
```

Reindex incremental (rápido) — usa o venv dedicado do WSL. É **incremental de
verdade**: só re-embeda chunks cujo conteúdo mudou (compara `chunk_hash`) e remove pontos
órfãos (seções/arquivos removidos):
```powershell
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate
```

Rebuild completo (recria a coleção + payload indexes). **Necessário uma vez** após mudar
o input de embedding, pois invalida todos os vetores antigos:
```powershell
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/index.py
```

Diagnóstico do índice:
```powershell
wsl ~/larmony-rag-venv/bin/python bin/scripts/rag/health.py
```

Obs.: o hook PostToolUse (Write/Edit em `.memory/`) já reindexa automaticamente —
este comando é para reindex manual sob demanda. Se o venv não existir, rode
`/rag-setup` primeiro.
