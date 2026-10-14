"""Copy the small results of every run from the scratch folder into src/data/*.json, in the shapes the page reads.
usage: python -I collect.py <ING_DIR> <src dir>
Reads: qasper_scores.json, olm_scores.json, out_*/*/_times.json, change_detect.json, table_score.json, anatomy,
view outputs, vidore/<set>/{meta,eval,rank_*,colsmol_stats,ocr_times}.json. Writes src/data/{results,view,table,
cd,mm,anatomy,record}.json and src/data/img/*.jpg (small page images)."""
import glob, io, json, os, re, statistics, sys

I, SRC = sys.argv[1], sys.argv[2]
DD = os.path.join(SRC, "data"); IMG = os.path.join(DD, "img")
os.makedirs(IMG, exist_ok=True)
J = lambda *p: json.load(open(os.path.join(I, *p)))
NAMES = {"pypdf": "pypdf", "pdfminer": "pdfminer.six", "pdfplumber": "pdfplumber", "pymupdf": "PyMuPDF",
         "pymupdf_sort": "PyMuPDF sort=True", "pymupdf4llm": "pymupdf4llm", "pdftotext": "pdftotext (poppler)",
         "docling": "Docling", "docling_noocr": "Docling, no OCR", "unst_fast": "Unstructured fast",
         "unst_hires": "Unstructured hi_res", "tesseract": "Tesseract OCR only", "marker": "Marker (fast, no OCR)",
         "mineru_basic": "MinerU basic", "mineru_flash": "MinerU flash", "s2orc": "QASPER text (S2ORC)"}
MODELS = {"pypdf": "none", "pdfminer": "none", "pdfplumber": "none", "pymupdf": "none", "pymupdf_sort": "none",
          "pymupdf4llm": "none; RapidOCR on pages it judges to be images", "pdftotext": "none",
          "docling": "layout (heron), TableFormer, OCR when needed", "unst_fast": "none",
          "unst_hires": "YOLOX layout, table transformer, Tesseract", "tesseract": "Tesseract LSTM on 300 dpi renders",
          "marker": "rf-detr layout, text layer only (OCR and Surya VLM off)", "mineru_basic": "ONNX layout and OCR models",
          "mineru_flash": "none (native)"}


def times(set_dir, p):
    f = os.path.join(I, set_dir, p, "_times.json")
    if not os.path.exists(f):
        return None
    t = json.load(open(f))
    if "_batch_wall_s" in t:  # Marker runs as one batch: spread the wall time over its pages
        return ("batch", t["_batch_wall_s"], t["_pages"])
    v = [x[0] if isinstance(x, list) else x for k, x in t.items() if not k.startswith("_") and ":error" not in k and isinstance(x, (list, float, int))]
    return v


def pages(pdf):
    import pymupdf
    with pymupdf.open(pdf) as d:
        return len(d)


out = {"names": NAMES}
# ---------------- QASPER evidence survival
q = J("qasper_scores.json")
out["qasper"] = {k: q[k] for k in ("n_papers", "n_questions", "n_text_evidence", "n_questions_float_only")}
out["qasper"]["parsers"] = q["parsers"]
order_q = sorted([p for p in q["parsers"] if p != "s2orc"], key=lambda p: -(q["parsers"][p]["evidence"]["intact"] + 0.5 * q["parsers"][p]["evidence"]["damaged"]))
out["order_q"] = ["s2orc"] + order_q
# ---------------- olmOCR sample
o = J("olm_scores.json")
cats = ["multi_column", "headers_footers", "table_tests", "old_scans", "long_tiny_text"]
out["olm_cats"] = cats
out["cat_names"] = {"multi_column": "Multi column", "headers_footers": "Headers and footers", "table_tests": "Tables",
                    "old_scans": "Old scans", "long_tiny_text": "Long tiny text"}
out["olm"] = {"n_tests": o["n_tests"], "n_pdfs": o["n_pdfs"],
              "parsers": {p: {**{c: {"score": r[c]["score"], "n": r[c]["n"], "by_type": r[c]["by_type"]} for c in cats},
                              "mean_of_categories": r["mean_of_categories"], "ci95": r["ci95"], "baseline": r["baseline"]}
                          for p, r in o["parsers"].items()}}
out["order_o"] = sorted(o["parsers"], key=lambda p: -o["parsers"][p]["mean_of_categories"])
# ---------------- cost per page
qp = {os.path.basename(f)[:-4]: pages(f) for f in glob.glob(os.path.join(I, "qasper_pdf", "latest", "*.pdf"))}
cost = {}
for p in out["order_o"]:
    tq, to = times("out_qasper", p), times("out_olm", p)
    c = {"models": MODELS.get(p, "")}
    if isinstance(tq, tuple):
        c["q"] = "%.2f" % (tq[1] / tq[2])
    elif tq:
        c["q"] = "%.2f" % (sum(tq) / sum(qp.values()))
    else:
        c["q"] = "not run"
    if isinstance(to, tuple):
        c["o"] = "%.2f" % (to[1] / to[2])
    else:
        c["o"] = "%.2f" % (sum(to) / len(to)) if to else "not run"
    cost[p] = c
out["cost"] = cost
out["n_qasper_pages"] = sum(qp.values())
json.dump(out, open(os.path.join(DD, "results_auto.json"), "w"), indent=0, ensure_ascii=False)
print("results_auto.json written;", len(out["order_o"]), "parsers on olmOCR,", len(order_q), "on QASPER;",
      out["n_qasper_pages"], "QASPER pages")

# ---------------- change detection
if os.path.exists(os.path.join(I, "change_detect.json")):
    cdd = J("change_detect.json")
    cdd["detail"] = max(cdd["papers"], key=lambda p: cdd["papers"][p]["fixed"]["reembed_words"] / cdd["papers"][p]["words_new"]
                        - cdd["papers"][p]["words_changed"] / cdd["papers"][p]["words_new"])
    cdd["note"] = ("Measured on the %d papers of the sample that have two or more arXiv versions (1802.00396 is excluded: its "
                   "v2 is a withdrawal notice), last two versions compared, both parsed by Docling 2.138.0 on CPU. Words "
                   "changed: difflib over lower-cased words of the new version, inserted or replaced. Content-defined "
                   "chunking: a boundary where zlib.crc32 of the last three words is divisible by 24, 60 to 400 words "
                   "per chunk. Script: src/scripts/change_detect.py.") % len(cdd["papers"])
    json.dump(cdd, open(os.path.join(DD, "cd.json"), "w"), ensure_ascii=False)
    print("cd.json", len(cdd["papers"]), "papers")
# ---------------- table lab
if os.path.exists(os.path.join(I, "table_score.json")):
    ts = J("table_score.json")
    order = sorted(ts["parsers"], key=lambda p: (-(ts["parsers"][p]["hdr_ok"] or -1), -(ts["parsers"][p]["adj_f1"] or -1),
                                                 -ts["parsers"][p]["cells_present"]))
    for p, r in ts["parsers"].items():
        r["form"] = {"md": "Markdown table", "html": "HTML table", "text": "plain text"}[r["form"]]
        if r["grid"]:
            r["grid"] = [row for row in r["grid"]]
    tab = {"gt": ts["gt"], "question_cells": ts["question_cells"], "rows": ts["rows"], "order": order,
           "names": NAMES, "parsers": ts["parsers"], "img": "table_1909.00175.jpg"}
    json.dump(tab, open(os.path.join(DD, "table_auto.json"), "w"), ensure_ascii=False)
    print("table_auto.json", order)

# ---------------- page-image retrieval (ViDoRe)
SETS = [("infovqa_test_subsampled_sub", "InfoVQA (infographics)", "InfoQ"), ("arxivqa_test_subsampled_sub", "ArxivQA (figures)", "ArxivQ"),
        ("syntheticDocQA_energy_test_sub", "Energy (text-heavy reports)", "Energy")]
PUB = {"InfoQ": {"pub_colpali": 81.8, "pub_ocr_bm25": 62.9, "pub_cap_bge": 71.9},
       "ArxivQ": {"pub_colpali": 79.1, "pub_ocr_bm25": 31.6, "pub_cap_bge": 35.7},
       "Energy": {"pub_colpali": 91.0, "pub_ocr_bm25": 85.9, "pub_cap_bge": 83.3}}  # ColPali paper Table 2 (inputs/colpali_tables_v6.txt)
if all(os.path.exists(os.path.join(I, "vidore", s, "rank_colsmol.json")) for s, _, _ in SETS):
    from PIL import Image
    mm = {"systems": [
        {"key": "bm25", "label": "Tesseract OCR + BM25 (here)", "color": "var(--c2)"},
        {"key": "bge", "label": "Tesseract OCR + bge-small (here)", "color": "var(--c5)"},
        {"key": "full_bm25", "label": "OCR + BM25, full set (here)", "color": "var(--c2)", "full": True},
        {"key": "colsmol", "label": "Page image, colSmol-256M (here)", "color": "var(--c1)"},
        {"key": "pub_ocr_bm25", "label": "Unstructured + OCR + BM25 (paper)", "color": "var(--c2)", "pub": True},
        {"key": "pub_cap_bge", "label": "Unstructured + captions + BGE-M3 (paper)", "color": "var(--c5)", "pub": True},
        {"key": "pub_colpali", "label": "Page image, ColPali 3B (paper)", "color": "var(--c1)", "pub": True}],
        "sets": {}, "thumbs": {}}
    for s, label, short in SETS:
        d = os.path.join(I, "vidore", s)
        ev = json.load(open(os.path.join(d, "eval.json"))); meta = json.load(open(os.path.join(d, "meta.json")))
        ranks = {k: json.load(open(os.path.join(d, "rank_%s.json" % k))) for k in ("bm25", "bge", "colsmol")}
        nd = {k: round(v["ndcg5"], 1) for k, v in ev["systems"].items()}; nd.update(PUB[short])
        ci = {k: round((v["ci95"][1] - v["ci95"][0]) / 2, 1) for k, v in ev["systems"].items()}
        rk = lambda k, q: (ranks[k][q["qid"]].index(q["gold"]) + 1) if q["gold"] in ranks[k][q["qid"]] else None
        exs = []
        pick1 = next((q for q in meta["queries"] if rk("colsmol", q) == 1 and (rk("bm25", q) or 999) > 5), None)
        pick2 = next((q for q in meta["queries"] if rk("bm25", q) == 1 and (rk("colsmol", q) or 999) > 5), None) or \
            next((q for q in meta["queries"] if (rk("bm25", q) or 999) < (rk("colsmol", q) or 999)), None)
        for q in (pick1, pick2):
            if not q:
                continue
            ex = {"query": q["query"], "gold": "%s:%d" % (short, q["gold"]), "top": {}, "rank": {}}
            for k in ranks:
                ex["rank"][k] = rk(k, q)
                ex["top"][k] = ["%s:%d" % (short, x) for x in ranks[k][q["qid"]][:3]]
                for x in ranks[k][q["qid"]][:3]:
                    key = "%s:%d" % (short, x); fn = "mm_%s_%d.jpg" % (short, x)
                    if key not in mm["thumbs"]:
                        im = Image.open(os.path.join(d, "img", "%d.png" % x)).convert("L")
                        im.thumbnail((110, 160)); im.save(os.path.join(IMG, fn), quality=40)
                        mm["thumbs"][key] = fn
            exs.append(ex)
        st = json.load(open(os.path.join(d, "colsmol_stats.json")))
        full = json.load(open(os.path.join(I, "vidore", s[:-4], "eval.json")))  # text retrieval on the full set
        nd["full_bm25"] = round(full["systems"]["bm25"]["ndcg5"], 1); nd["full_bge"] = round(full["systems"]["bge"]["ndcg5"], 1)
        mm["sets"][short] = {"label": label, "n_q": ev["n_queries"], "n_pages": ev["n_pages"], "ndcg5": nd, "ci": ci,
                             "examples": exs, "colsmol": st,
                             "ocr_s_per_page": statistics.mean(v for k, v in json.load(open(os.path.join(d, "ocr_times.json"))).items() if not k.startswith("_"))}
    json.dump(mm, open(os.path.join(DD, "mm_auto.json"), "w"), ensure_ascii=False)
    print("mm_auto.json", len(mm["thumbs"]), "thumbs")
