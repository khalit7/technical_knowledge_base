"""Check that the page embeds exactly the data parse.py builds from src/trace/raw, and that nothing private leaks.

1. Rebuild the data from raw/ in memory and compare it with window.TRDATA inside ../../../index.html.
2. Confirm the dictionary covers every system call name that appears in the embedded events.
3. Grep raw/, data/ and the page's trace parts for home paths, tokens and the private patterns.
Usage: python3 check_embed.py   (exit 0 when all pass)
"""
import gzip, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import parse as P, parse_jobs  # noqa: E402
import redact  # noqa: E402

TR = os.path.dirname(HERE); PAGE = os.path.join(TR, "..", "..", "index.html")
ok = True
html = open(PAGE, encoding="utf-8").read()
m = re.search(r"window\.TRDATA=(\{.*?\});\n", html, re.S)
emb = json.loads(m.group(1)) if m else None
fresh = {"env": P.env(), "import_torch_ms": P.floats("import_torch_ms.txt"), "first_optimizer_ms": P.floats("first_optimizer_ms.txt"),
         "first_batch": P.first_batch(), "epochs": P.epochs(), "hugepage_stack": P.hugepage_stack(),
         "job_untraced": P.readlines("timing_job_untraced.txt"),
         "job_logs": {k: P.readlines(f"job_{k}.log")[-1] for k in ("fork", "spawn", "forkserver")},
         "importtime": P.importtime(), "writes": P.writes(), "ckpt": P.ckpt(), "lang": P.lang(), "startup": P.startup(),
         "runs": parse_jobs.runs(P.rp)}
fresh = json.loads(json.dumps(fresh))
if emb != fresh:
    ok = False
    print("MISMATCH: embedded data differs from raw/ (run scripts/parse.py, then build.sh)",
          [k for k in fresh if emb is None or emb.get(k) != fresh.get(k)])
else:
    print("embedded data == rebuilt from raw/:", len(json.dumps(fresh)), "bytes")
dic = open(os.path.join(TR, "..", "parts", "32_js_tr_1dict.js"), encoding="utf-8").read()
names = {n for r in fresh["runs"].values() for n in r["names"]} - {"SIGNAL", "EXIT", "IMPORT"}
missing = sorted(n for n in names if not re.search(r"\b" + n + r":\[", dic))
print("dictionary missing:", missing or "none")
if missing:
    ok = False
bad = re.compile(r"/Users/|/home/|glpat|sk-ant|" + redact.PRIV)
for root in (os.path.join(TR, "raw"), os.path.join(TR, "data"), os.path.join(TR, "..", "parts")):
    for f in sorted(os.listdir(root)):
        p = os.path.join(root, f)
        if root.endswith("parts") and not f.startswith("32_"):
            continue
        t = gzip.open(p, "rt", errors="replace").read() if f.endswith(".gz") else open(p, errors="replace").read()
        hits = bad.findall(t)
        if hits:
            ok = False; print("PRIVATE?", p, hits[:3])
print("privacy grep:", "clean" if ok else "see above")
sys.exit(0 if ok else 1)
