"""Retrieval evaluation harness for the larmony memory bank (ADR-0016).

A *basic* regression baseline — NOT an absolute quality score. It runs a
hand-authored golden set of ~30 developer questions through the SAME query path
production uses (imports `hybrid_search` / `expand_parents` from `mcp_server`,
never reimplements them) and reports, per top-k:

    hit-rate@k   fraction of queries whose expected source appears in the top-k
    MRR          mean reciprocal rank of the expected source (0 if beyond top-10)

It also ablates dense-only / sparse-only / hybrid (RRF) retrieval, reported by
query category (semantic vs term/symbol), and sweeps RAG_MIN_SCORE. With n~30,
trust only large effects; small deltas are noise (stated in the output).

Run in the WSL venv (needs Qdrant + Ollama up and the collection populated):

    ~/larmony-rag-venv/bin/python bin/scripts/rag/eval.py
    ~/larmony-rag-venv/bin/python bin/scripts/rag/eval.py --json results.json

A hit = the golden `expect_source` (a repo-relative path substring, e.g.
".memory/adr/0017-money-integer-cents" or "stripe-payment-gateway") is contained
in a returned result's `source`, ranked over the parent-deduped list the agent
actually sees.
"""
import argparse
import json
import logging
import sys
from pathlib import Path

logging.getLogger("httpx").setLevel(logging.WARNING)  # silence per-request 200 OK spam

sys.path.insert(0, str(Path(__file__).resolve().parent))

import config
from mcp_server import hybrid_search, expand_parents
from ollama_client import embed_query
from qdrant_client.models import Fusion, FusionQuery, Prefetch
from qdrant_store import DENSE, SPARSE, build_filter, get_client
from sparse import embed_sparse_query

KS = (3, 5, 8, 10)
KMAX = max(KS)
GOLDEN = Path(__file__).resolve().parent / "eval" / "golden.jsonl"


def load_golden() -> list[dict]:
    items = []
    for line in GOLDEN.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            items.append(json.loads(line))
    return items


def _filter_for(item: dict):
    wants_code = bool(item.get("include_code")) or bool(item.get("app"))
    return build_filter(exclude_code=not wants_code, app=item.get("app"))


def _fused(query: str, flt, fusion) -> list:
    """Dense+sparse prefetch fused with the given Fusion (RRF or DBSF)."""
    client = get_client()
    limit = max(KMAX * 3, KMAX)
    prefetch = [Prefetch(query=embed_query(query), using=DENSE, filter=flt,
                         limit=20, score_threshold=config.MIN_SCORE)]
    try:
        prefetch.append(Prefetch(query=embed_sparse_query(query), using=SPARSE,
                                 filter=flt, limit=20))
    except Exception:
        pass
    return client.query_points(
        collection_name=config.COLLECTION, prefetch=prefetch,
        query=FusionQuery(fusion=fusion), query_filter=flt,
        limit=limit, with_payload=True,
    ).points


def _search(query: str, flt, mode: str) -> list:
    """Retrieve raw points for one ablation mode against the live collection."""
    if mode == "hybrid":
        return hybrid_search(query, KMAX, flt)  # production path (RRF)
    if mode == "dbsf":
        return _fused(query, flt, Fusion.DBSF)
    client = get_client()
    limit = max(KMAX * 3, KMAX)
    if mode == "dense":
        return client.query_points(
            collection_name=config.COLLECTION,
            query=embed_query(query),
            using=DENSE,
            query_filter=flt,
            limit=limit,
            score_threshold=config.MIN_SCORE,
            with_payload=True,
        ).points
    if mode == "sparse":
        return client.query_points(
            collection_name=config.COLLECTION,
            query=embed_sparse_query(query),
            using=SPARSE,
            query_filter=flt,
            limit=limit,
            with_payload=True,
        ).points
    raise ValueError(mode)


def _rank_of_expected(item: dict, points: list) -> int:
    """1-based rank of expect_source in the parent-deduped list, or 0 if absent."""
    expect = item["expect_source"]
    results = expand_parents(points, KMAX)
    for i, r in enumerate(results, start=1):
        if expect in (r.get("source") or ""):
            return i
    return 0


def _metrics(ranks: list[int]) -> dict:
    n = len(ranks)
    out = {f"hit@{k}": sum(1 for r in ranks if 0 < r <= k) / n for k in KS}
    out["mrr"] = sum(1 / r for r in ranks if r > 0) / n
    out["n"] = n
    return out


def evaluate(items: list[dict]) -> dict:
    modes = ("dense", "sparse", "hybrid", "dbsf")
    ranks = {m: [] for m in modes}
    per_query = []
    for item in items:
        flt = _filter_for(item)
        row = {"q": item["q"], "expect": item["expect_source"], "cat": item["category"]}
        for m in modes:
            r = _rank_of_expected(item, _search(item["q"], flt, m))
            ranks[m].append(r)
            row[m] = r
        per_query.append(row)

    report = {"overall": {m: _metrics(ranks[m]) for m in modes}, "by_category": {}}
    for cat in ("semantic", "term"):
        idx = [i for i, it in enumerate(items) if it["category"] == cat]
        if idx:
            report["by_category"][cat] = {
                m: _metrics([ranks[m][i] for i in idx]) for m in modes
            }
    report["per_query"] = per_query
    return report


def min_score_sweep(items: list[dict], values=(0.25, 0.35, 0.45)) -> dict:
    original = config.MIN_SCORE
    out = {}
    try:
        for v in values:
            config.MIN_SCORE = v
            ranks = [_rank_of_expected(it, _search(it["q"], _filter_for(it), "hybrid"))
                     for it in items]
            out[v] = _metrics(ranks)
    finally:
        config.MIN_SCORE = original
    return out


def _fmt_table(title: str, rows: dict) -> str:
    lines = [f"### {title}", "", "| mode | hit@3 | hit@5 | hit@8 | hit@10 | MRR | n |",
             "|---|---|---|---|---|---|---|"]
    for mode, m in rows.items():
        lines.append(
            f"| {mode} | {m['hit@3']:.2f} | {m['hit@5']:.2f} | {m['hit@8']:.2f} "
            f"| {m['hit@10']:.2f} | {m['mrr']:.3f} | {m['n']} |"
        )
    return "\n".join(lines)


def render_markdown(report: dict, sweep: dict) -> str:
    parts = [_fmt_table("Overall (dense / sparse / hybrid)", report["overall"])]
    for cat, rows in report["by_category"].items():
        parts.append(_fmt_table(f"Category: {cat}", rows))
    sweep_lines = ["### MIN_SCORE sensitivity (hybrid)", "",
                   "| MIN_SCORE | hit@3 | hit@5 | hit@10 | MRR |", "|---|---|---|---|---|"]
    for v, m in sweep.items():
        sweep_lines.append(
            f"| {v} | {m['hit@3']:.2f} | {m['hit@5']:.2f} | {m['hit@10']:.2f} | {m['mrr']:.3f} |"
        )
    parts.append("\n".join(sweep_lines))
    misses = [r for r in report["per_query"] if r["hybrid"] == 0]
    if misses:
        parts.append("### Hybrid misses (rank 0 = not in top-10)\n\n" +
                     "\n".join(f"- ({r['cat']}) {r['q']}  → esperado `{r['expect']}`" for r in misses))
    return "\n\n".join(parts)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="write full report as JSON to this path")
    args = ap.parse_args()

    items = load_golden()
    print(f"Loaded {len(items)} golden queries from {GOLDEN.name}\n", file=sys.stderr)
    report = evaluate(items)
    sweep = min_score_sweep(items)
    md = render_markdown(report, sweep)
    print(md)
    print("\n> n pequeno (~30): confie so em efeitos grandes; deltas pequenos = ruido.")
    if args.json:
        Path(args.json).write_text(
            json.dumps({"report": report, "min_score_sweep": sweep}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        print(f"\nJSON escrito em {args.json}", file=sys.stderr)


if __name__ == "__main__":
    main()
