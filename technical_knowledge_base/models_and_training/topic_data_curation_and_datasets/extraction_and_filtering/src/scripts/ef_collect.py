"""Collect the page's small data from the scratch outputs (this page's venv; run after the measurement scripts).

Writes, all under src/data/:
  ef_collect.json   WCEB means, rough timings, trafilatura cache examples counts, the Pipeline lab's numbers this page
                    quotes (copied, so the build does not read the root's files), LID aggregates, toxicity label summary
  ef_workbench.json the rule workbench: per rule a threshold grid and, per English document, the grid index where the
                    rule starts dropping it (one character per document, alphabet ALPHA), FineWeb membership and labels;
                    checked: with every default the workbench reproduces run0's keep/drop decision for 6,971 of 6,971
"""
import collections
import json
import os
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
L = E.L

ALPHA = "".join(chr(c) for c in range(35, 127) if chr(c) != "\\")  # 91 characters, JSON-safe


def grid(a, b, step):
    n = int(round((b - a) / step))
    return [round(a + i * step, 6) for i in range(n + 1)]


# key, label, family, direction (drop when value > t: 'gt'; when value < t: 'lt'), default (datatrove 0.10.1 as run0),
# paper value if different, grid, source
RULES = [
    ("dup_line_frac", "Duplicate lines (share of lines)", "Gopher repetition", "gt", 0.3, None, grid(0, 0.6, 0.01)),
    ("dup_para_frac", "Duplicate paragraphs (share)", "Gopher repetition", "gt", 0.3, None, grid(0, 0.6, 0.01)),
    ("dup_line_char_frac", "Characters in duplicate lines", "Gopher repetition", "gt", 0.2, None, grid(0, 0.5, 0.01)),
    ("dup_para_char_frac", "Characters in duplicate paragraphs", "Gopher repetition", "gt", 0.2, None, grid(0, 0.5, 0.01)),
    ("top_2_gram", "Top 2-gram, share of characters", "Gopher repetition", "gt", 0.2, None, grid(0, 0.5, 0.01)),
    ("top_3_gram", "Top 3-gram, share of characters", "Gopher repetition", "gt", 0.18, None, grid(0, 0.5, 0.01)),
    ("top_4_gram", "Top 4-gram, share of characters", "Gopher repetition", "gt", 0.16, None, grid(0, 0.5, 0.01)),
    ("dup_5_gram", "Repeated 5-grams, share of characters", "Gopher repetition", "gt", 0.15, None, grid(0, 0.5, 0.01)),
    ("dup_6_gram", "Repeated 6-grams", "Gopher repetition", "gt", 0.14, None, grid(0, 0.5, 0.01)),
    ("dup_7_gram", "Repeated 7-grams", "Gopher repetition", "gt", 0.13, None, grid(0, 0.5, 0.01)),
    ("dup_8_gram", "Repeated 8-grams", "Gopher repetition", "gt", 0.12, None, grid(0, 0.5, 0.01)),
    ("dup_9_gram", "Repeated 9-grams", "Gopher repetition", "gt", 0.11, None, grid(0, 0.5, 0.01)),
    ("dup_10_gram", "Repeated 10-grams", "Gopher repetition", "gt", 0.10, None, grid(0, 0.5, 0.01)),
    ("n_words", "Words (fewer drops)", "Gopher quality", "lt", 50, None, grid(0, 300, 5)),
    ("avg_word_len", "Mean word length (shorter drops)", "Gopher quality", "lt", 3, None, grid(0, 6, 0.1)),
    ("avg_word_len_hi", "Mean word length (longer drops)", "Gopher quality", "gt", 10, None, grid(6, 15, 0.25)),
    ("hash_ratio", "Hash signs per word", "Gopher quality", "gt", 0.1, None, grid(0, 0.5, 0.01)),
    ("ellipsis_ratio", "Ellipses per word", "Gopher quality", "gt", 0.1, None, grid(0, 0.5, 0.01)),
    ("bullet_lines", "Lines starting with a bullet", "Gopher quality", "gt", 0.9, None, grid(0, 1, 0.02)),
    ("end_ellipsis_lines", "Lines ending in an ellipsis", "Gopher quality", "gt", 0.3, None, grid(0, 1, 0.02)),
    ("alpha_words", "Words with a letter (datatrove: spaCy tokens)", "Gopher quality", "lt", 0.8, None,
     grid(0.5, 1, 0.01)),
    ("alpha_words_ws", "Words with a letter (whitespace words, as Gopher)", "Gopher quality", "lt", 0.8, None,
     grid(0.5, 1, 0.01)),
    ("stop_words", "Distinct stop words of 8 (fewer drops)", "Gopher quality", "lt", 2, None, grid(0, 8, 1)),
    ("c4_sentences", "Sentences after C4's line edits", "C4", "lt", 5, 3, grid(0, 20, 1)),
    ("c4_lorem", "Contains 'lorem ipsum'", "C4", "gt", 0, None, [0, 1]),
    ("c4_curly", "Contains a curly bracket", "C4", "gt", 0, None, [0, 1]),
    ("line_punct", "Lines ending in punctuation (fewer drops)", "FineWeb", "lt", 0.12, None, grid(0, 0.6, 0.01)),
    ("short_lines", "Lines of 30 characters or fewer", "FineWeb", "gt", 0.67, None, grid(0.3, 1, 0.01)),
    ("char_dup", "Characters in duplicated lines", "FineWeb", "gt", 0.01, 0.1,
     [0, 0.0025, 0.005, 0.0075, 0.01, 0.015] + grid(0.02, 0.3, 0.01)),
    ("list_ratio", "Newlines per word (datatrove only)", "FineWeb", "gt", 0.3, None, grid(0, 1, 0.02)),
]


def value(v, key):
    if key == "avg_word_len_hi":
        return v.get("avg_word_len")
    if key in ("c4_lorem", "c4_curly"):
        return 1 if v.get(key) else 0
    return v.get(key)


def kidx(x, g, d):
    """Grid index k: for 'gt' the rule drops at slider j iff j < k; for 'lt' iff j >= k."""
    if x is None:
        return 0 if d == "gt" else len(g)  # statistic missing: never drops
    if d == "gt":
        return sum(1 for t in g if x > t)
    return sum(1 for t in g if t <= x)


def workbench():
    rows = list(E.read_jsonl_gz(E.pipe_scratch("rule_values.jsonl.gz")))
    fw = set(L.ids("fineweb_kept"))
    labels = json.load(open(E.scratch("labels_by_id.json")))
    rules = [r for r in RULES if r[0] != "alpha_words_ws"]
    enc = {}
    for key, lab, fam, d, dft, paper, g in RULES:
        assert dft in g or key in ("c4_lorem", "c4_curly"), key
        if paper is not None:
            assert paper in g, key
        s = []
        for r in rows:
            k = kidx(value(r["v"], key), g, d)
            assert 0 <= k <= len(g) < len(ALPHA)
            s.append(ALPHA[k])
        enc[key] = "".join(s)
    # check: defaults reproduce run0
    ok = 0
    for i, r in enumerate(rows):
        drop = False
        for key, lab, fam, d, dft, paper, g in rules:
            k = ALPHA.index(enc[key][i])
            j = g.index(dft)
            if (d == "gt" and j < k) or (d == "lt" and j >= k):
                drop = True
        if r["v"].get("n_words", 0) > 100000:
            drop = True
        ok += (not drop) == (r["run0_step"] is None)
    assert ok == len(rows), ok
    lab_letters = "".join(labels.get(r["id"], {}).get("l", ".") for r in rows)
    lab_groups = [labels.get(r["id"], {}).get("g") for r in rows]
    meta = [{"k": k, "label": lab, "fam": fam, "dir": d, "dft": dft, "paper": paper, "grid": g}
            for k, lab, fam, d, dft, paper, g in RULES]
    E.save("ef_workbench.json", {"alpha": ALPHA, "n": len(rows), "rules": meta, "enc": enc,
                                 "fw": "".join("1" if r["id"] in fw else "0" for r in rows),
                                 "lab": lab_letters, "run0_kept": sum(1 for r in rows if r["run0_step"] is None),
                                 "reasons": dict(collections.Counter(str(r["run0_reason"]) for r in rows
                                                                     if r["run0_step"] is not None)),
                                 "check_reproduces_run0": ok})
    idx = {r["id"]: i for i, r in enumerate(rows)}
    return idx, lab_groups


def wceb():
    out = {}
    for name in ("traf111", "traf231", "resiliparse", "justext", "readability", "alltext"):
        p = E.scratch(f"wceb_{name}.json")
        if not os.path.exists(p):
            continue
        d = json.load(open(p))
        m = {k: round(statistics.mean(v[k] for v in d.values()), 3) for k in ("p", "r", "f1")}
        m["median_f1"] = round(statistics.median(v["f1"] for v in d.values()), 3)
        m["empty"] = sum(1 for v in d.values() if v["n"] == 0)
        per = collections.defaultdict(list)
        for k, v in d.items():
            per[k.split("/")[0]].append(v["f1"])
        m["per_dataset"] = {k: round(statistics.mean(v), 3) for k, v in sorted(per.items())}
        m["pages"] = len(d)
        out[name] = m
    return out


def timing():
    out = {}
    for name, path in (("traf111", "traf111_nodedup.jsonl.gz"), ("traf231", "more_traf231.jsonl.gz"),
                       ("justext", "more_justext.jsonl.gz"), ("readability", "more_readability.jsonl.gz")):
        s = [r["s"] for r in E.read_jsonl_gz(E.scratch(path))]
        out[name] = {"pages": len(s), "seconds": round(sum(s), 1), "ms_per_page": round(1000 * sum(s) / len(s), 1),
                     "p50_ms": round(1000 * statistics.median(s), 1), "over_1s": sum(1 for x in s if x > 1)}
    return out


def lid():
    p = E.scratch("lid.jsonl.gz")
    rows = list(E.read_jsonl_gz(p))
    if len(rows) < 19000:
        return None
    ft_labels = set(open(E.scratch("lid176_labels.txt")).read().split())
    iso = json.load(open(os.path.join(E.SRC, "inputs", "iso639_map.json")))
    p1, mac = iso["part1_to_3"], iso["macro_of"]
    ft3 = {p1.get(x, x) for x in ft_labels}

    def same(ft, gl):  # lid.176 label (Wikipedia-style code) against GlotLID's ISO 639-3 code, macrolanguages joined
        f3, g3 = p1.get(ft, ft), gl.split("_")[0]
        return g3 == f3 or mac.get(g3) == f3 or mac.get(f3) == g3
    res = {"n": len(rows)}
    agree = 0
    conf = collections.Counter()
    for r in rows:
        if same(r["ft"], r["gl"]):
            agree += 1
        conf[(r["ft"], r["gl"])] += 1
    res["agree"] = agree
    res["ft_en_065"] = sum(1 for r in rows if r["ft_en"] > 0.65)
    res["gl_en_065"] = sum(1 for r in rows if r["gl_en"] > 0.65)
    res["both_en_065"] = sum(1 for r in rows if r["ft_en"] > 0.65 and r["gl_en"] > 0.65)
    res["cld2_en_of_ft_en"] = sum(1 for r in rows if r["ft_en"] > 0.65 and r["cld2"] == "eng")
    res["cld2_en"] = sum(1 for r in rows if r["cld2"] == "eng")
    th = [round(i * 0.01, 2) for i in range(0, 100)]
    res["thresholds"] = th
    res["ft_kept"] = [sum(1 for r in rows if r["ft_en"] > t) for t in th]
    res["gl_kept"] = [sum(1 for r in rows if r["gl_en"] > t) for t in th]
    res["both_kept"] = [sum(1 for r in rows if r["ft_en"] > t and r["gl_en"] > t) for t in th]
    # 2-D histogram of English scores (10 x 10)
    h = [[0] * 10 for _ in range(10)]
    for r in rows:
        h[min(9, int(r["ft_en"] * 10))][min(9, int(r["gl_en"] * 10))] += 1
    res["hist2d"] = h
    # FineWeb2's per-language threshold rule on the English-labelled documents' scores
    fte = [r["fts"] for r in rows if r["ft"] == "en"]
    gle = [r["gls"] for r in rows if r["gl"] == "eng_Latn"]
    res["fw2_th_ft"] = round(max(0.3, min(0.9, statistics.median(fte) - statistics.pstdev(fte))), 3)
    res["fw2_th_gl"] = round(max(0.3, min(0.9, statistics.median(gle) - statistics.pstdev(gle))), 3)
    res["top_pairs"] = [[a, b, n] for (a, b), n in conf.most_common(40)]
    # code-switching (GlotLID line level)
    en = [r for r in rows if r["gl"] == "eng_Latn"]
    res["mix20_en"] = sum(1 for r in en if r["mix"] >= 0.2)
    res["en_gl"] = len(en)
    res["mix20_all"] = sum(1 for r in rows if r["mix"] >= 0.2)
    res["mix_langs_en"] = collections.Counter(r["mix_lang"] for r in en if r["mix"] >= 0.2).most_common(12)
    # low-resource: GlotLID language with no lid.176 label (by ISO 639-3)
    notin = [r for r in rows if r["gl"].split("_")[0] not in ft3 and mac.get(r["gl"].split("_")[0]) not in ft3
             and not r["gl"].startswith(("und", "zxx"))]
    res["gl_not_in_ft"] = len(notin)
    res["gl_not_in_ft_top"] = collections.Counter(r["gl"] for r in notin).most_common(15)
    res["gl_not_in_ft_ft_label"] = collections.Counter(r["ft"] for r in notin).most_common(10)
    res["gl_noise"] = sum(1 for r in rows if r["gl"].startswith(("und", "zxx")))
    res["gl_labels_used"] = len({r["gl"] for r in rows})
    res["disagree_en"] = sum(1 for r in rows if (r["ft_en"] > 0.65) != (r["gl_en"] > 0.65))
    # examples: English for one model and not the other, organisations' pages only, short scrubbed excerpts
    import random
    import urllib.parse
    from ef_labels import scrub
    dis = [r for r in rows if (r["ft_en"] > 0.65) != (r["gl_en"] > 0.65)]
    random.Random(4).shuffle(dis)
    want = {r["id"]: r for r in dis}
    ex = []
    for d in L.run0("extracted"):
        r = want.get(d["id"])
        if not r:
            continue
        host = urllib.parse.urlsplit(d["metadata"]["url"]).netloc
        if not host.endswith((".org", ".edu", ".gov", ".int", ".ac.uk", ".org.uk", ".gov.uk", ".edu.au", ".gov.au")):
            continue
        ex.append({"host": host, "ft": r["ft"], "fts": r["fts"], "ft_en": r["ft_en"], "gl": r["gl"], "gls": r["gls"],
                   "gl_en": r["gl_en"], "t": scrub(d["text"], 220)})
    res["examples"] = ex[:14]
    res["names"] = {c: iso["names"].get(c.split("_")[0], c) for c in {x[0] for x in res["gl_not_in_ft_top"]} |
                    {x[1] for x in res["top_pairs"]} | {x[0] for x in res["mix_langs_en"] if x[0]}}
    res["ft_labels_used"] = len({r["ft"] for r in rows})
    return res


def main():
    idx, lab_groups = workbench()
    pd = json.load(open(os.path.join(E.ROOT_SRC, "pipe", "out", "page_data.json")))
    out = {"wceb": wceb(), "timing": timing(),
           "pipe": {"variants": pd["variants"], "as_shipped": pd["as_shipped"], "run0": {k: v for k, v in pd["run0"].items()
                                                                                       if k != "removed"},
                    "timing": {k: pd["timing"][k] for k in ("pages", "trafilatura_mb_per_s", "resiliparse_mb_per_s",
                                                            "speedup", "load_avg_1min")},
                    "url": {"labels": pd["url"]["labels"], "reasons": pd["url"]["reasons"]},
                    "variants_vs_fineweb": pd["derived"]["variants_vs_fineweb"],
                    "traf_recovered": {k: v for k, v in pd["derived"]["traf_recovered"].items() if k != "outcomes"},
                    "traf_status": pd["derived"]["traf_status"],
                    "wide": json.load(open(os.path.join(E.ROOT_SRC, "pipe", "out", "wide.json")))["total"]},
           "lid": lid()}
    E.save("ef_collect.json", out)
    print({k: (v if k != "lid" else (v and {kk: vv for kk, vv in v.items() if not isinstance(vv, list)}))
           for k, v in out.items() if k not in ("pipe",)})


if __name__ == "__main__":
    main()
