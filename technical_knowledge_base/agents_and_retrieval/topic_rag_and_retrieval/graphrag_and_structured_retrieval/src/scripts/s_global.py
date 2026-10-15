"""Global search, graphrag-style, on the 394-paragraph subset, with graphrag 3.3.0's own prompts and the local generator.
1. Community reports: one per level-0 Leiden community of the fast-path (NLP) graph (s_communities.py), written with
   graphrag's fast-mode prompt COMMUNITY_REPORT_TEXT_PROMPT (prompts/index/community_report_text_units.py), whose input is
   the text units of the community: here the paragraphs that contain the most member phrases, up to CTX tokens.
2. Map: for each question, every report goes through MAP_SYSTEM_PROMPT (points with a 0-100 importance score).
3. Reduce: points with score > 0 sorted by score (global_search/search.py) into REDUCE_SYSTEM_PROMPT.
Baseline: the dense top 10 paragraphs of the subset (bge-small) into the Agentic lab's naive prompt.
Departures from graphrag's defaults, to fit a 4B model on a laptop (said on the page): max_report_length 300 words
(default 2,000), map max_length 200 (default 1,000), reduce max_length 300 (default 2,000), one level only.
usage (graphrag env): $RAG_SCRATCH/gr/grenv/bin/python -I -B s_global.py run <1.7b|4b>    GENERATOR: bench lock
                      $RAG_SCRATCH/gr/grenv/bin/python -I -B s_global.py summary <1.7b|4b>
"""
import json
import os
import re
import sys
from collections import Counter

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, generator, hotpot, para_text, save, work  # noqa: E402

try:  # the graphrag env; the shared env only runs "encode"
    from graphrag.prompts.index.community_report_text_units import COMMUNITY_REPORT_TEXT_PROMPT  # noqa: E402
    from graphrag.prompts.query.global_search_map_system_prompt import MAP_SYSTEM_PROMPT  # noqa: E402
    from graphrag.prompts.query.global_search_reduce_system_prompt import REDUCE_SYSTEM_PROMPT  # noqa: E402
except ImportError:
    pass

CTX = 2500  # tokens of paragraphs per community report
QUESTIONS = ["What are the main themes of this collection of paragraphs?",
             "Which kinds of people appear most often in this collection, and what are they known for?",
             "Which countries or places come up most often, and in what context?",
             "Which sports appear in this collection, and which teams or athletes represent them?",
             "What kinds of films and television works are described, and who made them?"]
NAIVE = "Paragraphs from a document collection:\n{ctx}\n\nQuestion: {q}\nAnswer in at most 5 sentences, using only the paragraphs."


def ntok_fn():
    from tokenizers import Tokenizer
    t = Tokenizer.from_file(os.path.join(L.path("models", "Qwen3-Embedding-0.6B"), "tokenizer.json"))
    return lambda s: len(t.encode(s, add_special_tokens=False).ids)


def communities():
    g = json.load(open(work("graph_subset_nlp.json")))
    l0 = [c for c in g["comms"] if c[0] == 0]
    nodes = {n["title"]: n for n in g["nodes"]}
    return l0, nodes, g["pids"]


def report_inputs(by, ntok):
    l0, nodes, pids = communities()
    out = []
    for lvl, cid, parent, members in l0:
        cnt = Counter(p for m in members for p in (eval(nodes[m]["text_unit_ids"]) if isinstance(nodes[m]["text_unit_ids"], str) else nodes[m]["text_unit_ids"]))
        text, used, tk = [], [], 0
        for p, _ in cnt.most_common():
            t = "id: %s\n%s" % (p, para_text(by[p]))
            n = ntok(t)
            if tk + n > CTX:
                break
            text.append(t); used.append(p); tk += n
        out.append({"cid": cid, "members": members, "pids": used, "covered": sorted(cnt), "input": "\n\n".join(text)})
    return out


def qvecs():
    """bge-small query vectors of the global questions (this env has no torch: written once by the shared env,
    `$RAG_SCRATCH/venv/bin/python -I -B s_global.py encode`)."""
    return json.load(open(work("global_qvec.json")))


def parse_json(t):
    m = re.search(r"\{.*\}", t, re.S)
    try:
        return json.loads(m.group(0)) if m else None
    except Exception:  # noqa: BLE001
        return None


def main():
    a = sys.argv[1:]
    if a[0] == "encode":
        enc = L.encoder("bge-small", device="cpu")
        V = enc.encode(QUESTIONS, prompt=L.query_prefix("bge-small", "hotpotqa"), normalize_embeddings=True)
        json.dump({q: v.tolist() for q, v in zip(QUESTIONS, V)}, open(work("global_qvec.json"), "w"))
        return
    model = a[1]
    offline = a[0] == "summary"
    qs, corpus, by = hotpot()
    ntok = ntok_fn()
    G, mkcache = generator()
    cache = mkcache("global_" + model)
    R = report_inputs(by, ntok)
    reports, cost = [], Counter()
    for r in R:
        res = G.chat(COMMUNITY_REPORT_TEXT_PROMPT.format(input_text=r["input"], max_report_length=300), cache, model, max_tokens=700, tag="report", offline=offline)
        if res is None:
            print("not cached"); return
        cost["report_in"] += res["n_in"]; cost["report_out"] += res["n_out"]; cost["report_s"] += res["seconds"]
        js = parse_json(res["text"]) or {}
        reports.append({"cid": r["cid"], "title": js.get("title", "")[:120], "summary": js.get("summary", res["text"][:600])[:900],
                        "rating": js.get("rating"), "n_members": len(r["members"]), "top_members": r["members"][:8],
                        "n_paragraphs": len(r["covered"]), "pids_read": len(r["pids"]), "parsed": bool(js)})
    sub = set(communities()[2])
    ids, X = L.embeddings("hotpotqa", "bge-small")
    X = np.asarray(X); idx = {p: i for i, p in enumerate(ids)}
    answers = []
    for q in QUESTIONS:
        pts, c, mp = [], Counter(), []
        for i, rp in enumerate(reports):
            ctx = "-----Reports-----\nid|title|content\n%d|%s|%s" % (i, rp["title"], rp["summary"])
            res = G.chat([{"role": "system", "content": MAP_SYSTEM_PROMPT.format(context_data=ctx, max_length=200)}, {"role": "user", "content": q}],
                         cache, model, max_tokens=400, tag="map", offline=offline)
            if res is None:
                print("not cached"); return
            c["calls"] += 1; c["in"] += res["n_in"]; c["out"] += res["n_out"]; c["s"] += res["seconds"]
            got = (parse_json(res["text"]) or {}).get("points", [])
            best = 0
            for p in got if isinstance(got, list) else []:
                try:
                    sc = int(p.get("score", 0))
                except Exception:  # noqa: BLE001
                    sc = 0
                best = max(best, sc)
                if sc > 0:
                    pts.append((sc, i, str(p.get("description", ""))[:500]))
            mp.append([i, best, sum(1 for x in pts if x[1] == i), (pts[-1][2][:160] if pts and pts[-1][1] == i else "")])
        pts.sort(key=lambda x: -x[0])
        rd = "\n".join("----Analyst %d----\nImportance Score: %d\n%s" % (i + 1, s, d) for i, (s, _, d) in enumerate(pts[:30]))
        res = G.chat([{"role": "system", "content": REDUCE_SYSTEM_PROMPT.format(report_data=rd, response_type="multiple paragraphs", max_length=300)},
                      {"role": "user", "content": q}], cache, model, max_tokens=500, tag="reduce", offline=offline)
        if res is None:
            print("not cached"); return
        c["calls"] += 1; c["in"] += res["n_in"]; c["out"] += res["n_out"]; c["s"] += res["seconds"]
        qv = np.asarray(qvecs()[q], dtype=np.float32)
        top = sorted(sub, key=lambda p: -float(X[idx[p]] @ qv))[:10]
        rn = G.chat(NAIVE.format(ctx="\n".join("[%d] %s" % (i + 1, para_text(by[p])) for i, p in enumerate(top)), q=q), cache, model, max_tokens=300, tag="naive", offline=offline)
        if rn is None:
            print("not cached"); return
        used = sorted({i for _, i, _ in pts})
        answers.append({"q": q, "global": res["text"], "naive": rn["text"], "points": len(pts), "reports_used": len(used), "map": mp,
                        "paragraphs_behind_points": len({p for i in used for p in R[i]["covered"]}),
                        "naive_titles": [by[p]["title"] for p in top], "cost_global": dict(c),
                        "cost_naive": {"calls": 1, "in": rn["n_in"], "out": rn["n_out"], "s": rn["seconds"]}})
    save("global_%s.json" % model, {"reports": reports, "report_cost": dict(cost), "answers": answers, "ctx_tokens": CTX, "n_paragraphs": len(sub)})


if __name__ == "__main__":
    main()
