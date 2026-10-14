"""Run one model-based parser over every PDF in a folder (each parser runs from its own env).
usage: python -I parse_models.py <parser> <pdf_dir> <out_dir>
  docling       docling 2.138.0 DocumentConverter, default PdfPipelineOptions (layout model docling-layout-heron,
                TableFormer accurate, OCR auto), export_to_markdown(); device forced to CPU unless ING_DEVICE=mps
  docling_noocr same with do_ocr=False
  unst_fast     unstructured 0.27.25 partition_pdf(strategy="fast")   (pdfminer text, no models)
  unst_hires    unstructured 0.27.25 partition_pdf(strategy="hi_res", infer_table_structure=True)  (YOLOX layout,
                Tesseract OCR for image regions, tables as HTML)
  tesseract     render each page at 300 dpi (long side capped at 4,000 px) with PyMuPDF, Tesseract 5.4.1 (LSTM, eng, --psm 3): OCR only, the
                text layer is ignored
Writes <out_dir>/<parser>/<relative path>.md and _times.json (wall seconds per file, with load average)."""
import json, os, subprocess, sys, time, tempfile

P, PDF_DIR, OUT = sys.argv[1:4]
FF = "\n\n<!-- page break -->\n\n"
od = os.path.join(OUT, P)


def find_pdfs(d):
    for root, _, fs in os.walk(d, followlinks=True):
        for f in sorted(fs):
            if f.endswith(".pdf"):
                yield os.path.relpath(os.path.join(root, f), d)


_conv = None


def docling(path, ocr=True):
    global _conv
    if _conv is None:
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.datamodel.accelerator_options import AcceleratorOptions
        o = PdfPipelineOptions(do_ocr=ocr)
        o.accelerator_options = AcceleratorOptions(device=os.environ.get("ING_DEVICE", "cpu"), num_threads=4)
        _conv = DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=o)})
    return _conv.convert(path).document.export_to_markdown()


def unst(path, strategy):
    from unstructured.partition.pdf import partition_pdf
    kw = dict(strategy=strategy)
    if strategy == "hi_res":
        kw["infer_table_structure"] = True
    els = partition_pdf(filename=path, **kw)
    out = []
    for e in els:
        html = getattr(e.metadata, "text_as_html", None)
        out.append(html if (e.category == "Table" and html) else e.text)
    return "\n\n".join(out)


def tesseract(path):
    import pymupdf
    pages = []
    with pymupdf.open(path) as doc, tempfile.TemporaryDirectory() as td:
        for i, pg in enumerate(doc):
            png = os.path.join(td, "p%d.png" % i)
            dpi = min(300, int(4000 * 72 / max(pg.rect.width, pg.rect.height)))  # oversized scans: cap the long side at 4,000 px
            pg.get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY).save(png)
            r = subprocess.run(["tesseract", png, "-", "--psm", "3", "-l", "eng"], capture_output=True)
            pages.append(r.stdout.decode("utf-8", "replace"))
    return FF.join(pages)


FN = {"docling": docling, "docling_noocr": lambda p: docling(p, ocr=False), "unst_fast": lambda p: unst(p, "fast"),
      "unst_hires": lambda p: unst(p, "hi_res"), "tesseract": tesseract}[P]
times = {}
tj = os.path.join(od, "_times.json")
if os.path.exists(tj):
    times = json.load(open(tj))
for rel in find_pdfs(PDF_DIR):
    dst = os.path.join(od, rel[:-4] + ".md")
    if os.path.exists(dst):
        continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    t0 = time.time()
    try:
        txt = FN(os.path.join(PDF_DIR, rel))
    except Exception as e:
        txt = ""; times[rel + ":error"] = repr(e)[:300]
    times[rel] = [round(time.time() - t0, 2), os.getloadavg()[0]]
    open(dst, "w").write(txt)
    json.dump(times, open(tj, "w"))
    print(rel, times[rel], flush=True)
