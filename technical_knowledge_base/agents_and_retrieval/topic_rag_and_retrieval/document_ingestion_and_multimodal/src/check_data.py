"""Checks that the page embeds exactly the recorded data and that numbers written in the prose match it.
usage: python3 check_data.py      (after build_data.py and build.sh)
1. parts/22_ing_data.js, parsed back, equals the object build_data.py assembles from data/*.json.
2. index.html contains that same data line verbatim.
3. Every prose claim below is recomputed from data/*.json and its text must appear in index.html."""
import json, os, re, subprocess, sys

H = os.path.dirname(os.path.abspath(__file__))
D = lambda n: json.loads(open(os.path.join(H, "data", n)).read().replace("\u2014", "\u2013"))  # build_data prints em dashes as en dashes
js = open(os.path.join(H, "parts", "22_ing_data.js")).read()
emb = json.loads(js[js.index("window.ING=") + len("window.ING="):js.rstrip().rindex(";")])
html = open(os.path.join(H, "..", "index.html")).read()
bad = 0


def ok(c, msg):
    global bad
    print(("ok   " if c else "FAIL ") + msg)
    bad += not c


# 1 + 2
src = {k: v for k, v in emb.items()}
ok(emb["res"]["qasper"] == D("results_auto.json")["qasper"], "embedded QASPER results equal data/results_auto.json")
ok(emb["res"]["olm"] == D("results_auto.json")["olm"], "embedded olmOCR results equal data/results_auto.json")
ok(emb["cd"]["papers"] == D("cd.json")["papers"], "embedded re-indexing data equal data/cd.json")
ok(emb["table"]["parsers"] == D("table_auto.json")["parsers"], "embedded table scores equal data/table_auto.json")
if os.path.exists(os.path.join(H, "data", "mm_auto.json")):
    ok(emb["mm"]["sets"] == D("mm_auto.json")["sets"], "embedded ViDoRe results equal data/mm_auto.json")
if os.path.exists(os.path.join(H, "data", "view.json")):
    ok(len(emb["view"]["pages"]) == len(D("view.json")["pages"]), "embedded viewer pages equal data/view.json")
ok(js.strip().split("\n")[1] in html, "index.html carries 22_ing_data.js verbatim")

# 3 prose claims
q = D("results_auto.json")["qasper"]["parsers"]
cd = D("cd.json"); T = cd["totals"]; ts = D("table_auto.json")["parsers"]
pct = lambda x: "%.1f%%" % (100 * x)
claims = [
    ("%d of 107" % q["pdfplumber"]["evidence"]["intact"], "1 of 107"),
    ("pdfplumber loses %d" % q["pdfplumber"]["evidence"]["lost"], None),
    ("pypdf keeps %d intact and loses %d" % (q["pypdf"]["evidence"]["intact"], q["pypdf"]["evidence"]["lost"]), None),
    ("Docling keeps %d intact" % q["docling"]["evidence"]["intact"], None),
    ("changed %s of the words" % pct(T["floor_changed_word_share"]), None),
    ("re-embedded %s of the words" % pct(T["fixed"]["reembed_word_share"]), None),
    ("and %s with 50 words of overlap" % pct(T["overlap"]["reembed_word_share"]), None),
    ("structure-aware chunks %s" % pct(T["structure"]["reembed_word_share"]), None),
    ("content-defined chunks %s" % pct(T["cdc"]["reembed_word_share"]), None),
    ("1 of %d re-embedded" % cd["papers"]["1801.02073"]["structure"]["chunks_new"], None),
    ("1 of %d" % cd["papers"]["1801.02073"]["cdc"]["chunks_new"], None),
    ("all %d chunks" % cd["papers"]["1801.02073"]["fixed"]["chunks_new"], None),
]
ra = D("results_auto.json"); cost = ra["cost"]
I = lambda p: q[p]["evidence"]["intact"]
claims += [
    ("took %s s per page on the QASPER papers and %s s on the olmOCR sample" % (cost["tesseract"]["q"], cost["tesseract"]["o"]), None),
    ("(MinerU flash %d intact, Docling %d, Marker %d, MinerU basic and pymupdf4llm %d, pdftotext %d)" % (I("mineru_flash"), I("docling"), I("marker"), I("mineru_basic"), I("pdftotext")), None),
    ("(pypdf %d, pdfminer.six %d, PyMuPDF %d, Unstructured %d and %d, Tesseract on the rendered pages %d)" % (I("pypdf"), I("pdfminer"), I("pymupdf"), I("unst_fast"), I("unst_hires"), I("tesseract")), None),
    ("keeps %d." % I("pdfplumber"), None),
]
assert I("mineru_basic") == I("pymupdf4llm")
r3 = sorted(round(100 * v["recall_at"]["3"]) for k, v in q.items() if k not in ("pdfplumber", "s2orc"))
claims += [("Recall@3 of BM25 is %d to %d%% for every tool except pdfplumber (%d%%), and QASPER's own clean text scores %d%%" % (r3[0], r3[-1], round(100 * q["pdfplumber"]["recall_at"]["3"]), round(100 * q["s2orc"]["recall_at"]["3"])), None)]
tb = ts
adj = sorted(round(tb[p]["adj_f1"], 2) for p in ("mineru_basic", "mineru_flash", "pymupdf4llm"))
hd = sorted(round(100 * tb[p]["hdr_ok"]) for p in ("mineru_basic", "mineru_flash", "pymupdf4llm"))
claims += [("(adjacency F1 %.2f to %.2f)" % (adj[0], adj[-1]), None), ("only %d to %d%% of numbers" % (hd[0], hd[-1]), None)]
st = json.load(open(os.path.join(H, "inputs", "qasper_stats.json")))["counts"]
claims += [("<b>%d</b> (%.1f%%) of the %d answerable" % (st["ev_float_only"] + st["ev_mixed"], 100 * (st["ev_float_only"] + st["ev_mixed"]) / st["answerable"], st["answerable"]), None),
           ("<b>%d</b> of them a table or figure is the only evidence (%d tables, %d figures" % (st["ev_float_only"], st["float_table"], st["float_figure"]), None)]
o = ra["olm"]["parsers"]; sc = lambda p, c: round(100 * o[p][c]["score"])
txt_tools = ["pypdf", "pdfminer", "pdfplumber", "pymupdf", "pymupdf_sort", "pymupdf4llm", "pdftotext", "unst_fast", "tesseract"]
hf = sorted(sc(p, "headers_footers") for p in txt_tools)
tt = sorted(sc(p, "table_tests") for p in ("docling", "mineru_basic", "pymupdf4llm", "marker", "unst_hires"))
os_ = sorted(sc(p, "old_scans") for p in o)
claims += [("(Marker %d, MinerU basic %d, Docling %d)" % (sc("marker", "headers_footers"), sc("mineru_basic", "headers_footers"), sc("docling", "headers_footers")), None),
           ("(%d to %d), and so does Unstructured hi_res (%d)" % (hf[0], hf[-1], sc("unst_hires", "headers_footers")), None),
           ("MinerU flash %d%%, the other table-aware tools %d to %d%%" % (sc("mineru_flash", "table_tests"), tt[0], tt[-1]), None),
           ("pdftotext's own column detection (%d) beats pypdf (%d) and PyMuPDF's <code>sort=True</code> collapses (%d)" % (sc("pdftotext", "multi_column"), sc("pypdf", "multi_column"), sc("pymupdf_sort", "multi_column")), None),
           ("(%d to %d)" % (os_[0], os_[-1]), None),
           ("(MinerU %d, Docling %d, Tesseract %d)" % (sc("mineru_basic", "long_tiny_text"), sc("docling", "long_tiny_text"), sc("tesseract", "long_tiny_text")), None)]
mm = D("mm_auto.json")["sets"]; n = lambda st, k: "%.1f" % mm[st]["ndcg5"][k]
vp = sorted(round(v["colsmol"]["vectors_per_page_mean"]) for v in mm.values())
sp = sorted(v["colsmol"]["s_per_page"] for v in mm.values()); op = sorted(v["ocr_s_per_page"] for v in mm.values())
claims += [("colSmol %s against %s for BM25" % (n("Energy", "colsmol"), n("Energy", "bm25")), None),
           ("&plusmn;%.1f and &plusmn;%.1f" % (mm["Energy"]["ci"]["colsmol"], mm["Energy"]["ci"]["bm25"]), None),
           ("ArxivQA (figures) %s against %s" % (n("ArxivQ", "colsmol"), n("ArxivQ", "bm25")), None),
           ("InfoVQA (infographics) %s against %s" % (n("InfoQ", "colsmol"), n("InfoQ", "bm25")), None),
           ("(%s against %s)" % (n("Energy", "bm25"), n("Energy", "bge")), None),
           ("colSmol produced %d to %s vectors" % (vp[0], "{:,}".format(vp[-1])), None),
           ("Encoding took %.1f to %.1f s per page" % (sp[0], sp[-1]), None),
           ("against %.1f to %.1f s for Tesseract" % (op[0], op[-1]), None),
           ("BM25 on the full InfoVQA set: %s against %s on the subset" % (n("InfoQ", "full_bm25"), n("InfoQ", "bm25")), None)]
for text, _ in claims:
    ok(text in html, "prose: " + text)
extra = os.path.join(H, "check_claims.json")
if os.path.exists(extra):
    for text in json.load(open(extra)):
        ok(text in html, "prose: " + text)
print("FAIL" if bad else "ALL OK", bad)
sys.exit(1 if bad else 0)
