# RAG retrieval — baseline de avaliação

Ferramenta: `eval.py` + golden set `eval/golden.jsonl`. É um **baseline de
regressão + comparação relativa**, não uma nota absoluta de qualidade. Roda o
golden set pelo **mesmo caminho de produção** (`hybrid_search`/`expand_parents`
de `mcp_server.py`).

## Como rodar

```bash
# no venv WSL, com Qdrant + Ollama up e a coleção populada
~/larmony-rag-venv/bin/python bin/scripts/rag/eval.py
~/larmony-rag-venv/bin/python bin/scripts/rag/eval.py --json bin/scripts/rag/eval/results.json
```

- **hit-rate@k**: fração das queries cuja fonte esperada aparece no top-k.
- **MRR**: rank recíproco médio da fonte esperada (0 se além do top-10).
- Hit = `expect_source` (substring de caminho, ex.: `.memory/adr/0017-money-integer-cents`
  ou `stripe-payment-gateway`) contido no `source` de um resultado, ranqueado sobre
  a lista de **seções-pai deduplicadas** que o agente realmente vê.

## Baseline — 2026-07-13 (coleção: 1437 chunks; n=30 queries)

| mode | hit@3 | hit@5 | hit@8 | hit@10 | MRR |
|---|---|---|---|---|---|
| dense  | 0.90 | **1.00** | 1.00 | 1.00 | **0.829** |
| sparse | 0.60 | 0.73 | 0.87 | 0.87 | 0.502 |
| **hybrid (RRF, produção)** | **0.97** | **1.00** | 1.00 | 1.00 | 0.736 |
| dbsf   | 0.90 | 0.97 | 1.00 | 1.00 | 0.703 |

Por categoria (term/símbolo — inclui code — vs semantic):

| categoria | dense hit@3 | hybrid hit@3 |
|---|---|---|
| semantic (n=19) | 0.95 | 0.95 |
| term/símbolo (n=11) | 0.82 | **1.00** |

> n≈30: confiar só em efeitos grandes; deltas de ~0.05 no MRR são **ruído**
> (medido: o MRR do híbrido variou 0.73–0.78 entre execuções idênticas).
> Queries **com acento** (uso real) — versão sem acento subestima o recall.

## Veredito por faceta

- **A busca é híbrida?** Sim, de verdade: `query_points` com prefetch dense
  (bge-m3 cosine, floor `MIN_SCORE=0.35`) + sparse (BM25 IDF) fundidos por **RRF**
  (`mcp_server.py:45-74`). Degrada p/ dense-only se fastembed faltar.
- **O híbrido vale a pena?** Sim, e o ganho está **concentrado em term/símbolo/
  código**: hybrid leva hit@3 de 0.82→1.00 aí. Em queries semânticas dense e
  híbrido empatam. Ou seja, o BM25 rende exatamente onde o denso é fraco
  (identificadores exatos, nomes de arquivo/símbolo).
- **O contexto é bem aplicado?** Sim: **hit@5 = 1.00** — a fonte esperada sempre
  cai no top-5. Parent-document retrieval devolve a seção H1/H2 inteira (não o
  chunk cru), lida fresca do disco.
- **top_k está certo (=5)?** Sim, validado: o hit-rate **satura em k=5**
  (hit@5=1.00; hit@8/10 idênticos). Subir p/ 8/10 não agrega; k=3 já pega 0.97 no
  híbrido. **Sem mudança.**
- **Chunks (tamanho 400 / overlap 60) estão adequados?** Sem sinal de problema: com
  hit@5=1.00 e seções-pai retornadas inteiras, não há evidência de fragmentação ou
  perda de contexto. **Não mexer sem gatilho.** (Um sweep empírico de tamanho/overlap
  exigiria reindex full por variante; não se justifica pelos números atuais —
  racional de design em ADR-0016.)
- **MIN_SCORE (0.35)?** Irrelevante na faixa testada: hit@3/5/10 idênticos em
  0.25/0.35/0.45; MRR dentro do ruído. **Sem mudança.**
- **RRF vs DBSF?** RRF vence em hit-rate e MRR nas duas execuções. **Manter RRF.**
- **Reranking (cross-encoder/MMR)?** **Não justificado agora.** O recall já está
  saturado (hit@5=1.00) — um reranker não melhora recall, só reordena um top-5 que
  o agente já lê inteiro. A única diferença seria MRR (dense 0.829 > hybrid 0.736),
  mas esse gap está dentro do ruído medido e é cosmético a k=5. Custo (modelo +
  latência num tool interativo) não compensa. **Gatilho p/ revisitar**: se a base
  crescer a ponto de hit@5 cair < ~0.9, ou se algum fluxo exigir precisão no top-1
  (ex.: injetar automaticamente 1 único doc).

### Nuance registrada (não acionada)
`dense MRR (0.829) > hybrid MRR (0.736)` porque o RRF rebaixa de rank-1 p/ rank-2 os
hits em que o ramo sparse erra/ranqueia baixo. Como o hit@5 do híbrido é 1.00 e o
agente lê o top-5, o efeito é prático-nulo. Documentado para referência futura.

## Metodologia (anti-circularidade)

- Golden set autoral (~30 queries), ancorado em arquivos reais; **fonte esperada
  prevista antes de rodar**; frases de pergunta natural (paráfrase, não cópia do
  chunk); cada query taggeada semantic vs term.
- Ablação dense/sparse/híbrido reusa o mesmo caminho de produção, variando só a
  recuperação; reportada por categoria para manter a comparação honesta.
- Limitações: n pequeno; golden set não é ground-truth exaustivo; mede regressão
  relativa, não qualidade absoluta. Automatizar no CI é follow-up (fora deste round).
