"""Entity resolution measured against HotpotQA's gold entities: every paragraph is a Wikipedia article whose title is
its subject, and a bridge question's two gold paragraphs are joined by a mention (paragraph A names the subject of
paragraph B). So two things are checkable without hand labels:
  title recall   does the extraction from paragraph P contain P's own title (after resolution)?
  link recall    for a bridge question with gold paragraphs A and B, does the graph join them: a mention in A that
                 resolves to B's title, or one in B that resolves to A's?
Resolution strategies (mention -> title node), from strictest to loosest:
  exact     upper-cased string equality (graphrag 3.3.0 merges entities this way, graph_extractor.py clean_str(...upper()))
  norm      HotpotQA answer normalisation, parentheses removed ("Kiss and Tell (1945 film)" = "kiss and tell")
  subset    the mention's tokens are a subset of one title's tokens and cover at least half of them ("Conan Doyle")
  embed     bge-small cosine to the nearest title >= 0.85 (CPU)
Merges a strategy makes that exact matching does not are counted, with how many are ambiguous (more than one title).
Extractions: "nlp" = graphrag's noun phrases (s_nlp_extract.py) on all 9,760 paragraphs and on the 394-paragraph subset;
"llm" = the root Agentic lab's Qwen3-1.7B extraction on the subset ($RAG_SCRATCH/agt/graph_extract.json), when present.
Run: $RAG_SCRATCH/venv/bin/python -I -B s_entities.py [nlp|agt|<model>_<n>]
"""
import json
import os
import random
import re
import sys
from collections import defaultdict

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, hotpot, normalize_answer, save, work  # noqa: E402

MODE = sys.argv[1] if len(sys.argv) > 1 else "nlp"
qs, corpus, by = hotpot()
SUB = list(dict.fromkeys(p for q in qs[:40] for p in q["own_context_pids"]))
SUBQ = qs[:40]


def norm(s):
    return normalize_answer(re.sub(r"\(.*?\)", "", s))


def mentions(kind):
    if kind == "nlp":
        return json.load(open(work("nlp_phrases.json")))["phrases"]
    return llm_mentions(kind)


def llm_mentions(kind):
    """kind "agt": the root Agentic lab's Qwen3-1.7B one-call extraction; "<model>_<n>": this page's graphrag-prompt
    extraction (s_extract.py, $RAG_SCRATCH/gr/extract_<model>_<n>.json)"""
    out = {}
    if kind == "agt":
        ex = json.load(open(L.path("agt", "graph_extract.json")))["recs"]
        for p, r in ex.items():
            m = [e[0] for e in r["entities"]] + [x for a, _, b in r["relations"] for x in (a, b)]
            out[p] = sorted({x.strip() for x in m if x.strip()})
        return out
    for r in json.load(open(work("extract_%s.json" % kind))):
        m = [e[0] for e in r["entities"]] + [x for x in (y for rel in r["relations"] for y in rel[:2])]
        out[r["pid"]] = sorted({x.strip() for x in m if x.strip()})
    return out


class Resolver:
    def __init__(self, pids):
        self.pids = pids
        self.titles = sorted({by[p]["title"] for p in pids})
        self.up = defaultdict(set); self.nm = defaultdict(set); self.tok = {}
        for t in self.titles:
            self.up[t.upper()].add(t); self.nm[norm(t)].add(t); self.tok[t] = set(norm(t).split())
        self.inv = defaultdict(set)
        for t, ts in self.tok.items():
            for w in ts:
                self.inv[w].add(t)
        self.enc = None

    def embed_titles(self):
        if self.enc is None:
            self.enc = L.encoder("bge-small", device="cpu")
            self.TV = self.enc.encode([norm(t) for t in self.titles], batch_size=256, normalize_embeddings=True, show_progress_bar=False)
        return self.TV

    def resolve(self, m, how, cache):
        if how == "exact":
            return self.up.get(m.upper(), set())
        r = self.nm.get(norm(m), set())
        if how == "norm" or r:
            return set(r) if how == "norm" else r
        if how == "subset":
            w = set(norm(m).split())
            if not w:
                return set()
            cand = set.intersection(*(self.inv.get(x, set()) for x in w)) if all(x in self.inv for x in w) else set()
            return {t for t in cand if len(w) * 2 >= len(self.tok[t])}
        if how == "embed":
            return cache.get(m, set())
        return set()


def run(kind, pids, qset, embed=True):
    M = mentions(kind) if kind == "nlp" else llm_mentions(kind)
    R = Resolver(pids)
    ecache = {}
    if embed:
        allm = sorted({x for p in pids for x in M.get(p, [])})
        TV = R.embed_titles()
        MV = R.enc.encode([norm(x) or x.lower() for x in allm], batch_size=256, normalize_embeddings=True, show_progress_bar=False)
        for s in range(0, len(allm), 4096):
            S = MV[s:s + 4096] @ TV.T
            j = S.argmax(1)
            for i, (jj, row) in enumerate(zip(j, S)):
                ecache[allm[s + i]] = {R.titles[jj]} if row[jj] >= 0.85 else set()
    res = {}
    for how in ("exact", "norm", "subset", "embed") if embed else ("exact", "norm", "subset"):
        own = 0; merges = 0; amb = 0; samples = []
        res_p = {}
        for p in pids:
            ts = set()
            for m in M.get(p, []):
                r = R.resolve(m, how, ecache)
                if r and not R.resolve(m, "exact", ecache):
                    merges += 1; amb += len(r) > 1
                    samples.append([m, sorted(r)[0], p])
                ts |= r
            res_p[p] = ts
            own += by[p]["title"] in ts
        link = tot = 0
        for q in qset:
            if q["type"] != "bridge":
                continue
            a, b = q["gold_pids"]
            tot += 1
            link += by[b]["title"] in res_p[a] or by[a]["title"] in res_p[b]
        random.Random(0).shuffle(samples)
        res[how] = {"title_recall": own, "paragraphs": len(pids), "bridge_link": link, "bridge_q": tot, "new_merges": merges,
                    "ambiguous": amb, "sample": samples[:40]}
        print(kind, how, {k: v for k, v in res[how].items() if k != "sample"})
    return res


def main():
    if MODE != "nlp":  # agt | <model>_<n>
        M = llm_mentions(MODE)
        pids = [p for p in SUB if p in M]
        qset = [q for q in SUBQ if all(p in M for p in q["gold_pids"])]
        out = {"subset": run(MODE, pids, qset), "nlp_same": run("nlp", pids, qset)}  # the noun phrases on the same paragraphs
        if MODE != "agt":
            out["agt_same"] = run("agt", pids, qset)
        save("entities_%s.json" % MODE, out)
        return
    out = {"subset": run("nlp", SUB, SUBQ), "full": run("nlp", [p["pid"] for p in corpus], qs)}
    save("entities.json", out)


if __name__ == "__main__":
    main()
