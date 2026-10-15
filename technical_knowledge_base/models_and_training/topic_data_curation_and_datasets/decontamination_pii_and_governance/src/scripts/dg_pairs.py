"""Every (document, benchmark item) pair that a published rule flags, with what matched, for hand labelling and for
the page's contamination checker.

Flag rules (computed by dg_contam.py): GPT-3 style any shared 13-gram (m13 > 0) or Tulu 3's rule (cov8 > 0.5).
For each flagged pair this adds: the matched window in the document (character span, from 8-gram matches), the
longest run, and "template": how many distinct benchmark items contain the pair's matched 13-grams (a 13-gram
shared by many items of the benchmark itself is benchmark boilerplate such as "Express your answer as a common
fraction", not a copied item).

Output: $DC_SCRATCH/data/dg/contam/flagged.jsonl.gz (full windows, outside the repo).
"""
import gzip
import json
import os
import sys
from collections import Counter, defaultdict

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402
import dg_contam as D  # noqa: E402


def main():
    items = C.bench_items()
    # item multiplicity of every benchmark 13-gram
    mult = Counter()
    ith13 = []
    for it in items:
        h = set(D.ngram_hashes(D.tok_hashes(D.norm_tokens(it["full"])), 13).tolist())
        ith13.append(h)
        mult.update(h)
    od = C.out_dir("contam")
    out = []
    for corpus in C.CORPORA:
        fn = os.path.join(od, f"{corpus}.pairs.jsonl.gz")
        if not os.path.exists(fn):
            continue
        P = [json.loads(x) for x in gzip.open(fn, "rt")]
        P = [p for p in P if p["m13"] > 0 or p["cov8"] > 0.5]
        if not P:
            continue
        want = defaultdict(list)
        for p in P:
            want[p["doc"]].append(p)
        for doc_id, text in C.corpus_iter(corpus):
            if doc_id not in want:
                continue
            dh = set(D.ngram_hashes(D.tok_hashes(D.norm_tokens(text)), 13).tolist())
            for p in want[doc_id]:
                it = items[p["item"]]
                shared = dh & ith13[p["item"]]
                tmpl = min((mult[h] for h in shared), default=0)
                w = D.match_window(it["full"], text)
                out.append(dict(p, corpus=corpus, bench=it["bench"], bidx=it["idx"], template_min_items=tmpl,
                                n13_shared=len(shared), win=w,
                                window=text[w["start"]:w["end"]] if w else "",
                                ctx_before=text[max(0, w["start"] - 300):w["start"]] if w else "",
                                ctx_after=text[w["end"]:w["end"] + 300] if w else "", doc_chars=len(text)))
    with gzip.open(os.path.join(od, "flagged.jsonl.gz"), "wt") as f:
        for r in out:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    c = Counter((r["corpus"], r["bench"], "tmpl" if r["template_min_items"] >= 3 else "item") for r in out)
    for k, v in sorted(c.items()):
        print(k, v)
    print(len(out))


if __name__ == "__main__":
    main()
