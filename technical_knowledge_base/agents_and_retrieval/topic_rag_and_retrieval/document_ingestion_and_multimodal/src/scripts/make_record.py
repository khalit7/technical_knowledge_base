"""One real chunk record for the Reading tab's metadata section: Docling's structured output for arXiv 1909.00175,
the paragraph that holds the text "Empirical results on the benchmark datasets" (the abstract) or, failing that, the
first paragraph of section 4, with its page, bounding box and heading path.
usage: python -I make_record.py <pdf> <out.json>"""
import datetime, hashlib, json, os, sys
import importlib.metadata as md
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.accelerator_options import AcceleratorOptions

PDF, OUT = sys.argv[1:3]
o = PdfPipelineOptions(); o.accelerator_options = AcceleratorOptions(device="cpu", num_threads=4)
doc = DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=o)}).convert(PDF).document
heads, pick = [], None
for item, level in doc.iterate_items():
    lab = str(item.label).split(".")[-1].lower()
    if lab in ("section_header", "title"):
        heads = heads[:max(0, level - 1)] + [item.text]
    if lab == "text" and "We evaluate our model on two" in item.text:
        pick = (item, list(heads)); break
if pick is None:
    for item, level in doc.iterate_items():
        if str(item.label).split(".")[-1].lower() == "text" and len(item.text) > 300:
            pick = (item, list(heads)); break
item, hp = pick
pv = item.prov[0]
bb = pv.bbox
raw = open(PDF, "rb").read()
rec = {
    "chunk_id": "arxiv:1909.00175#p%d-%s" % (pv.page_no, hashlib.sha256(item.text.encode()).hexdigest()[:12]),
    "text": item.text,
    "doc_id": "arxiv:1909.00175", "source_url": "https://arxiv.org/abs/1909.00175v1", "doc_version": "v1",
    "doc_sha256": hashlib.sha256(raw).hexdigest()[:16] + "...",
    "page": pv.page_no, "bbox": [round(bb.l, 1), round(bb.t, 1), round(bb.r, 1), round(bb.b, 1)],
    "bbox_origin": str(bb.coord_origin).split(".")[-1],
    "heading_path": [h for h in hp if h], "element_type": str(item.label).split(".")[-1].lower(),
    "chunk_sha256": hashlib.sha256(" ".join(item.text.lower().split()).encode()).hexdigest()[:16] + "...",
    "parser": "docling %s" % md.version("docling"), "ocr_used": False,
    "acl": ["group:nlp-papers"], "parsed_at": datetime.date.today().isoformat(),
}
json.dump(rec, open(OUT, "w"), indent=1, ensure_ascii=False)
print(json.dumps(rec, indent=1, ensure_ascii=False)[:1500])
