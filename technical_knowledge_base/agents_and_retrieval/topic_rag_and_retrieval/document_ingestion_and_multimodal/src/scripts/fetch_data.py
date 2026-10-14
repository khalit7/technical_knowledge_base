"""Download the PDFs this page parses (run under the download lock).
usage: python -I fetch_data.py <papers.json> <ING_DIR>
1. QASPER papers: arXiv PDF of every version (v1..vN) into <ING_DIR>/qasper_pdf/<id>v<k>.pdf; the latest version is
   linked as <ING_DIR>/qasper_pdf/latest/<id>.pdf. Versions are found from the arXiv abs page.
2. olmOCR-bench (allenai/olmOCR-bench, revision pinned below): the test jsonl files and a seeded sample of single-page
   PDFs per category into <ING_DIR>/olmocr/.
Writes <ING_DIR>/fetch_manifest.json with sizes and sha256."""
import hashlib, json, os, random, re, sys, time, urllib.request

PAPERS, ING = sys.argv[1], sys.argv[2]
REV = "54a96a6fb6a2bd3b297e59869491db4d3625b711"  # olmOCR-bench revision read 2026-10-13
SAMPLE = {"headers_footers": 25, "multi_column": 25, "table_tests": 25, "old_scans": 25, "long_tiny_text": 10}
UA = {"User-Agent": "kb-ingestion-page/1.0 (research; single requests, 3 s apart)"}
man = {"olmocr_revision": REV, "files": {}}


def get(url, path):
    if not os.path.exists(path):
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers=UA)
                with urllib.request.urlopen(req, timeout=120) as r:
                    data = r.read()
                break
            except Exception as e:  # arXiv answers an occasional 404/429 under load: wait and retry
                print("retry", url, e, flush=True); time.sleep(10 * (attempt + 1))
        else:
            print("SKIPPED", url, flush=True); man.setdefault("skipped", []).append(url); return
        open(path, "wb").write(data)
        time.sleep(3)
    data = open(path, "rb").read()
    man["files"][os.path.relpath(path, ING)] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "url": url}


sel = json.load(open(PAPERS))["papers"]
qd = os.path.join(ING, "qasper_pdf"); os.makedirs(os.path.join(qd, "latest"), exist_ok=True)
versions = {}
for pid in sel:
    req = urllib.request.Request("https://arxiv.org/abs/" + pid, headers=UA)
    html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
    vs = sorted(set(int(v) for v in re.findall(r"/abs/" + re.escape(pid) + r"v(\d+)", html)))
    vs = vs or [1]
    versions[pid] = vs
    time.sleep(3)
    for v in vs:
        get("https://arxiv.org/pdf/%sv%d" % (pid, v), os.path.join(qd, "%sv%d.pdf" % (pid, v)))
    lk = os.path.join(qd, "latest", pid + ".pdf")
    if not os.path.exists(lk) and os.path.exists(os.path.join(qd, "%sv%d.pdf" % (pid, vs[-1]))):
        os.symlink(os.path.join("..", "%sv%d.pdf" % (pid, vs[-1])), lk)
    print(pid, vs, flush=True)
man["arxiv_versions"] = versions

od = os.path.join(ING, "olmocr"); os.makedirs(od, exist_ok=True)
base = "https://huggingface.co/datasets/allenai/olmOCR-bench/resolve/%s/bench_data/" % REV
for cat, n in SAMPLE.items():
    jp = os.path.join(od, cat + ".jsonl")
    get(base + cat + ".jsonl", jp)
    tests = [json.loads(l) for l in open(jp) if l.strip()]
    pdfs = sorted(set(t["pdf"] for t in tests))
    pick = random.Random(0).sample(pdfs, min(n, len(pdfs)))
    for p in pick:
        dst = os.path.join(od, "pdfs", p)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        get(base + "pdfs/" + p, dst)
    man.setdefault("olmocr_sample", {})[cat] = sorted(pick)
    print(cat, len(pick), "of", len(pdfs), flush=True)
json.dump(man, open(os.path.join(ING, "fetch_manifest.json"), "w"), indent=1)
