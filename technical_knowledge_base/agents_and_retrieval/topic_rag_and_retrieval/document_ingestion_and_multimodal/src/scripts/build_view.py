"""Data for the Parser viewer tab: a few single pages, every parser's real output, and the checks run on each.
usage: python -I build_view.py <olmpkg_dir> <ING_DIR> <src dir>
Pages: pages 2 and 4 of arXiv 1909.00175 (QASPER; parsed as single-page PDFs in ING/view_pdf -> ING/view_out), checked
with olmOCR-bench's own test classes built here: the annotators' evidence paragraphs on that page must be present
(first 200 characters, placeholders removed, up to 10% of characters different), and
on the table page five cell relations of Table 1 (read from the LaTeX source) must hold. Plus one olmOCR-bench page
per category, chosen as the page where the parsers disagree most (largest spread of pass rates), with its own tests.
Outputs longer than 2,500 characters are cut. Images: 260 px wide grey JPEG, quality 40."""
import json, os, re, sys
sys.path.insert(0, sys.argv[1])
from olmocr.bench.tests import TextPresenceTest, TableTest, load_tests  # noqa: E402
import pymupdf

ING, SRC = sys.argv[2], sys.argv[3]
IMG = os.path.join(SRC, "data", "img")
CUT = 2500
PARSERS = ["pypdf", "pdfminer", "pdfplumber", "pymupdf", "pymupdf4llm", "pdftotext", "docling", "unst_fast",
           "unst_hires", "marker", "mineru_basic", "mineru_flash", "tesseract"]


def render(pdf, name):
    with pymupdf.open(pdf) as d:
        pg = d[0]; z = 260 / pg.rect.width
        pg.get_pixmap(matrix=pymupdf.Matrix(z, z), colorspace=pymupdf.csGRAY).save(os.path.join(IMG, name), jpg_quality=40)
    return name


def outputs(base, rel):
    o, full = {}, {}
    for p in PARSERS:
        f = os.path.join(base, p, rel[:-4] + ".md")
        if os.path.exists(f):
            t = open(f).read(); full[p] = t; o[p] = t[:CUT]
    return o, full


def desc(t):
    if t.type == "present": return "Present: “" + t.text[:90] + ("...”" if len(t.text) > 90 else "”")
    if t.type == "absent": return "Absent (header, footer or stamp): “" + t.text[:80] + "”"
    if t.type == "order": return "Order: “" + t.before[:50] + "...” before “" + t.after[:50] + "...”"
    if t.type == "table":
        rels = [(k, getattr(t, k)) for k in ("up", "down", "left", "right", "top_heading", "left_heading") if getattr(t, k)]
        return "Table: cell “" + t.cell + "” with " + ", ".join("%s “%s”" % (k.replace("_", " "), v) for k, v in rels)
    return t.type


def needles(t):
    if t.type in ("present", "absent"): return [t.text]
    if t.type == "order": return [t.before, t.after]
    if t.type == "table": return [t.cell]
    return []


def page(label, about, pdf, base, rel, tests, imgname):
    o, full = outputs(base, rel)
    T = []
    for t in tests:
        r = {}
        for p in o:
            try: r[p] = bool(t.run(full[p])[0])
            except Exception: r[p] = False
        T.append({"type": t.type, "desc": desc(t), "needles": needles(t), "res": r})
    return {"label": label, "about": about, "img": render(pdf, imgname), "outputs": o,
            "truncated": {p: len(full[p]) > CUT for p in o}, "full_len": {p: len(full[p]) for p in o}, "tests": T}


pages = []
# ---- QASPER pages
import pandas as pd
RS = os.path.dirname(ING)
q = pd.read_parquet(os.path.join(RS, "data", "raw", "qasper", "validation.parquet"))
r = q[q["id"] == "1909.00175"].iloc[0]
ev = sorted(set(e for a in r["qas"]["answers"] for x in a["answer"] for e in x["evidence"] if not e.startswith("FLOAT")))
PH = re.compile(r"\s*\b(?:BIBREF|INLINEFORM|DISPLAYFORM|TABREF|FIGREF|SECREF)\d+\b")
for pno, label, extra in ((2, "arXiv 1909.00175, page 2: two columns, the method's evidence paragraphs", "p2"),
                          (4, "arXiv 1909.00175, page 4: Table 1 across both columns", "p4")):
    pdf = os.path.join(ING, "view_pdf", "qasper", "1909.00175_p%d.pdf" % pno)
    with pymupdf.open(pdf) as d:
        ptxt = re.sub(r"\s+", " ", d[0].get_text())
    tests = []
    for i, e in enumerate(ev):
        seg = max(PH.split(e), key=len).strip()[:200]
        if len(seg) > 60 and seg[:40] in ptxt.replace("- ", ""):
            tests.append(TextPresenceTest(pdf="x", page=1, id="ev%d" % i, type="present", text=seg, max_diffs=len(seg) // 10))
    if pno == 4:
        for cell, kw in (("92.19", {"left": "93.28"}), ("80.19", {"left": "77.10"}), ("89.76", {"left": "93.08"}),
                         ("91.25", {"down": ""}), ("CRF", {"right": "87.21"})):
            kw = {k: v for k, v in kw.items() if v}
            tests.append(TableTest(pdf="x", page=1, id="t" + cell, type="table", cell=cell, max_diffs=0, **kw))
    about = ("A QASPER paper of the running example, arXiv 1909.00175 v1 (Zou and Lu, 2019), page %d alone. Checks: the "
             "annotators' evidence paragraphs that sit on this page must be present%s." %
             (pno, ", and five cell relations of Table 1 (ground truth from the LaTeX source) must hold" if pno == 4 else ""))
    pages.append(page(label, about, pdf, os.path.join(ING, "view_out"), "qasper/1909.00175_p%d.pdf" % pno, tests,
                      "view_1909.00175_%s.jpg" % extra))
# ---- olmOCR pages: one per category, largest disagreement between parsers
man = json.load(open(os.path.join(ING, "fetch_manifest.json")))
LAB = {"multi_column": "multi column", "headers_footers": "headers and footers", "table_tests": "table",
       "old_scans": "old scan", "long_tiny_text": "long tiny text"}
for cat, pdfs in man["olmocr_sample"].items():
    ts = load_tests(os.path.join(ING, "olmocr", cat + ".jsonl"))
    best, bs = None, -1
    for pdf in pdfs:
        tt = [t for t in ts if t.pdf == pdf]
        if len(tt) < 3: continue
        o, full = outputs(os.path.join(ING, "out_olm"), pdf)
        rates = [sum(bool(t.run(full[p])[0]) for t in tt) / len(tt) for p in o]
        if rates and max(rates) - min(rates) > bs:
            bs, best = max(rates) - min(rates), (pdf, tt)
    pdf, tt = best
    tt = tt[:12]
    about = ("olmOCR-bench, category " + LAB[cat] + ": " + pdf.split("/")[-1] + " (Allen AI, ODC-BY), with the benchmark's own "
             "tests for this page%s." % (" (first 12)" if len(tt) == 12 else ""))
    pages.append(page("olmOCR-bench " + LAB[cat] + " page", about, os.path.join(ING, "olmocr", "pdfs", pdf),
                      os.path.join(ING, "out_olm"), pdf, tt, "view_olm_%s.jpg" % cat))
names = {"pypdf": "pypdf", "pdfminer": "pdfminer.six", "pdfplumber": "pdfplumber", "pymupdf": "PyMuPDF",
         "pymupdf4llm": "pymupdf4llm", "pdftotext": "pdftotext", "docling": "Docling", "unst_fast": "Unstructured fast",
         "unst_hires": "Unstructured hi_res", "marker": "Marker (no OCR)", "mineru_basic": "MinerU basic",
         "mineru_flash": "MinerU flash", "tesseract": "Tesseract"}
used = [p for p in PARSERS if any(p in pg["outputs"] for pg in pages)]
json.dump({"parsers": used, "names": names, "pages": pages}, open(os.path.join(SRC, "data", "view.json"), "w"), ensure_ascii=False)
print(len(pages), "pages;", used, "; bytes", os.path.getsize(os.path.join(SRC, "data", "view.json")))
