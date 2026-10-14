"""Step 5 of the Pipeline lab: do tables, code blocks and maths survive extraction?

For each of the 20,280 pages, the text inside <table>, <pre>/<code> and <math> (MathML) elements, plus TeX
delimiters in the raw HTML (MathJax/KaTeX pages), is collected with resiliparse's DOM parser; then the share of
those elements' words that appear in each extractor's output (trafilatura as run0, resiliparse with Dolma's
settings, Common Crawl's WET) is measured. A word "survives" when it is present in the output's word set
(lower-cased, alphanumeric tokens of 2+ characters), so this is a recall measure that ignores layout: a table
flattened into one line counts as surviving even though its rows and columns are gone (the layout is shown on
the page for one example instead).

Output: src/pipe/out/struct.json and $DC_SCRATCH/data/pipe/struct_rows.jsonl.gz
"""
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402

TOK = re.compile(r"[a-z0-9]{2,}")
TEX = re.compile(r"\\\(|\\\[|\$\$|\\begin\{(?:equation|align)|\\frac\{")


def words(t):
    return set(TOK.findall((t or "").lower()))


def main():
    from resiliparse.parse.html import HTMLTree
    rows = {r["id"]: r for r in P.read_jsonl_gz(P.scratch("extract_all.jsonl.gz"))}
    print("rows", len(rows), flush=True)
    agg = defaultdict(lambda: defaultdict(lambda: [0, 0.0]))  # kind -> extractor -> [pages, sum recall]
    out = []
    for i, d in enumerate(P.html_docs()):
        r = rows.get(d.id)
        if r is None:
            continue
        tree = HTMLTree.parse(d.text)
        feats = {}
        for kind, sel in (("table", "table"), ("code", "pre, code"), ("math", "math")):
            els = tree.body.query_selector_all(sel) if tree.body else []
            txt = " ".join(e.text for e in els)
            w = words(txt)
            if len(w) >= 5:
                feats[kind] = w
        if TEX.search(d.text):
            feats["tex"] = None
        if not feats:
            continue
        o = {"id": d.id}
        for kind, w in feats.items():
            o[kind] = {}
            for x in ("traf", "res", "wet"):
                t = r.get(x) if not (x == "traf" and r["traf_status"] != "run0") else None
                if kind == "tex":
                    rec = 1.0 if (t and TEX.search(t)) else 0.0  # TeX source kept in the text?
                else:
                    rec = len(w & words(t)) / len(w)
                o[kind][x] = round(rec, 3)
                agg[kind][x][0] += 1
                agg[kind][x][1] += rec
        out.append(o)
        if (i + 1) % 4000 == 0:
            print(i + 1, {k: agg[k]["res"][0] for k in agg}, flush=True)
    P.write_jsonl_gz(P.scratch("struct_rows.jsonl.gz"), out)
    P.save_out("struct.json", {k: {x: {"pages": v[0], "mean_recall": round(v[1] / max(1, v[0]), 3)}
                                   for x, v in agg[k].items()} for k in agg})
    print({k: {x: (v[0], round(v[1] / max(1, v[0]), 3)) for x, v in agg[k].items()} for k in agg})


if __name__ == "__main__":
    main()
