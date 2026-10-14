"""Score every parser's output on the olmOCR-bench sample with the benchmark's own test classes.
usage: python -I score_olmocr.py <olmpkg_dir> <ING_DIR> <out.json>
<olmpkg_dir> holds olmocr/bench/tests.py and olmocr/repeatdetect.py copied verbatim from allenai/olmocr v0.4.27
(commit 1e139a5e), with the KaTeX renderer stubbed out: the math categories are not run here.
Parser outputs are read from <ING_DIR>/out_olm/<parser>/<category dir>/<pdf stem>.md.
Score per category = share of that category's tests passed (as benchmark.py does per jsonl file); a missing
output file counts as an empty string (every test of that PDF fails except absence tests, as in the benchmark).
Also runs the benchmark's BaselineTest per PDF (non-empty, no runaway repetition)."""
import json, os, sys, glob, random
sys.path.insert(0, sys.argv[1])
from olmocr.bench.tests import load_tests, BaselineTest  # noqa: E402

ING, OUT = sys.argv[2], sys.argv[3]
man = json.load(open(os.path.join(ING, "fetch_manifest.json")))
sample = man["olmocr_sample"]
parsers = sorted(os.listdir(os.path.join(ING, "out_olm")))
res = {"parsers": {}, "n_tests": {}, "n_pdfs": {}, "per_test": {}}
tests_by_cat = {}
for cat, pdfs in sample.items():
    keep = set(pdfs)
    ts = [t for t in load_tests(os.path.join(ING, "olmocr", cat + ".jsonl")) if t.pdf in keep]
    tests_by_cat[cat] = ts
    res["n_tests"][cat] = len(ts); res["n_pdfs"][cat] = len(keep)
for p in parsers:
    r = {}
    for cat, ts in tests_by_cat.items():
        ok, by_type, fails = 0, {}, []
        for t in ts:
            f = os.path.join(ING, "out_olm", p, t.pdf[:-4] + ".md")
            md = open(f).read() if os.path.exists(f) else ""
            try:
                passed, why = t.run(md)
            except Exception as e:
                passed, why = False, "error " + repr(e)[:80]
            ok += passed
            bt = by_type.setdefault(t.type, [0, 0]); bt[0] += passed; bt[1] += 1
            res["per_test"].setdefault(t.id, {})[p] = bool(passed)
        r[cat] = {"score": ok / len(ts), "passed": ok, "n": len(ts), "by_type": by_type}
    base_ok = 0; npdf = 0
    for cat, pdfs in sample.items():
        for pdf in pdfs:
            f = os.path.join(ING, "out_olm", p, pdf[:-4] + ".md")
            md = open(f).read() if os.path.exists(f) else ""
            npdf += 1; base_ok += BaselineTest(id="b", pdf=pdf, page=1, type="baseline").run(md)[0]
    r["baseline"] = {"score": base_ok / npdf, "passed": base_ok, "n": npdf}
    cats = [c for c in tests_by_cat]
    r["mean_of_categories"] = sum(r[c]["score"] for c in cats) / len(cats)
    # bootstrap over PDFs within category (95% interval of the mean of categories)
    rng = random.Random(0); boots = []
    pdf_scores = {}
    for c, ts in tests_by_cat.items():
        d = {}
        for t in ts:
            d.setdefault(t.pdf, []).append(res["per_test"][t.id][p])
        pdf_scores[c] = list(d.values())
    for _ in range(1000):
        s = 0
        for c in cats:
            pick = [pdf_scores[c][rng.randrange(len(pdf_scores[c]))] for _ in pdf_scores[c]]
            flat = [x for l in pick for x in l]
            s += sum(flat) / len(flat)
        boots.append(s / len(cats))
    boots.sort(); r["ci95"] = [boots[25], boots[974]]
    res["parsers"][p] = r
    print(p, round(r["mean_of_categories"] * 100, 1), {c: round(r[c]["score"] * 100, 1) for c in cats})
json.dump(res, open(OUT, "w"), indent=0)
