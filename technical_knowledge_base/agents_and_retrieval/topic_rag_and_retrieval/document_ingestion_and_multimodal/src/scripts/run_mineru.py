"""Run MinerU 4.0.12 locally (mineru-kit parse, never --remote) over every PDF of a folder tree at one tier, in one
batch, with the small models on the ONNX backend (CPU; MINERU_MODEL_SMALL_BACKEND=onnx), so nothing runs on the GPU.
usage: python -I run_mineru.py <ING_DIR> <pdf_dir> <out_dir> <tier: flash|basic>
PDFs are linked flat into a temporary folder (path separators become "__"); the Markdown goes to
<out_dir>/mineru_<tier>/<relative path>.md with embedded images (data: URIs) replaced by "<!-- image -->".
_times.json holds the batch wall time and the number of pages (seconds per page = time / pages; indicative)."""
import json, os, re, subprocess, sys, time
import pymupdf

I, PDF_DIR, OUT, TIER = sys.argv[1:5]
os.chdir(I)
od = os.path.join(OUT, "mineru_" + TIER); os.makedirs(od, exist_ok=True)
flat = os.path.join(I, "mineru_in", OUT); res = os.path.join(I, "mineru_res", OUT, TIER)
os.makedirs(flat, exist_ok=True); os.makedirs(res, exist_ok=True)
rels, npages = {}, 0
for root, _, fs in os.walk(PDF_DIR, followlinks=True):
    for f in sorted(fs):
        if f.endswith(".pdf"):
            rel = os.path.relpath(os.path.join(root, f), PDF_DIR)
            key = rel.replace("/", "__"); rels[key[:-4]] = rel
            dst = os.path.join(flat, key)
            if not os.path.exists(dst):
                os.symlink(os.path.realpath(os.path.join(PDF_DIR, rel)), dst)
            with pymupdf.open(dst) as d:
                npages += len(d)
t0 = time.time(); la0 = os.getloadavg()[0]
r = subprocess.run([os.path.join(I, "muenv", "bin", "mineru-kit"), "parse", flat, "-o", res, "--tier", TIER],
                   capture_output=True, text=True, env=dict(os.environ, MINERU_MODEL_SMALL_BACKEND="onnx"))
wall = time.time() - t0
missing = []
for stem, rel in rels.items():
    src = os.path.join(res, stem + ".md")
    dst = os.path.join(od, rel[:-4] + ".md"); os.makedirs(os.path.dirname(dst), exist_ok=True)
    t = open(src).read() if os.path.exists(src) else ""
    if not t:
        missing.append(rel)
    open(dst, "w").write(re.sub(r"!\[[^\]]*\]\(data:[^)]*\)", "<!-- image -->", t))
json.dump({"_batch_wall_s": round(wall, 1), "_pages": npages, "_files": len(rels), "_loadavg_start": la0,
           "_loadavg_end": os.getloadavg()[0], "_missing": missing, "_stderr_tail": r.stderr[-600:]},
          open(os.path.join(od, "_times.json"), "w"), indent=0)
print("mineru", TIER, OUT, len(rels), "files", npages, "pages", round(wall, 1), "s; missing", len(missing))
