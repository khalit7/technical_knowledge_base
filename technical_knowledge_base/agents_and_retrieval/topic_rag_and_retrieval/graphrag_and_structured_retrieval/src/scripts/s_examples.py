"""Small, deterministic extracts the labs embed (no model calls):
  ba.json     Before/after lab: for each of the 200 HotpotQA questions, the top 5 of dense, hybrid and three graph
              retrievers (s_ppr.py), gold marked, and for the title-link expansion the sentence that links a seed to
              each added paragraph
  build.json  Graph build lab: for five questions of the 40-question subset, their 10 paragraphs, the noun phrases
              graphrag's extractor found in each, which phrases survive prune_graph, their Leiden communities and the
              co-occurrence edges among them, with a fixed layout (networkx spring_layout, seed 0); and the community
              hierarchy of the whole subset graph for the explorer
Run: $RAG_SCRATCH/venv/bin/python -I -B s_examples.py
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

import networkx as nx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import hotpot, normalize_answer, save, work  # noqa: E402

SYS = ["dense", "hybrid", "expand_title", "ppr_title_dense", "ppr_bipartite_pruned"]
qs, corpus, by = hotpot()


def tkey(t):
    return normalize_answer(re.sub(r"\(.*?\)", "", t))


def link_sentence(a, b):
    """a sentence of paragraph a that names paragraph b's title (normalised match), or of b naming a's title"""
    for x, y, d in ((a, b, ">"), (b, a, "<")):
        k = tkey(by[y]["title"])
        for s in by[x]["sentences"]:
            if k and (" " + k + " ") in (" " + normalize_answer(s) + " "):
                return [d, s.strip()[:180]]
    return None


def ba():
    per = json.load(open(work("ppr_perq.json")))
    titles, tix = [], {}

    def T(p):
        if p not in tix:
            tix[p] = len(titles); titles.append(by[p]["title"])
        return tix[p]
    rows = []
    for q in qs:
        v = per[q["qid"]]
        tops = {s: [T(p) for p in v["_top5"][s]] for s in SYS}
        seeds = v["_top5"]["dense"][:2]
        links = {}
        for p in v["_top5"]["expand_title"][2:]:
            if p not in q["gold_pids"]:
                continue  # only the links that brought in a gold paragraph are shown
            for s in seeds:
                ls = link_sentence(s, p)
                if ls:
                    links[T(p)] = [T(s)] + ls
                    break
        rows.append({"id": q["qid"], "q": q["question"], "t": q["type"][0], "a": q["answer"], "g": [T(p) for p in q["gold_pids"]], "top": tops,
                     "lk": links})
    return {"titles": titles, "systems": SYS, "rows": rows}


def graph_view(g, ph, chosen):
    """the animation's data for the chosen questions, from one subset graph (g) and its per-paragraph names (ph)"""
    surv = {n["title"] for n in g["nodes"]}
    l0, l1 = {}, {}
    for lvl, cid, parent, members in g["comms"]:
        for m in members:
            {0: l0, 1: l1}.get(lvl, {})[m] = cid
    G = nx.Graph(); G.add_weighted_edges_from((e["source"], e["target"], float(e["weight"])) for e in g["edges"])
    out = []
    for q in chosen:
        pids = q["own_context_pids"]
        allp = sorted({x for p in pids for x in ph.get(p, [])})
        keep = [x for x in allp if x in surv]
        sub = G.subgraph(keep).copy()
        pos = nx.spring_layout(sub, seed=0, k=0.6) if sub.number_of_nodes() else {}
        cnt = Counter(x for p in pids for x in ph.get(p, []))
        a, b = q["gold_pids"]
        out.append({"q": q["question"], "type": q["type"], "answer": q["answer"], "gold": [pids.index(p) for p in q["gold_pids"]],
                    "paras": [{"title": by[p]["title"], "phr": ph.get(p, []), "words": len(by[p]["text"].split())} for p in pids],
                    "nodes": [{"t": x, "in": [i for i, p in enumerate(pids) if x in ph.get(p, [])], "s": x in surv, "c0": l0.get(x), "c1": l1.get(x),
                               "xy": [round(float(pos[x][0]), 3), round(float(pos[x][1]), 3)] if x in pos else None} for x in allp if cnt[x] > 1 or x in surv],
                    "edges": [[keep.index(u), keep.index(v)] for u, v in sub.edges()],
                    "shared": sorted((set(ph.get(a, [])) & set(ph.get(b, []))) & surv),
                    "n_phr_total": sum(len(ph.get(p, [])) for p in pids), "n_distinct": len(allp), "n_keep": len(keep)})
    return out


def build():
    g = json.load(open(work("graph_subset_nlp.json")))
    ph = json.load(open(work("nlp_phrases.json")))["phrases"]
    surv = {n["title"] for n in g["nodes"]}
    E = [(e["source"], e["target"], float(e["weight"])) for e in g["edges"]]
    G = nx.Graph(); G.add_weighted_edges_from(E)
    deg = dict(G.degree())
    # explorer: hierarchy of the whole pruned subset graph
    comms = defaultdict(list)
    for lvl, cid, parent, members in g["comms"]:
        comms[lvl].append({"id": cid, "parent": parent, "n": len(members), "top": sorted(members, key=lambda m: -deg.get(m, 0))[:8],
                           "paras": len({p for m in members for p in nodes_pids(g, m)})})
    # five questions for the animation: three bridge questions whose gold pair shares a surviving phrase, one whose
    # pair shares none, one comparison
    picks = [(q, bool((set(ph[q["gold_pids"][0]]) & set(ph[q["gold_pids"][1]])) & surv)) for q in qs[:40]]
    chosen = [q for q, s_ in picks if s_ and q["type"] == "bridge"][:3] + [q for q, s_ in picks if not s_ and q["type"] == "bridge"][:1] + \
             [q for q, s_ in picks if q["type"] == "comparison"][:1]
    out = {"questions": graph_view(g, ph, chosen), "hierarchy": {str(k): v for k, v in comms.items()}, "n_nodes": len(surv), "n_edges": len(E)}
    # the same questions on an LLM-extracted graph, when one exists (this page's graphrag-prompt run, else the Agentic lab's)
    for mode in ("1.7b_394", "agt"):
        f = work("graph_subset_%s.json" % mode)
        if os.path.exists(f):
            sys.argv = ["s_entities", mode]
            import s_entities as SE
            out["llm"] = {"source": mode, "questions": graph_view(json.load(open(f)), {p: sorted({re.sub(r"\s+", " ", x).strip().upper() for x in v}) for p, v in SE.llm_mentions(mode).items()}, chosen)}
            break
    return out


def nodes_pids(g, m):
    if not hasattr(nodes_pids, "d"):
        nodes_pids.d = {}
        for n in g["nodes"]:
            t = n["text_unit_ids"]
            nodes_pids.d[n["title"]] = t if isinstance(t, list) else json.loads(t.replace("'", '"'))
    return nodes_pids.d.get(m, [])


if __name__ == "__main__":
    save("ba.json", ba())
    save("build.json", build())
