# Imagem Docker do frontend — antes/depois (P-5)

Fase pre-production. `next.config.js` ganhou `output: "standalone"` +
`outputFileTracingRoot` (raiz do monorepo, requisito pnpm/turbo); o Dockerfile
passou a copiar só `.next/standalone` + `.next/static` + `public/` no runner,
sem `pnpm install --prod` (node_modules de produção inteiro).

## Medição

| | Antes (`pnpm install --prod` + `.next` completo) | Depois (`standalone`) |
|---|---|---|
| Tamanho da imagem | ~2 GB (estimado — casos documentados de setups equivalentes ficam nessa faixa) | **437 MB** (medido, `docker images`) |
| Redução | — | **~78%** |

## Por que ainda não é <200MB

O caso "<200MB" citado na pesquisa é de apps sem dependências pesadas de
runtime. O Larmony carrega no bundle server-side `three.js` +
`@react-three/{fiber,drei,postprocessing}` (modelo 3D da landing) e
`recharts` (gráficos) — bibliotecas grandes que o tracing do standalone
inclui corretamente porque são de fato usadas em SSR/build. 437MB já reflete
só o necessário; não há gordura de `node_modules` completo sobrando.

## Verificação executada

```bash
docker build -f apps/frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -t larmony-frontend-standalone .
docker images larmony-frontend-standalone   # 437MB

docker run -d --name larmony-fe-test -p 3010:3000 -e PORT=3000 larmony-frontend-standalone
# logs: "Network: http://0.0.0.0:3000" (HOSTNAME=0.0.0.0 aplicado) + "Ready in 0ms"
curl http://localhost:3010/        # 200, CSP presente, landing renderiza
curl http://localhost:3010/locales/pt-BR/common.json  # 200 (public/ servido)
```

Resultado: **build local funciona, container sobe e responde 200 com a
landing renderizada e os headers de segurança presentes** (produção, sem
`unsafe-eval`). Container de teste removido após a validação.

## Follow-up (fora de escopo desta fase)

- Avaliar lazy-load mais agressivo do bundle three.js/drei (code-split do
  hero 3D) se o tamanho da imagem virar gargalo real de deploy.
