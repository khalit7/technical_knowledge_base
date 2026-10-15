"""Per-dataset statistics for the Post-training data lab: lengths (Qwen3 tokens), turns, languages, exact and near
duplicates, judge scores and the chosen-vs-rejected length bias. Writes $DC_SCRATCH/post/stats_rows.jsonl.gz (one
line per row, all fields the filters and the page need) and out/stats.json (aggregates the page embeds).

usage: DC_SCRATCH=... OMP_NUM_THREADS=4 nice -n 15 python -I -B pt_stats.py
"""
import gzip
import json
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pt_common as P  # noqa: E402

EDGES = [0, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]


def lid(texts):
    import fasttext
    fasttext.FastText.eprint = lambda *a, **k: None
    m = lid.m = getattr(lid, "m", None) or fasttext.load_model(P.L.model_path("lid176"))
    out = []
    for t in texts:
        lab, sc = m.predict((t or "").replace("\n", " ")[:2000], k=1)
        out.append((lab[0].replace("__label__", ""), round(float(sc[0]), 3)))
    return out


def dup_info(texts):
    """exact: index of the first row with the same normalised text (or -1); near: MinHash cluster id (or -1)."""
    first, exact = {}, []
    for k, t in enumerate(texts):
        n = P.norm(t)
        exact.append(first.setdefault(n, k) if n else -1)
    exact = [e if e != k else -1 for k, e in enumerate(exact)]
    cid, pairs = P.near_dup_clusters(texts)
    return exact, cid, pairs


def summarise(rows, fields, group=None):
    out = {}
    groups = {"all": rows}
    if group:
        for r in rows:
            groups.setdefault(r[group], []).append(r)
    for g, rs in groups.items():
        o = {"n": len(rs)}
        for f in fields:
            xs = [r[f] for r in rs if r.get(f) is not None]
            o[f] = P.quantiles(xs)
            o[f + "_hist"] = P.log_hist(xs, EDGES)
        out[g] = o
    return out


def dup_summary(rows, exact_key, near_key, group=None):
    groups = {"all": rows}
    if group:
        for r in rows:
            groups.setdefault(r[group], []).append(r)
    o = {}
    for g, rs in groups.items():
        ex = sum(r[exact_key] >= 0 for r in rs)
        cl = Counter(r[near_key] for r in rs if r[near_key] >= 0)
        o[g] = {"n": len(rs), "exact_dup_rows": ex, "near_dup_rows": sum(cl.values()), "near_clusters": len(cl),
                "near_removable": sum(cl.values()) - len(cl)}
    return o


def main():
    res = {"edges": EDGES, "tokenizer": "Qwen3 (tokenizer.json of Qwen/Qwen3-0.6B, rev c1899de2)"}
    allrows = {}
    # ---------------- SFT
    s = P.records("sft")
    pt, rt, at = P.ntok([r["prompt"] for r in s]), P.ntok([r["response"] for r in s]), P.ntok([r["asst_all"] for r in s])
    langs = lid([r["prompt"] for r in s])
    exact, near, pairs = dup_info([r["prompt"] for r in s])
    exact_full, near_full, pairs_full = dup_info([r["prompt"] + "\n" + r["asst_all"] for r in s])
    for k, r in enumerate(s):
        r.update(prompt_tok=pt[k], response_tok=rt[k], asst_tok=at[k], lang=langs[k][0], lang_score=langs[k][1],
                 dup_exact=exact[k], dup_near=near[k], dup_exact_full=exact_full[k], dup_near_full=near_full[k])
    res["sft"] = {"len": summarise(s, ["prompt_tok", "response_tok", "asst_tok", "turns"], "source"),
                  "dup_prompt": dup_summary(s, "dup_exact", "dup_near", "source"),
                  "dup_full": dup_summary(s, "dup_exact_full", "dup_near_full", "source"),
                  "near_pairs_prompt": len(pairs), "near_pairs_full": len(pairs_full),
                  "turns": dict(Counter(min(r["turns"], 5) for r in s)),
                  "lang": {src: dict(Counter(r["lang"] for r in s if r["source"] == src).most_common(6))
                           for src in sorted({r["source"] for r in s})},
                  "lang_all": dict(Counter(r["lang"] for r in s).most_common(12)),
                  "sources": dict(Counter(r["source"] for r in s))}
    allrows["sft"] = s
    # ---------------- preferences
    p = P.records("pref")
    ct, jt, pt2 = P.ntok([r["chosen"] for r in p]), P.ntok([r["rejected"] for r in p]), P.ntok([r["prompt"] for r in p])
    exact, near, pairs = dup_info([r["prompt"] for r in p])
    for k, r in enumerate(p):
        r.update(chosen_tok=ct[k], rejected_tok=jt[k], prompt_tok=pt2[k], dup_exact=exact[k], dup_near=near[k],
                 margin=round(r["score_chosen"] - r["score_rejected"], 3))
    sc = Counter((r["score_chosen"], r["score_rejected"]) for r in p)
    longer = [r for r in p if r["chosen_tok"] != r["rejected_tok"]]
    bym = defaultdict(lambda: [0, 0, 0])  # margin bucket -> [pairs, chosen longer, ties in length]
    for r in p:
        b = margin_bucket(r["margin"])
        bym[b][0] += 1
        bym[b][1] += r["chosen_tok"] > r["rejected_tok"]
        bym[b][2] += r["chosen_tok"] == r["rejected_tok"]
    import math
    lr = [math.log2((r["chosen_tok"] + 1) / (r["rejected_tok"] + 1)) for r in p]
    res["pref"] = {"len": summarise(p, ["prompt_tok", "chosen_tok", "rejected_tok"]),
                   "dup_prompt": dup_summary(p, "dup_exact", "dup_near"), "near_pairs_prompt": len(pairs),
                   "score_pairs": [[a, b, n] for (a, b), n in sorted(sc.items())],
                   "score_chosen": dict(Counter(r["score_chosen"] for r in p)),
                   "score_rejected": dict(Counter(r["score_rejected"] for r in p)),
                   "ties": sum(r["margin"] == 0 for r in p),
                   "chosen_longer": sum(r["chosen_tok"] > r["rejected_tok"] for r in p),
                   "length_ties": len(p) - len(longer),
                   "by_margin": {k: v for k, v in sorted(bym.items())},
                   "logratio_hist": hist_lin(lr, -4, 4, 32),
                   "mean_chosen_tok": sum(ct) / len(ct), "mean_rejected_tok": sum(jt) / len(jt)}
    allrows["pref"] = p
    # ---------------- RLVR
    v = P.records("rlvr")
    qt, ft = P.ntok([r["question"] for r in v]), P.ntok([r["prompt"] for r in v])
    exact, near, pairs = dup_info([r["question"] for r in v])
    for k, r in enumerate(v):
        r.update(question_tok=qt[k], prompt_tok=ft[k], dup_exact=exact[k], dup_near=near[k],
                 gt_kind=gt_kind(r["ground_truth"], r["dataset"]))
    res["rlvr"] = {"len": summarise(v, ["question_tok", "prompt_tok"], "dataset"),
                   "dup_question": dup_summary(v, "dup_exact", "dup_near", "dataset"), "near_pairs": len(pairs),
                   "datasets": dict(Counter(r["dataset"] for r in v)),
                   "constraint_types": dict(Counter(r["constraint_type"] for r in v if r["constraint_type"])),
                   "gt_kind": {d: dict(Counter(r["gt_kind"] for r in v if r["dataset"] == d)) for d in ("gsm8k", "MATH")}}
    allrows["rlvr"] = v
    # ---------------- Cosmopedia
    c = P.records("cosmo")
    tt, st = P.ntok([r["response"] for r in c]), P.ntok([r["seed"] for r in c])
    exact, near, pairs = dup_info([r["response"] for r in c])
    openers = Counter(" ".join(P.WORD.findall(r["response"].lower())[:3]) for r in c)
    for k, r in enumerate(c):
        r.update(text_tok=tt[k], seed_tok=st[k], dup_exact=exact[k], dup_near=near[k],
                 ratio=round((tt[k] + 1) / (st[k] + 1), 3))
    res["cosmo"] = {"len": summarise(c, ["text_tok", "seed_tok", "text_token_length"], "format"),
                    "dup_text": dup_summary(c, "dup_exact", "dup_near"), "near_pairs": len(pairs),
                    "formats": dict(Counter(r["format"] for r in c)), "audiences": dict(Counter(r["audience"] for r in c)),
                    "openers": openers.most_common(10),
                    "title_share": sum(r["response"].lstrip().lower().startswith("title:") for r in c) / len(c),
                    "ratio": P.quantiles([r["ratio"] for r in c]),
                    "tok_vs_published_maxdiff": max(abs(r["text_tok"] - r["text_token_length"]) for r in c)}
    allrows["cosmo"] = c
    with gzip.open(os.path.join(P.scratch(), "stats_rows.jsonl.gz"), "wt") as f:
        for key, rs in allrows.items():
            for r in rs:
                f.write(json.dumps(dict(r, ds=key), ensure_ascii=False) + "\n")
    P.save_out("stats.json", res)
    print(json.dumps({k: (v.get("dup_prompt") or v.get("dup_question") or v.get("dup_text")) for k, v in res.items()
                      if isinstance(v, dict)}, indent=0)[:3000])


def margin_bucket(m):
    if m <= 0:
        return "0"
    if m < 1:
        return "0-1"
    if m < 2:
        return "1-2"
    if m < 3:
        return "2-3"
    if m < 5:
        return "3-5"
    return "5+"


def hist_lin(xs, lo, hi, n):
    c = [0] * n
    for x in xs:
        k = int((min(max(x, lo), hi - 1e-9) - lo) / (hi - lo) * n)
        c[k] += 1
    return {"lo": lo, "hi": hi, "counts": c}


def gt_kind(g, ds):
    import re
    g = g.strip()
    if ds == "gsm8k":
        return "integer" if re.fullmatch(r"-?\d+", g) else "decimal" if re.fullmatch(r"-?\d*\.\d+", g) else "other"
    if ds == "MATH":
        if re.fullmatch(r"-?\d+", g):
            return "integer"
        if re.fullmatch(r"-?\d*\.\d+", g):
            return "decimal"
        if "\\frac" in g or "\\dfrac" in g or re.fullmatch(r"-?\d+/\d+", g):
            return "fraction"
        if "\\sqrt" in g or "\\pi" in g:
            return "radical or pi"
        if re.search(r"[\(\[].*,.*[\)\]]", g) or "," in g:
            return "tuple, interval or list"
        if re.search(r"[a-zA-Z]", g):
            return "expression or text"
        return "other"
    return ds


if __name__ == "__main__":
    main()
