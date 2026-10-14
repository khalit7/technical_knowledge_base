"""Run Marker 2.0.0 in batch (`marker <folder> --mode fast --disable_ocr`: the CPU text-layer path, no Surya VLM, so nothing runs on the GPU) over every PDF of a folder tree.
usage: python -I run_marker.py <ING_DIR> <pdf_dir> <out_dir>
PDFs are linked flat into a temporary folder (path separators become "__"), converted in one batch so the models
load once, and the Markdown copied back to <out_dir>/marker/<relative path>.md. _times.json holds the batch wall time
and the number of pages (seconds per page = time / pages; indicative). Marker starts helper servers (Surya layout
and OCR-error models) on 127.0.0.1 ephemeral ports and, for pages it judges scanned or garbled, its Surya VLM
through llama.cpp."""
import json, os, shutil, subprocess, sys, time
import pymupdf

I, PDF_DIR, OUT = sys.argv[1:4]
os.chdir(I)
od = os.path.join(OUT, "marker"); os.makedirs(od, exist_ok=True)
flat = os.path.join(I, "marker_in", OUT); res = os.path.join(I, "marker_res", OUT)
os.makedirs(flat, exist_ok=True); os.makedirs(res, exist_ok=True)
rels, npages = {}, 0
for root, _, fs in os.walk(PDF_DIR, followlinks=True):
    for f in sorted(fs):
        if f.endswith(".pdf"):
            rel = os.path.relpath(os.path.join(root, f), PDF_DIR)
            key = rel.replace("/", "__")
            rels[key[:-4]] = rel
            dst = os.path.join(flat, key)
            if not os.path.exists(dst):
                os.symlink(os.path.realpath(os.path.join(PDF_DIR, rel)), dst)
            with pymupdf.open(dst) as d:
                npages += len(d)
t0 = time.time(); la0 = os.getloadavg()[0]
r = subprocess.run([os.path.join(I, "mkenv", "bin", "marker"), flat, "--output_dir", res, "--mode", "fast",
                    "--disable_image_extraction", "--disable_ocr", "--workers", "1"], capture_output=True, text=True)
wall = time.time() - t0
missing = []
for stem, rel in rels.items():
    src = os.path.join(res, stem, stem + ".md")
    dst = os.path.join(od, rel[:-4] + ".md"); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(src):
        shutil.copy(src, dst)
    else:
        open(dst, "w").write(""); missing.append(rel)
json.dump({"_batch_wall_s": round(wall, 1), "_pages": npages, "_files": len(rels), "_loadavg_start": la0,
           "_loadavg_end": os.getloadavg()[0], "_missing": missing, "_stderr_tail": r.stderr[-600:]},
          open(os.path.join(od, "_times.json"), "w"), indent=0)
print("marker", OUT, len(rels), "files", npages, "pages", round(wall, 1), "s; missing", len(missing))
