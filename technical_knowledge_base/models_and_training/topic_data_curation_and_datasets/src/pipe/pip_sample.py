"""Step 6 of the Pipeline lab: draw the labelling sample (seed 0) and print it for reading.

Groups: each heuristic rule that removed documents in run0 (first-firing reason), the six duplicated-n-gram rules
pooled, and a sample of documents run0 KEPT (to see what the filters let through). Up to 8 documents per group,
drawn at random with seed 0. The labels themselves are written by hand into labels/drops.json (id, group, label,
note); this script only draws and prints.

usage: pip_sample.py draw            -> $DC_SCRATCH/data/pipe/label_sample.jsonl.gz
       pip_sample.py show <group>    -> prints the group's documents (first 700 characters each)
"""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402
L = P.L

VAL = {"dup_line_frac": "dup_line_frac", "dup_line_char_frac": "dup_line_char_frac", "top_2_gram": "top_2_gram",
       "top_3_gram": "top_3_gram", "top_4_gram": "top_4_gram", "duplicated_5_n_grams": "dup_5_gram",
       "gopher_short_doc": "n_words", "gopher_below_alpha_threshold": "alpha_words",
       "gopher_too_many_end_ellipsis": "end_ellipsis_lines", "gopher_enough_stop_words": "stop_words",
       "gopher_too_many_bullets": "bullet_lines", "too_few_sentences": "c4_sentences", "curly_bracket": "c4_curly",
       "lorem_ipsum": "c4_lorem", "line_punct_ratio": "line_punct", "char_dup_ratio": "char_dup",
       "short_line_ratio": "short_lines"}


def group_of(reason):
    if reason and reason.startswith("duplicated_") and reason != "duplicated_5_n_grams":
        return "duplicated_6_to_10_n_grams"
    return reason


def draw():
    rows = P.read_jsonl_gz(P.scratch("rule_values.jsonl.gz"))
    ext = {d["id"]: d for d in L.run0("extracted")}
    groups = {}
    for r in rows:
        g = group_of(r["run0_reason"]) if r["run0_step"] else "kept"
        groups.setdefault(g, []).append(r)
    rnd = random.Random(0)
    out = []
    for g in sorted(groups):
        pool = sorted(groups[g], key=lambda r: r["id"])
        pick = rnd.sample(pool, min(8 if g != "kept" else 24, len(pool)))
        for r in pick:
            key = VAL.get(r["run0_reason"] or "", None)
            out.append({"group": g, "id": r["id"], "url": r["url"], "value": r["v"].get(key) if key else None,
                        "value_key": key, "n_in_group": len(pool), "text": ext[r["id"]]["text"]})
    P.write_jsonl_gz(P.scratch("label_sample.jsonl.gz"), out)
    print({g: len(v) for g, v in groups.items()})


def show(g):
    from urllib.parse import urlparse
    for i, r in enumerate(x for x in P.read_jsonl_gz(P.scratch("label_sample.jsonl.gz")) if x["group"] == g):
        t = r["text"].replace("\n", " | ")
        print(f"[{i}] {r['id'][10:22]} {urlparse(r['url']).netloc} {r['value_key']}={r['value']} chars={len(r['text'])}")
        print("   ", t[:int(os.environ.get("N","700"))])


if __name__ == "__main__":
    draw() if sys.argv[1] == "draw" else show(sys.argv[2])
