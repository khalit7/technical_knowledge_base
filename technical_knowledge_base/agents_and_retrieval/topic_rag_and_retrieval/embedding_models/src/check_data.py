"""Checks that the built page carries exactly the recorded data and that numbers in the prose agree with their sources.
1. parts/22_emb_data.js equals what build_data.py makes from data/ (rebuilt in memory and compared), and its main
   blocks equal the recorded files (mteb points, systems per set, prefix variants, pooling, animation, evidence).
2. Every @@key@@ in the parts has a fact; the built index.html has no unfilled @@ and no em-dash; pending keys listed.
3. Literal numbers in the prose that come from the parent or sibling pages are recomputed from their committed outputs.
4. One value recomputed independently from the shared artefacts (needs RAG_SCRATCH; skipped if unset): bge-small's
   SciFact nDCG@10 from the setup's run file, against data/choose.json.
5. Privacy: no home path, scratch path, login name, tokens or e-mail addresses anywhere in this page's folder.
usage: $RAG_SCRATCH/venv/bin/python -I -B check_data.py"""
import json
import os
import re
import subprocess
import sys

H = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(H)
ROOT = os.path.join(P, "..", "src")
bad = []


def ok(c, m):
    if not c:
        bad.append(m)
    print(("ok   " if c else "FAIL ") + m)


def D(*p):
    return json.load(open(os.path.join(*p)))


js = open(os.path.join(H, "parts", "22_emb_data.js")).read()
before = js
subprocess.run([sys.executable if os.path.basename(sys.executable).startswith("python") else "python3", os.path.join(H, "build_data.py")],
               check=True, capture_output=True, env={k: v for k, v in os.environ.items() if k not in ("EMB_DEV", "EMB_DATA_DIR")})
js = open(os.path.join(H, "parts", "22_emb_data.js")).read()
ok(js == before, "embedded data is what build_data.py makes from data/ (no dev or fake data)")
E = json.loads(js[len("window.EMB="):-2])
d = lambda n: D(H, "data", n)
ok(E["mt"]["points"] == d("mteb.json")["points"], "MTEB points = data/mteb.json")
ch = d("choose.json")
ok(all(E["ds"][s]["systems"] == ch["sets"][s]["systems"] for s in ch["sets"]), "systems per set = data/choose.json")
ok(E["pf"]["variants"] == d("prefix.json")["variants"], "prefix variants = data/prefix.json")
ok(E["pool"] == d("pooling.json")["models"], "pooling table = data/pooling.json")
ok(E["anim"] == d("anim.json"), "animation = data/anim.json")
ok(E["ln"]["evidence"] == d("long.json")["evidence"], "evidence positions = data/long.json")
ok(E["lab"] is None or not E["lab"].get("dev"), "no development lab data embedded")

F = d("..", "facts.json") if False else D(H, "facts.json")
keys = set()
for f in os.listdir(os.path.join(H, "parts")):
    if f.endswith(".html"):
        keys |= set(re.findall(r"@@(\w+)@@", open(os.path.join(H, "parts", f)).read()))
ok(not [k for k in keys if k not in F], "every @@key@@ has a fact (missing: %s)" % [k for k in keys if k not in F])
html = open(os.path.join(P, "index.html")).read()
ok("@@" not in html, "no unfilled fact in index.html")
ok("—" not in html and "&mdash;" not in html, "no em-dash in index.html")
print("pending keys:", F["_pending"])
txt = re.sub(r"<[^>]+>", " ", html)

# 3. literal numbers taken from the parent and siblings
vec = os.path.join(ROOT, "vec", "out")
met = D(vec, "metric.json")["metrics"]
ok("%.3f" % met["cosine"]["ndcg@10"] == "0.767" and "%.3f" % met["dot"]["ndcg@10"] == "0.740" and "0.767 to 0.740" in txt, "gte cosine 0.767 / dot 0.740 (parent metric.json)")
sw = {x["B"]: x["top1"] for x in D(vec, "contrastive.json")["models"]["bge-small"]["sweep"]}
ok("%.1f" % (100 * sw[8]) == "97.9" and "%.1f" % (100 * sw[512]) == "82.8" and "97.9%" in txt and "82.8%" in txt, "batch 8 / 512: 97.9% / 82.8% (parent contrastive.json)")
q = D(vec, "mrl_quant.json")
def nd(m, dim):
    return [r["ndcg10"] for r in q[m]["rows"] if r["d"] == dim and r["prec"] == "float32" and r["rescore"] is None][0]
qf, bf = q["qwen3"]["full"]["ndcg10"], q["bge"]["full"]["ndcg10"]
ok(round(100 * nd("qwen3", 512) / qf) == 98 and round(100 * nd("qwen3", 256) / qf) == 95, "Qwen3 half 98%, quarter 95% (parent mrl_quant.json)")
ok(round(100 * nd("bge", 192) / bf) == 94 and round(100 * nd("bge", 96) / bf) == 81, "bge half 94%, quarter 81% (parent mrl_quant.json)")
ok("%.3f" % nd("gte", 384) == "0.726", "gte at 384 dims 0.726 (parent mrl_quant.json)")
bin100 = [r["ndcg10"] for r in q["qwen3"]["rows"] if r["d"] == 1024 and r["prec"] == "binary" and r["rescore"] == 100][0]
ok("%.3f" % bin100 == "0.700", "binary 1,024 rescore 100 = 0.700 (parent mrl_quant.json)")
rr = D(P, "..", "rerankers_and_late_interaction", "src", "data", "train.json")["runs"]
mb = lambda v: sum(r["bm25"] for r in rr if r["variant"] == v) / 2
ok("%.3f" % mb("random") == "0.734" and "%.3f" % round(mb("hard"), 3) == "0.726", "rerankers fine-tune random 0.734 / hard 0.726 (sibling train.json)")
rp = D(P, "..", "retrieval_pipeline", "src", "out", "chunk_internals.json")["truncation"]
ok("%.1f" % (100 * rp["lc-rec-char4000"]["MiniLM-L6 (256)"]["share_of_tokens_seen"]) == "33.3" and "%.1f" % (100 * rp["lc-rec-char4000"]["bge-small (512)"]["share_of_tokens_seen"]) == "65.1"
   and "%.1f" % (100 * rp["lc-rec-tok256"]["MiniLM-L6 (256)"]["share_over"]) == "16.9" and rp["lc-rec-char4000"]["MiniLM-L6 (256)"]["median_tokens"] == 782,
   "pipeline truncation 33.3% / 65.1% / 16.9% / 782 tokens (sibling chunk_internals.json)")
mods = {r["key"]: r for r in D(vec, "models.json")["rows"]}
ok("%.1f" % mods["bge-small"]["q_ms_mps"] == "10.0" and "%.1f" % mods["qwen3-emb-0.6b"]["q_ms_mps"] == "51.3" and round(mods["bge-small"]["corpus_s"]) == 36,
   "query 10.0 / 51.3 ms, bge corpus 36 s (parent models.json)")

# 4. independent recompute
if os.environ.get("RAG_SCRATCH"):
    sys.path.insert(0, os.path.join(ROOT, "data"))
    import load as L
    gold = set(open(os.path.join(ROOT, "data", "ids", "scifact_test_qids.txt")).read().split())
    qr = {k: v for k, v in L.beir("scifact")[2]["test"].items() if k in gold}
    v = L.evaluate(L.run("scifact", "bge-small"), qr)["ndcg@10"]
    ok(abs(v - ch["sets"]["scifact"]["systems"]["bge-small"]["ndcg10"]) < 1e-4, "bge-small SciFact nDCG@10 recomputed from the run file: %.4f" % v)
else:
    print("skip recompute (RAG_SCRATCH unset)")

# 5. privacy
login = os.path.basename(os.path.expanduser("~"))
pats = ["/Users/", "Users-", "/private/tmp", "glpat", "sk-ant", "@" + "[removed]", login]
hits = []
for dp, dn, fn in os.walk(P):
    if ".shots" in dp:
        continue
    for f in fn:
        p = os.path.join(dp, f)
        try:
            t = open(p, errors="ignore").read()
        except Exception:
            continue
        for pat in pats:
            if pat in t and f != "check_data.py":
                hits.append((os.path.relpath(p, P), pat))
        if re.search(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", t) and f != "check_data.py":
            m = re.search(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", t).group(0)
            if not m.endswith((".png", ".svg")):
                hits.append((os.path.relpath(p, P), "email-like " + m))
ok(not hits, "privacy grep over the page folder %s" % hits[:6])
pyc = [dp for dp, dn, fn in os.walk(P) if "__pycache__" in dp]
ok(not pyc, "no __pycache__")
big = [(f, os.path.getsize(os.path.join(dp, f))) for dp, dn, fn in os.walk(P) for f in fn if os.path.getsize(os.path.join(dp, f)) > 4e6]
ok(not big, "no file over 4 MB %s" % big)
print("FAIL" if bad else "ALL OK", len(bad))
sys.exit(1 if bad else 0)
