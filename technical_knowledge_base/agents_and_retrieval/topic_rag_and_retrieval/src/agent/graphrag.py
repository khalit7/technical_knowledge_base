"""GraphRAG at small scale (labelled small-scale on the page): an entity graph built by the local generator over a subset
of the multi-hop corpus, with its indexing cost counted in tokens and seconds, then used two ways.

Subset: the own paragraphs (2 gold + 8 distractors) of the first 40 test questions, deduplicated.
Indexing (LightRAG-style, one generator call per paragraph): Qwen3-1.7B lists the entities in the paragraph and the
relations between them. The paragraph's title is always an entity (it is the Wikipedia article's subject). Entities are
merged across paragraphs by normalised name.
Local use (multi-hop retrieval): seeds = the dense top 2 paragraphs; expand through the graph to paragraphs that
mention an entity of the seeds or of the question; rank the expansion by dense score; compare "both gold paragraphs in
the top k" against dense alone on the same subset.
Global use (corpus-wide questions): Louvain communities over the entity graph, one summary per community by the
generator, questions answered map-reduce over the summaries (the GraphRAG global search shape), next to plain top-10
dense retrieval; no gold answers exist for these, so they are shown side by side, not scored.
usage: python -I -B graphrag.py index | local | communities | global | report   (index, communities, global: hold the bench lock)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import re
import time
from collections import Counter, defaultdict

import numpy as np

import gen as G
import search as S
from common import data, para_text, save, work, r3, normalize_answer

N_Q = 40
EXTRACT = ("Extract the named entities (people, places, organisations, works, events, dates) in the paragraph and the "
           "relations between them.\n\nParagraph: {title}: {text}\n\n"
           "Reply with one item per line, nothing else:\nENTITY | <name> | <type>\nREL | <entity> | <relation> | <entity>")
SUMMARY = ("Here are entities and relations from one cluster of a document collection, with the titles of the paragraphs they "
           "come from.\n\n{facts}\n\nWrite a summary of what this cluster is about in at most 3 sentences.")
MAP = ("Community summary:\n{s}\n\nQuestion: {q}\nIf the summary helps answer the question, write the relevant points in at most 2 "
       "sentences; otherwise reply NONE.")
REDUCE = "Notes from parts of a document collection:\n{notes}\n\nQuestion: {q}\nAnswer in at most 5 sentences, using only the notes."
NAIVE = "Paragraphs from a document collection:\n{ctx}\n\nQuestion: {q}\nAnswer in at most 5 sentences, using only the paragraphs."
GLOBAL_QS = ["What are the main themes of this collection of paragraphs?",
             "Which kinds of people appear most often in this collection, and what are they known for?",
             "Which countries or places come up most often, and in what context?"]


def subset():
    qs, _, by = data()
    pids = list(dict.fromkeys(p for q in qs[:N_Q] for p in q["own_context_pids"]))
    return qs[:N_Q], pids, by


def norm(e):
    e = normalize_answer(re.sub(r"\(.*?\)", "", e))
    return e


def index():
    _, pids, by = subset()
    cache = G.Cache("1.7b_graph")
    recs, tin, tout, secs = {}, 0, 0, 0.0
    t0 = time.time()
    for p in pids:
        r = G.chat(EXTRACT.format(title=by[p]["title"], text=by[p]["text"]), cache, "1.7b", max_tokens=300, tag="extract")
        tin += r["n_in"]; tout += r["n_out"]; secs += r["seconds"]
        ents, rels = [], []
        for line in r["text"].splitlines():
            f = [x.strip() for x in line.split("|")]
            if f[0].upper() == "ENTITY" and len(f) >= 2 and f[1]:
                ents.append([f[1], f[2] if len(f) > 2 else ""])
            elif f[0].upper() == "REL" and len(f) >= 4 and f[1] and f[3]:
                rels.append([f[1], f[2], f[3]])
        recs[p] = {"entities": ents, "relations": rels}
    meta = {"paragraphs": len(pids), "tok_in": tin, "tok_out": tout, "gen_seconds": round(secs, 1), "wall_seconds": round(time.time() - t0, 1),
            "corpus_tokens": sum(G.ntok(para_text(by[p])) for p in pids)}
    json.dump({"meta": meta, "recs": recs}, open(work("graph_extract.json"), "w"))
    print(meta)


def graph():
    import networkx as nx
    _, pids, by = subset()
    ex = json.load(open(work("graph_extract.json")))
    ent_par = defaultdict(set)   # entity -> paragraphs mentioning it
    name = {}
    Gr = nx.Graph()
    for p in pids:
        rec = ex["recs"][p]
        es = {norm(by[p]["title"])} | {norm(e[0]) for e in rec["entities"]}
        name.setdefault(norm(by[p]["title"]), by[p]["title"])
        for e in rec["entities"]:
            name.setdefault(norm(e[0]), e[0])
        es.discard("")
        for e in es:
            ent_par[e].add(p)
        for a, rel, b in rec["relations"]:
            a, b = norm(a), norm(b)
            if a and b and a != b:
                Gr.add_edge(a, b, rel=rel)
                ent_par[a].add(p); ent_par[b].add(p)
        t = norm(by[p]["title"])
        for e in es:
            if e != t:
                Gr.add_edge(t, e)
    return Gr, ent_par, name


def local():
    qs, pids, by = subset()
    Gr, ent_par, name = graph()
    par_ent = defaultdict(set)
    for e, ps in ent_par.items():
        for p in ps:
            par_ent[p].add(e)
    sub = set(pids)
    res = {"dense": {}, "graph": {}}
    examples = []
    for q in qs:
        dense = [p for p, _ in S.search(q["question"], 400) if p in sub]
        score = {p: i for i, p in enumerate(dense)}
        nq = " " + normalize_answer(q["question"]) + " "
        q_ents = {e for e in ent_par if len(e) > 3 and (" " + e + " ") in nq}
        seeds = dense[:2]
        frontier = set(q_ents)
        for s in seeds:
            frontier |= par_ent[s]
        expand = {p for e in frontier for p in ent_par.get(e, ())} - set(seeds)
        graph_rank = seeds + sorted(expand, key=lambda p: score.get(p, 999))
        rest = [p for p in dense if p not in graph_rank]
        graph_rank += rest
        for k in (2, 3, 5):
            res["dense"].setdefault(k, 0); res["graph"].setdefault(k, 0)
            res["dense"][k] += all(g in dense[:k] for g in q["gold_pids"])
            res["graph"][k] += all(g in graph_rank[:k] for g in q["gold_pids"])
        if len(examples) < 6 and all(g in graph_rank[:3] for g in q["gold_pids"]) != all(g in dense[:3] for g in q["gold_pids"]):
            link = [name.get(e, e) for e in frontier if set(q["gold_pids"]) & ent_par.get(e, set())][:4]
            examples.append({"qid": q["qid"], "question": q["question"], "dense3": [by[p]["title"] for p in dense[:3]],
                             "graph3": [by[p]["title"] for p in graph_rank[:3]], "gold": [by[p]["title"] for p in q["gold_pids"]],
                             "via": link})
    out = {"n_q": len(qs), "dense": res["dense"], "graph": res["graph"], "examples": examples,
           "nodes": Gr.number_of_nodes(), "edges": Gr.number_of_edges(), "entities": len(ent_par),
           "multi_par_entities": sum(1 for v in ent_par.values() if len(v) > 1)}
    json.dump(out, open(work("graph_local.json"), "w"))
    print(json.dumps({k: v for k, v in out.items() if k != "examples"}))


def communities():
    import networkx as nx
    _, pids, by = subset()
    Gr, ent_par, name = graph()
    comms = nx.community.louvain_communities(Gr, seed=0)
    comms = sorted(comms, key=len, reverse=True)
    ex = json.load(open(work("graph_extract.json")))
    cache = G.Cache("1.7b_graph")
    out, tin, tout, secs = [], 0, 0, 0.0
    big = [c for c in comms if len(c) >= 8]
    for i, c in enumerate(big):
        ps = Counter(p for e in c for p in ent_par.get(e, ()))
        facts = []
        for p, _ in ps.most_common(6):
            for a, rel, b in ex["recs"][p]["relations"][:6]:
                if norm(a) in c or norm(b) in c:
                    facts.append("%s %s %s (%s)" % (a, rel, b, by[p]["title"]))
        facts = facts[:30] or ["%s (%s)" % (name.get(e, e), "entity") for e in list(c)[:30]]
        r = G.chat(SUMMARY.format(facts="\n".join(facts)), cache, "1.7b", max_tokens=120, tag="summary")
        tin += r["n_in"]; tout += r["n_out"]; secs += r["seconds"]
        out.append({"id": i, "size": len(c), "paragraphs": len(ps), "top": [name.get(e, e) for e in sorted(c, key=lambda e: -Gr.degree(e))[:6]],
                    "summary": r["text"]})
    meta = {"communities": len(comms), "summarised": len(big), "tok_in": tin, "tok_out": tout, "gen_seconds": round(secs, 1)}
    json.dump({"meta": meta, "comms": out}, open(work("graph_comms.json"), "w"))
    print(meta)


def global_qs():
    _, pids, by = subset()
    C = json.load(open(work("graph_comms.json")))
    cache = G.Cache("1.7b_graph")
    out = []
    for q in GLOBAL_QS:
        notes, tin, tout, secs = [], 0, 0, 0.0
        for c in C["comms"]:
            r = G.chat(MAP.format(s=c["summary"], q=q), cache, "1.7b", max_tokens=80, tag="map")
            tin += r["n_in"]; tout += r["n_out"]; secs += r["seconds"]
            if "NONE" not in r["text"].upper()[:8]:
                notes.append(r["text"])
        r = G.chat(REDUCE.format(notes="\n".join("- " + n for n in notes), q=q), cache, "1.7b", max_tokens=200, tag="reduce")
        tin += r["n_in"]; tout += r["n_out"]; secs += r["seconds"]
        g = {"answer": r["text"], "calls": len(C["comms"]) + 1, "tok_in": tin, "tok_out": tout, "seconds": round(secs, 1), "notes_used": len(notes)}
        sub = set(pids)
        top = [p for p, _ in S.search(q, 400) if p in sub][:10]
        rn = G.chat(NAIVE.format(ctx="\n".join("[%d] %s" % (i + 1, para_text(by[p])) for i, p in enumerate(top)), q=q), cache, "1.7b", max_tokens=200, tag="naive")
        n = {"answer": rn["text"], "calls": 1, "tok_in": rn["n_in"], "tok_out": rn["n_out"], "seconds": rn["seconds"], "titles": [by[p]["title"] for p in top]}
        out.append({"q": q, "graph": g, "naive": n})
        print(q, "graph tok", tin + tout, "naive tok", rn["n_in"] + rn["n_out"])
    json.dump(out, open(work("graph_global.json"), "w"))


def report():
    ex = json.load(open(work("graph_extract.json")))["meta"]
    loc = json.load(open(work("graph_local.json")))
    com = json.load(open(work("graph_comms.json")))
    glo = json.load(open(work("graph_global.json")))
    save("graphrag.json", {"index": ex, "local": loc, "communities": {"meta": com["meta"], "list": com["comms"][:12]}, "global": glo})


if __name__ == "__main__":
    {"index": index, "local": local, "communities": communities, "global": global_qs, "report": report}[sys.argv[1]]()
