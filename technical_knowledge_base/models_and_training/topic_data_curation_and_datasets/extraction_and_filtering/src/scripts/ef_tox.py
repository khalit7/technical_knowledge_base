"""Toxicity and adult-content filters on the running example's English documents (this page's venv).

Inputs: the 6,971 documents that passed run0's language ID (trafilatura text), and which of them run0 finally kept
(2,617, after every heuristic filter, MinHash and PII).
  C4 bad-words rule: TFDS c4_utils.py (@e22338e9) get_badwords_filter_fn, lines 534-560: drop the page if the
    lower-cased text matches (?:\\W|^)(word1|word2|...)(?:\\W|$) for any word of the LDNOOBW English list
    (downloaded 2026-10-15; 403 entries).
  Dolma's Jigsaw fastText classifiers (dolma taggers/jigsaw.py:18,40; models jigsaw_fasttext_bigrams_20230515): the
    'nsfw' and 'hatespeech' models scored per sentence (sentences split here with a simple punctuation-and-newline
    regex, not BlingFire); Dolma v1 removed every sentence scoring above 0.4 ('High' threshold, arXiv 2402.00159
    section 5.3; the 'Low' 0.0004 is also reported).
Output: $DC_SCRATCH/data/ef/tox.jsonl.gz (per doc) and src/data/ef_tox.json (aggregates; no adult text).
"""
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
L = E.L
SENT = re.compile(r"(?<=[.!?])\s+|\n+")


def main():
    import fasttext
    fasttext.FastText.eprint = lambda *a, **k: None
    words = [w.strip().lower() for w in open(E.scratch("lists", "ldnoobw_en.txt"), encoding="utf-8") if w.strip()]
    bad = re.compile(r"(?:\W|^)({})(?:\W|$)".format("|".join(re.escape(w) for w in words)))
    nsfw = fasttext.load_model(E.scratch("models", "jigsaw_nsfw.bin"))
    hate = fasttext.load_model(E.scratch("models", "jigsaw_hatespeech.bin"))
    eng = {r["id"] for r in E.read_jsonl_gz(E.pipe_scratch("rule_values.jsonl.gz"))}
    final = set(L.ids("run0_final"))

    def score(m, s):
        labs, ps = m.predict(s.replace("\n", " ").strip(), k=-1)
        d = dict(zip(labs, ps))
        pos = [k for k in d if "non" not in k][0]
        return float(d[pos])

    out = []
    for d in L.run0("extracted"):
        if d["id"] not in eng:
            continue
        t = d["text"]
        m = bad.search(t.lower())
        sents = [s for s in SENT.split(t) if s.strip()]
        sn = [score(nsfw, s) for s in sents]
        sh = [score(hate, s) for s in sents]
        tot = sum(len(s) for s in sents) or 1
        row = {"id": d["id"], "final": d["id"] in final, "bad": m.group(1) if m else None, "n_sent": len(sents),
               "nsfw_max": round(max(sn, default=0), 4), "hate_max": round(max(sh, default=0), 4),
               "nsfw_doc": round(score(nsfw, t), 4), "hate_doc": round(score(hate, t), 4)}
        for th in (0.4, 0.0004):
            rm = [len(s) for s, a, b in zip(sents, sn, sh) if a > th or b > th]
            row[f"rm_{th}"] = round(sum(rm) / tot, 4)
            row[f"rmn_{th}"] = len(rm)
        out.append(row)
    E.write_jsonl_gz(E.scratch("tox.jsonl.gz"), out)

    def agg(rows):
        n = len(rows)
        c = collections.Counter(r["bad"] for r in rows if r["bad"])
        return {"docs": n, "badword_docs": sum(1 for r in rows if r["bad"]),
                "top_words_count": len(c),
                "dolma_04_docs_touched": sum(1 for r in rows if r["rmn_0.4"] > 0),
                "dolma_04_char_share": round(sum(r["rm_0.4"] for r in rows) / n, 4),
                "dolma_00004_docs_touched": sum(1 for r in rows if r["rmn_0.0004"] > 0),
                "dolma_00004_char_share": round(sum(r["rm_0.0004"] for r in rows) / n, 4),
                "nsfw_doc_over_05": sum(1 for r in rows if r["nsfw_doc"] > 0.5),
                "hate_doc_over_05": sum(1 for r in rows if r["hate_doc"] > 0.5)}
    res = {"english": agg(out), "final": agg([r for r in out if r["final"]])}
    E.save("ef_tox.json", res)
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
