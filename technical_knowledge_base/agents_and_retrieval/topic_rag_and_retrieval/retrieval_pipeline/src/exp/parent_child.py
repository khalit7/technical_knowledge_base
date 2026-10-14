"""Small-to-big (parent-child) retrieval and sentence windows on QASPER, within each question's own paper
(the root Pipeline lab's setting and metric: a question is found when the text handed over covers >= 90% of one
evidence paragraph; text is handed over in rank order until a token budget is full).
Deterministic: reuses the bge-small vectors the root lab computed (sentence windows of semantic.py, paragraphs,
structure-256 chunks) and its question vectors. No model runs.
Rule for parents: rank the children; walk down the ranking; hand over each child's parent once (a parent already
handed over is skipped); a parent that does not fit the remaining budget is skipped (smaller ones may still fit).
Output: out/parent_child.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bisect
import json
import numpy as np
import rp

L = rp.L
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
import chunkers as C  # noqa: E402
import chunk_eval as CE  # noqa: E402

BUDGETS = [256, 512, 1024, 2048]


def main():
    tok = CE.load_tok()
    docs, qs = L.longdoc()
    D = {d["paper_id"]: C.Doc(d, tok) for d in docs}
    # ---- units, in the exact order semantic.py embedded them
    sent = {}          # paper -> list of dict(start, end, para)
    for d in docs:
        doc = D[d["paper_id"]]
        ss = []
        for pi, (s, e, _) in enumerate(doc.paragraphs()):
            for a, b in doc.sentences(s, e):
                ss.append({"start": a, "end": b, "para": pi, "i": len(ss)})
        sent[d["paper_id"]] = ss
    VW = np.load(L.path("pipe", "chunks", "semantic_windows.bge-small.npy"))
    assert VW.shape[0] == sum(len(v) for v in sent.values()), (VW.shape, sum(len(v) for v in sent.values()))
    i0 = 0
    for d in docs:
        for s in sent[d["paper_id"]]:
            s["v"] = i0; i0 += 1
    qids = open(L.path("pipe", "chunks", "questions.bge-small.ids")).read().split("\n")
    QV = np.load(L.path("pipe", "chunks", "questions.bge-small.npy")); qpos = {q: i for i, q in enumerate(qids)}
    def rows_of(strat):
        rows = [json.loads(l) for l in open(L.path("pipe", "chunks", strat + ".jsonl"))]
        V = np.load(L.path("pipe", "chunks", strat + ".bge-small.npy"))
        by = {}
        for i, r in enumerate(rows):
            r["v"] = i
            by.setdefault(r["paper_id"], []).append(r)
        return by, V
    para_by, VP = rows_of("paragraph")
    st_by, VS = rows_of("structure-256")

    def mk(pid, a, b):
        return {"start": a, "end": b, "n_tokens": D[pid].ntok(a, b)}

    def struct_of(pid, pos):
        cs = st_by[pid]
        k = bisect.bisect_right([c["start"] for c in cs], pos) - 1
        return cs[max(0, k)]

    def section_span(pid, pos):
        doc = D[pid]
        ps = doc.paragraphs()
        k = max(0, bisect.bisect_right([p[0] for p in ps], pos) - 1)
        sec = ps[k][2]
        same = [p for p in ps if p[2] == sec]
        # the contiguous run of paragraphs with this section name around k
        lo = k
        while lo > 0 and ps[lo - 1][2] == sec:
            lo -= 1
        hi = k
        while hi + 1 < len(ps) and ps[hi + 1][2] == sec:
            hi += 1
        return ps[lo][0], ps[hi][1]

    def ranked(children, V, q):
        s = V[[c["v"] for c in children]] @ QV[qpos[q["qid"]]]
        return [children[j] for j in np.argsort(-s, kind="stable")]

    def fill(units, budget):
        out, used, seen = [], 0, set()
        for u in units:
            key = (u["start"], u["end"])
            if key in seen:
                continue
            seen.add(key)
            if used + u["n_tokens"] <= budget:
                out.append(u); used += u["n_tokens"]
        return out

    STRATS = {
        "structure-256 (retrieve = return)": lambda pid, q: [mk(pid, c["start"], c["end"]) for c in ranked(st_by[pid], VS, q)],
        "paragraph (retrieve = return)": lambda pid, q: [mk(pid, c["start"], c["end"]) for c in ranked(para_by[pid], VP, q)],
        "sentence window: return the 3-sentence window": lambda pid, q: [mk(pid, sent[pid][max(0, i - 1)]["start"], sent[pid][min(len(sent[pid]) - 1, i + 1)]["end"])
                                                          for i in [s["i"] for s in ranked(sent[pid], VW, q)]],
        "sentence window: return +-3 sentences (LlamaIndex default)": lambda pid, q: [mk(pid, sent[pid][max(0, i - 3)]["start"], sent[pid][min(len(sent[pid]) - 1, i + 3)]["end"])
                                                          for i in [s["i"] for s in ranked(sent[pid], VW, q)]],
        "sentence -> parent paragraph": lambda pid, q: [mk(pid, *D[pid].paragraphs()[s["para"]][:2]) for s in ranked(sent[pid], VW, q)],
        "sentence -> parent structure-256 chunk": lambda pid, q: [mk(pid, struct_of(pid, s["start"])["start"], struct_of(pid, s["start"])["end"]) for s in ranked(sent[pid], VW, q)],
        "paragraph -> parent structure-256 chunk": lambda pid, q: [mk(pid, struct_of(pid, c["start"])["start"], struct_of(pid, c["start"])["end"]) for c in ranked(para_by[pid], VP, q)],
        "structure-256 -> parent section": lambda pid, q: [mk(pid, *section_span(pid, c["start"])) for c in ranked(st_by[pid], VS, q)],
    }
    # second lens: extractive answers (every span of one annotator's answer appears verbatim in the handed text)
    text = {d["paper_id"]: d["text"] for d in docs}
    ext = {}
    for q in qs:
        alts = [[x.strip() for x in a["text"].split(" | ") if x.strip()] for a in q["answers"] if a["type"] == "extractive"]
        alts = [a for a in alts if a and all(x in text[q["paper_id"]] for x in a)]
        if alts:
            ext[q["qid"]] = alts

    def ans_hit(ch, q):
        got = [text[q["paper_id"]][u["start"]:u["end"]] for u in ch]
        return any(all(any(x in g for g in got) for x in alt) for alt in ext[q["qid"]])

    res = {"n_questions": len(qs), "n_extractive": len(ext), "budgets": BUDGETS, "strategies": {}}
    for name, f in STRATS.items():
        hits = {b: 0 for b in BUDGETS}
        ahits = {b: 0 for b in BUDGETS}
        tok_used = {b: [] for b in BUDGETS}
        for q in qs:
            units = f(q["paper_id"], q)
            for b in BUDGETS:
                ch = fill(units, b)
                hits[b] += CE.hit(ch, q)
                if q["qid"] in ext:
                    ahits[b] += ans_hit(ch, q)
                tok_used[b].append(sum(u["n_tokens"] for u in ch))
        res["strategies"][name] = {"budget": {str(b): rp.r3(hits[b] / len(qs)) for b in BUDGETS},
                                   "answer": {str(b): rp.r3(ahits[b] / len(ext)) for b in BUDGETS},
                                   "tokens_used_mean": {str(b): round(float(np.mean(tok_used[b])), 1) for b in BUDGETS}}
        print(name, res["strategies"][name], flush=True)
    res["units"] = {"sentences": int(VW.shape[0]), "paragraphs": int(VP.shape[0]), "structure_chunks": int(VS.shape[0]),
                    "sentence_tokens_median": int(np.median([D[p].ntok(s["start"], s["end"]) for p in sent for s in sent[p]]))}
    rp.save("parent_child.json", res)


if __name__ == "__main__":
    main()
