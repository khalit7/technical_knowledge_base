"""Draw the hand-labelling sample for the rule workbench and the label browser (seed 1; the Pipeline lab's sample was
seed 0 and 8 per rule: those 8 are excluded here and added back when rates are computed).

Groups:
  drop:<reason>   documents run0 removed with that first-firing reason (datatrove 0.10.1 chain on trafilatura text):
                  20 at random per reason (all when fewer than 20)
  kept            40 documents the whole chain kept
  trap:alpha_spacy   documents dropped ONLY because datatrove counts spaCy tokens as words in Gopher's 80% rule
                     (they pass every other rule and pass the rule with whitespace words): 20
  trap:chardup_01    documents the FineWeb duplicated-line rule drops at datatrove's 0.01 but keeps at the paper's
                     0.1 (and that pass every other rule): 20
  trap:c4_sent_3     documents C4's sentence rule drops at datatrove's 5 but keeps at the paper's 3 (passing all else): 20
  trap:c4_punct      documents C4's terminal-punctuation line rule would remove if switched on (FineWeb leaves it off)
                     and that pass every other rule: 20
Output: $DC_SCRATCH/data/ef/label_sample.jsonl.gz (id, group, host, value, text) and `show <group> [start] [n]`
prints excerpts for the labeller. Labels are typed into ../labels/ef_labels.json by hand.
Run in the shared venv.
"""
import gzip
import json
import os
import random
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
sys.path.insert(0, os.path.join(E.ROOT_SRC, "pipe"))
L = E.L

PIPE_LABELS = os.path.join(E.ROOT_SRC, "pipe", "labels", "drops.json")

# default thresholds as run0 used them: (key, direction, threshold); a doc fails when value is past threshold
RULES = [("dup_line_frac", "gt", 0.3), ("dup_para_frac", "gt", 0.3), ("dup_line_char_frac", "gt", 0.2),
         ("dup_para_char_frac", "gt", 0.2), ("top_2_gram", "gt", 0.2), ("top_3_gram", "gt", 0.18),
         ("top_4_gram", "gt", 0.16), ("dup_5_gram", "gt", 0.15), ("dup_6_gram", "gt", 0.14),
         ("dup_7_gram", "gt", 0.13), ("dup_8_gram", "gt", 0.12), ("dup_9_gram", "gt", 0.11),
         ("dup_10_gram", "gt", 0.10), ("n_words", "lt", 50), ("n_words", "gt", 100000),
         ("avg_word_len", "lt", 3), ("avg_word_len", "gt", 10), ("hash_ratio", "gt", 0.1),
         ("ellipsis_ratio", "gt", 0.1), ("bullet_lines", "gt", 0.9), ("end_ellipsis_lines", "gt", 0.3),
         ("alpha_words", "lt", 0.8), ("stop_words", "lt", 2), ("c4_sentences", "lt", 5), ("c4_lorem", "gt", 0),
         ("c4_curly", "gt", 0), ("line_punct", "lt", 0.12), ("short_lines", "gt", 0.67), ("char_dup", "gt", 0.01),
         ("list_ratio", "gt", 0.3)]


def fails(v, key, d, t):
    x = v.get(key)
    if x is None:
        return False
    return x > t if d == "gt" else x < t


def failing(v, override=None):
    out = []
    for k, d, t in RULES:
        if override and k in override:
            t = override[k]
        if fails(v, k, d, t):
            out.append(k)
    return out


def draw():
    rows = {r["id"]: r for r in E.read_jsonl_gz(E.pipe_scratch("rule_values.jsonl.gz"))}
    root_ids = {x["id"] for x in json.load(open(PIPE_LABELS))}
    texts = {d["id"]: d["text"] for d in L.run0("extracted") if d["id"] in rows}
    fw = set(L.ids("fineweb_kept"))
    import pip_common  # noqa: F401  (macOS workarounds for datatrove imports)
    from datatrove.pipeline.filters import C4QualityFilter
    c4p = C4QualityFilter(filter_no_terminal_punct=True)
    rng = random.Random(1)
    groups = {}
    for i, r in rows.items():
        v = r["v"]
        if r["run0_step"] in ("3_gopher_rep", "4_gopher_qual", "5_c4", "6_fineweb_qual"):
            groups.setdefault("drop:" + str(r["run0_reason"]), []).append(i)
        elif r["run0_step"] is None:
            groups.setdefault("kept", []).append(i)
        f0 = failing(v)
        if f0 == ["alpha_words"] and v.get("alpha_words_ws", 0) >= 0.8:
            groups.setdefault("trap:alpha_spacy", []).append(i)
        if f0 == ["char_dup"] and v.get("char_dup", 0) <= 0.1:
            groups.setdefault("trap:chardup_01", []).append(i)
        if f0 == ["c4_sentences"] and v.get("c4_sentences", 0) >= 3:
            groups.setdefault("trap:c4_sent_3", []).append(i)
        if not f0 and i in texts:
            from datatrove.data import Document
            if c4p.filter(Document(text=texts[i], id=i)) is not True:
                groups.setdefault("trap:c4_punct", []).append(i)
    out, sizes = [], {}
    for g, ids in sorted(groups.items()):
        ids = sorted(x for x in ids if x not in root_ids)
        sizes[g] = len(groups[g])
        k = 40 if g == "kept" else 20
        pick = ids if len(ids) <= k else rng.sample(ids, k)
        for i in pick:
            host = urllib.parse.urlsplit(rows[i]["url"]).netloc
            out.append({"id": i, "group": g, "host": host, "in_fineweb": i in fw,
                        "v": {k2: rows[i]["v"].get(k2) for k2 in ("alpha_words", "alpha_words_ws", "char_dup",
                                                                  "c4_sentences", "line_punct", "short_lines",
                                                                  "n_words", "stop_words")},
                        "text": texts.get(i, "")[:1500]})
    E.write_jsonl_gz(E.scratch("label_sample.jsonl.gz"), out)
    print(json.dumps(sizes), len(out))


def show(group, start=0, n=25, width=650):
    rows = [r for r in E.read_jsonl_gz(E.scratch("label_sample.jsonl.gz")) if r["group"] == group]
    for j, r in enumerate(rows[start:start + n], start):
        t = " / ".join(x.strip() for x in r["text"][:width].split("\n") if x.strip())
        print(f"[{j}] {r['host']} fw={int(r['in_fineweb'])} {json.dumps(r['v'])}\n    {t}\n")


if __name__ == "__main__":
    if sys.argv[1] == "draw":
        draw()
    else:
        show(sys.argv[2], *(int(x) for x in sys.argv[3:]))
