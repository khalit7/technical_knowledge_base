"""List the (training row, benchmark item) pairs over Tulu 3's 50% rule from pd_contam.py's output, with the
benchmark item and the matched window of the training row, for reading (labels go in src/notes/contam_read.md).
Writes $DC_SCRATCH/pd/contam/flagged.jsonl and data/out/contam_pairs.json (counts by corpus and benchmark, and
short excerpts of every flagged pair: public post-training rows and public benchmark items only)."""
import gzip
import json
import os
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pd_contam as PC  # noqa: E402

G, K, C = PC.G, PC.K, PC.C


def main():
    G.CORPORA.update(PC.CORP)
    items = G.bench_items()
    cd = os.path.join(C.scratch(), "contam")
    out, flat = {}, []
    for name in PC.CORP:
        fp = os.path.join(cd, f"{name}.pairs.jsonl.gz")
        if not os.path.exists(fp):
            continue
        pairs = [json.loads(x) for x in gzip.open(fp, "rt")]
        fl = [p for p in pairs if p["cov8"] > 0.5]
        need = {p["doc"] for p in fl}
        texts = {i: t for i, t in G.corpus_iter(name) if i in need}
        by = Counter(items[p["item"]]["bench"] for p in fl)
        out[name] = dict(flagged=len(fl), rows=len(need), by_bench=dict(by))
        for p in fl:
            it = items[p["item"]]
            w = K.match_window(it["full"], texts[p["doc"]])
            doc = texts[p["doc"]]
            ex = doc[max(0, w["start"] - 80):w["end"] + 80] if w else doc[:300]
            flat.append(dict(corpus=name, doc=p["doc"], bench=it["bench"], idx=it["idx"], cov8=p["cov8"], m13=p["m13"],
                             item=it["query"][:500], label=it["label"][:200], excerpt=ex[:900]))
    with open(os.path.join(cd, "flagged.jsonl"), "w") as f:
        for x in flat:
            f.write(json.dumps(x) + "\n")
    C.save_out("contam_pairs.json", dict(by_corpus=out, pairs=flat))
    print(json.dumps(out))


if __name__ == "__main__":
    main()
