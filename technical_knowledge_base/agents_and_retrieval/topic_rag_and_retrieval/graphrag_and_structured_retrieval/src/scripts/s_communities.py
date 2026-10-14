"""graphrag 3.3.0's "fast" indexing path on the multi-hop corpus, run with graphrag's own functions (no LLM):
noun-phrase nodes (s_nlp_extract.py) -> co-occurrence edges weighted by PMI (graphs/edge_weights.py) ->
prune_graph with the defaults of config/defaults.py (min_node_freq 2, min_node_degree 1, min_edge_weight_pct 40,
remove_ego_nodes True) -> cluster_graph (hierarchical Leiden, max_cluster_size 10, use_lcc True, seed 0xDEADBEEF).
Also Louvain (networkx, seed 0) on the same graph, to count communities that are not internally connected.

Graphs: "subset" = the own paragraphs of the first 40 test questions (the root Agentic lab's GraphRAG subset);
"full" = all 9,760 paragraphs. With argument "agt" (or "<model>_<n>" for s_extract.py output), the subset graph is built from the Agentic lab's LLM extraction
instead ($RAG_SCRATCH/agt/graph_extract.json, Qwen3-1.7B), entities upper-cased and merged by exact name as graphrag does.
Run with the graphrag env: $RAG_SCRATCH/gr/grenv/bin/python -I -B s_communities.py [nlp|agt|<model>_<n>]
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict
from itertools import combinations

import networkx as nx
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, hotpot, save, work  # noqa: E402

from graphrag.graphs.edge_weights import calculate_pmi_edge_weights  # noqa: E402
from graphrag.index.operations.cluster_graph import cluster_graph  # noqa: E402
from graphrag.index.operations.prune_graph import prune_graph  # noqa: E402

MODE = sys.argv[1] if len(sys.argv) > 1 else "nlp"
qs, corpus, by = hotpot()
SUB = list(dict.fromkeys(p for q in qs[:40] for p in q["own_context_pids"]))


def nlp_units(pids):
    ph = json.load(open(work("nlp_phrases.json")))["phrases"]
    return {p: ph[p] for p in pids}


def llm_units(pids):
    """graphrag merges entities by exact upper-cased title (graph_extractor.py clean_str(...upper())).
    MODE "agt": the Agentic lab's extraction; "<model>_<n>": s_extract.py's graphrag-prompt extraction."""
    if MODE == "agt":
        ex = json.load(open(L.path("agt", "graph_extract.json")))["recs"]
    else:
        ex = {r["pid"]: {"entities": [[e[0]] for e in r["entities"]], "relations": [[x[0], "", x[1]] for x in r["relations"]]}
              for r in json.load(open(work("extract_%s.json" % MODE)))}
    out = {}
    for p in pids:
        if p not in ex:
            continue
        r = ex[p]
        names = {re.sub(r"\s+", " ", e[0]).strip().upper() for e in r["entities"]}
        names |= {re.sub(r"\s+", " ", x).strip().upper() for a, _, b in r["relations"] for x in (a, b)}
        out[p] = sorted(n for n in names if n)
    return out


def build(units):
    """graphrag build_noun_graph._extract_edges: nodes = phrases, frequency = text units; edges = co-occurrence in a
    unit, weight = shared units, then PMI (normalize_edge_weights True)."""
    t2ids = defaultdict(list)
    for p, v in units.items():
        for x in v:
            t2ids[x].append(p)
    nodes = pd.DataFrame([{"title": t, "frequency": len(i), "text_unit_ids": i} for t, i in t2ids.items()])
    em = defaultdict(list)
    for p, v in units.items():
        for a, b in combinations(sorted(set(v)), 2):
            em[(a, b)].append(p)
    edges = pd.DataFrame([{"source": a, "target": b, "weight": len(i), "text_unit_ids": i} for (a, b), i in em.items()])
    edges = calculate_pmi_edge_weights(nodes, edges)
    return nodes, edges


def disconnected(G, comms):
    return sum(1 for c in comms if len(c) > 1 and not nx.is_connected(G.subgraph(c)))


def run(name, units):
    nodes, edges = build(units)
    n0, e0 = len(nodes), len(edges)
    pn, pe = prune_graph(nodes, edges, min_node_freq=2, min_node_degree=1, min_edge_weight_pct=40, remove_ego_nodes=True, lcc_only=False)
    comms = cluster_graph(pe, max_cluster_size=10, use_lcc=True, seed=0xDEADBEEF)
    G = nx.Graph()
    for s, t, w in zip(pe["source"], pe["target"], pe["weight"]):
        G.add_edge(s, t, weight=float(w))
    lcc = G.subgraph(max(nx.connected_components(G), key=len)).copy()
    lev = Counter(c[0] for c in comms)
    lev0 = [set(c[3]) for c in comms if c[0] == 0]
    louv = nx.community.louvain_communities(lcc, weight="weight", seed=0)
    ego = [t for t in nodes["title"] if t not in set(pn["title"])]
    deg = dict(G.degree())
    res = {"units": len(units), "nodes": n0, "edges": e0, "pruned_nodes": len(pn), "pruned_edges": len(pe),
           "lcc_nodes": lcc.number_of_nodes(), "lcc_edges": lcc.number_of_edges(),
           "levels": {str(k): v for k, v in sorted(lev.items())},
           "leiden_l0": len(lev0), "leiden_l0_sizes": sorted((len(c) for c in lev0), reverse=True)[:12],
           "leiden_l0_disconnected": disconnected(lcc, lev0),
           "louvain": len(louv), "louvain_sizes": sorted((len(c) for c in louv), reverse=True)[:12],
           "louvain_disconnected": disconnected(lcc, louv),
           "top_degree": sorted(deg, key=lambda x: -deg[x])[:10], "removed_sample": ego[:0]}
    print(name, json.dumps({k: v for k, v in res.items() if k != "top_degree"}))
    return res, pn, pe, comms


def main():
    if MODE != "nlp":
        res, pn, pe, comms = run("subset_" + MODE, llm_units(SUB))
        json.dump({"nodes": pn.drop(columns=[c for c in pn.columns if c not in ("title", "frequency", "text_unit_ids")]).to_dict("records"),
                   "edges": pe[["source", "target", "weight"]].to_dict("records"), "comms": comms}, open(work("graph_subset_%s.json" % MODE), "w"), default=str)
        save("communities_%s.json" % MODE, {"subset": res})
        return
    out = {}
    out["subset"], pn, pe, comms = run("subset", nlp_units(SUB))
    json.dump({"nodes": pn[["title", "frequency", "text_unit_ids"]].to_dict("records"), "edges": pe[["source", "target", "weight"]].to_dict("records"),
               "comms": comms, "pids": SUB}, open(work("graph_subset_nlp.json"), "w"), default=str)
    out["full"], *_ = run("full", nlp_units([p["pid"] for p in corpus]))
    save("communities.json", out)


if __name__ == "__main__":
    main()
