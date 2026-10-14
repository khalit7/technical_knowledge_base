"""Run the rule-based (no model) PDF text extractors on a list of PDFs.
usage: python -I parse_light.py <pdf_dir> <out_dir> [name ...]
Writes <out_dir>/<parser>/<stem>.md (pages joined by a form feed line) and <out_dir>/<parser>/_times.json
(wall seconds per file, CPU, single thread, not under the bench lock: indicative only).
Parsers, each at its default settings:
  pypdf       PdfReader(path).pages[i].extract_text()                     (pypdf 6.20.1, "plain" mode)
  pdfminer    pdfminer.high_level.extract_text(path)                      (pdfminer.six 20260107, default LAParams)
  pdfplumber  page.extract_text()                                         (pdfplumber 0.11.10)
  pymupdf     page.get_text("text")  (content-stream order)               (PyMuPDF 1.28.2)
  pymupdf_sort page.get_text("text", sort=True) (blocks sorted top-left)  (PyMuPDF 1.28.2)
  pymupdf4llm pymupdf4llm.to_markdown(path)                               (pymupdf4llm 1.28.2)
  pdftotext   poppler pdftotext (default reading-order mode)              (poppler from Homebrew)
"""
import json, os, subprocess, sys, time

PDF_DIR, OUT = sys.argv[1], sys.argv[2]
only = set(sys.argv[3:])
FF = "\n\n<!-- page break -->\n\n"


def p_pypdf(path):
    from pypdf import PdfReader
    return FF.join((pg.extract_text() or "") for pg in PdfReader(path).pages)


def p_pdfminer(path):
    from pdfminer.high_level import extract_text
    return extract_text(path).replace("\x0c", FF)


def p_pdfplumber(path):
    import pdfplumber
    with pdfplumber.open(path) as pdf:
        return FF.join((pg.extract_text() or "") for pg in pdf.pages)


def p_pymupdf(path, sort=False):
    import pymupdf
    with pymupdf.open(path) as doc:
        return FF.join(pg.get_text("text", sort=sort) for pg in doc)


def p_pymupdf_sort(path):
    return p_pymupdf(path, sort=True)


def p_pymupdf4llm(path):
    import pymupdf4llm
    return pymupdf4llm.to_markdown(path, show_progress=False)


def p_pdftotext(path):
    out = subprocess.run(["pdftotext", "-enc", "UTF-8", path, "-"], capture_output=True, check=True).stdout
    return out.decode("utf-8", "replace").replace("\x0c", FF)


PARSERS = {k[2:]: v for k, v in globals().items() if k.startswith("p_")}

pdfs = sorted(os.path.relpath(os.path.join(r, f), PDF_DIR) for r, _, fs in os.walk(PDF_DIR, followlinks=True)
              for f in fs if f.endswith(".pdf"))
for name, fn in PARSERS.items():
    if only and name not in only:
        continue
    od = os.path.join(OUT, name)
    os.makedirs(od, exist_ok=True)
    times = {}
    for f in pdfs:
        t0 = time.time()
        try:
            txt = fn(os.path.join(PDF_DIR, f))
        except Exception as e:  # a failure is a result: record it
            txt = ""
            times[f + ":error"] = repr(e)[:300]
        times[f] = round(time.time() - t0, 3)
        os.makedirs(os.path.dirname(os.path.join(od, f)), exist_ok=True)
        open(os.path.join(od, f[:-4] + ".md"), "w").write(txt)
    times["_loadavg"] = os.getloadavg()
    json.dump(times, open(os.path.join(od, "_times.json"), "w"), indent=0)
    print(name, "done", round(sum(v for k, v in times.items() if isinstance(v, float)), 1), "s")
