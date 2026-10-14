"""Checks for the Vector search lab: (1) the built page embeds exactly the data make_data.py writes from out/*.json;
(2) numbers written by hand in the tab's HTML parts match the recorded results; (3) privacy and em-dashes.
usage: python3 check_numbers.py   (from anywhere; reads ../../index.html and ../parts/32_*)"""
import glob
import json
import os
import re
import sys

H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, "..", "..", "index.html"), encoding="utf-8").read()
part = open(os.path.join(H, "..", "parts", "32_js_vec_0data.js"), encoding="utf-8").read()
o = lambda n: json.load(open(os.path.join(H, "out", n)))
bad = 0

m = re.search(r"window\.VECD=(\{.*?\});\n", page, re.S)
emb = json.loads(m.group(1))
gen = json.loads(re.search(r"window\.VECD=(\{.*?\});\n", part, re.S).group(1))
print("page embeds the generated data:", emb == gen); bad += emb != gen
# the generated data equal the recorded results (spot fields)
mq, tr, mo, con, pr, fr = o("mrl_quant.json"), o("two_recalls.json"), o("models.json"), o("contrastive.json"), o("proj.json"), o("frontier.json")
same = (emb["mq"]["qwen3"]["rows"] == mq["qwen3"]["rows"] and emb["models"]["rows"] == mo["rows"] and
        emb["con"]["models"] == con["models"] and emb["front"]["best"] == fr["best"] and
        [r["ann_recall10"] for r in emb["tr"]["rows"]] == [r["ann_recall10"] for r in tr["rows"]] and
        emb["proj"]["claims"] == pr["claims"])
print("embedded data equal out/*.json:", same); bad += not same

html = " ".join(open(f, encoding="utf-8").read() for f in sorted(glob.glob(os.path.join(H, "..", "parts", "32_tab_vec_*.html"))))
txt = re.sub(r"<[^>]+>", " ", html)
txt = re.sub(r"\s+", " ", txt)
Q = mq["qwen3"]; row = lambda d, p, r=None: next(x for x in Q["rows"] if x["d"] == d and x["prec"] == p and x["rescore"] == r)
at = lambda k, d: next(x for x in mq[k]["rows"] if x["d"] == d and x["prec"] == "float32")
ex = tr["rows"][0]; n8 = next(r for r in tr["rows"] if r["label"] == "IVF72 nprobe 8")
res = json.load(open(os.path.join(H, "..", "..", "vector_indexes", "src", "facts.json")))
pct = lambda x: "%d%%" % round(100 * x)
checks = [
    ("0.700 (full nDCG, prose)", "%.3f" % Q["full"]["ndcg10"], "0.700"),
    ("84.5% exact retrieval recall@10", "%.1f%%" % (100 * ex["recall10"]), "84.5%"),
    ("IVF nprobe 8 returns 90%", pct(n8["ann_recall10"]), "90%"),
    ("about 78% retrieval at nprobe 8", pct(n8["recall10"]), "78%"),
    ("gte 0.767 vs Qwen3 0.700", "%.3f %.3f" % (mo["rows"][2]["scifact_ndcg10"], mo["rows"][3]["scifact_ndcg10"]), "0.767 0.700"),
    ("NFCorpus Qwen3 0.363 vs gte 0.343", "%.3f %.3f" % (mo["rows"][3]["nfcorpus_ndcg10"], mo["rows"][2]["nfcorpus_ndcg10"]), "0.363 0.343"),
    ("6.4 against 144 docs/s", "%.1f %d" % (sorted(mo["rows"][3]["docs_per_s"])[1], round(sorted(mo["rows"][1]["docs_per_s"])[1])), "6.4 144"),
    ("bge half loses 6%", pct(1 - at("bge", 192)["ndcg10"] / mq["bge"]["full"]["ndcg10"]), "6%"),
    ("bge quarter loses 19%", pct(1 - at("bge", 96)["ndcg10"] / mq["bge"]["full"]["ndcg10"]), "19%"),
    ("Qwen3 half loses 2%", pct(1 - at("qwen3", 512)["ndcg10"] / Q["full"]["ndcg10"]), "2%"),
    ("Qwen3 quarter loses 5%", pct(1 - at("qwen3", 256)["ndcg10"] / Q["full"]["ndcg10"]), "5%"),
    ("binary alone keeps 67% of top 10", pct(row(1024, "binary")["agree10"]), "67%"),
    ("binary alone nDCG 0.680", "%.3f" % row(1024, "binary")["ndcg10"], "0.680"),
    ("binary rescore 100 brings back 99%", pct(row(1024, "binary", 100)["agree10"]), "99%"),
    ("PCA keeps 10.5%", "%.1f%%" % (100 * pr["pca_var2"]), "10.5%"),
    ("PCA keeps 0 to 3 neighbours", "%d to %d" % (min(c["kept_pca"] for c in pr["claims"]), max(c["kept_pca"] for c in pr["claims"])), "0 to 3"),
    ("hard negative beats positive for about 39%", pct(con["models"]["bge-small"]["hard_beats_pos"]), "39%"),
    ("exact scan 37 GB/s", res["exact_gbps"], "37"), ("Quora 22 ms", res["exact_quora_ms"], "22"),
    ("1M x 1024 112 ms", res["exact_1m1024_ms"], "112"),
    ("41 GB for 10 M x 4,096 B", "%d GB" % round(1e7 * 4096 / 1e9), "41 GB"),
    ("410 GB for 100 M", "%d GB" % round(1e8 * 4096 / 1e9), "410 GB"),
]
for what, got, want in checks:
    ok = got == want
    bad += not ok
    print(("ok  " if ok else "BAD ") + what + ": recorded " + got + ", prose " + want)
for s in ("84.5%", "10.5%", "0.767", "41 GB", "410 GB", "0.680"):
    if s not in txt:
        print("BAD prose lacks", s); bad += 1
# privacy and em-dashes in everything this tab owns
own = glob.glob(os.path.join(H, "..", "parts", "32_*")) + glob.glob(os.path.join(H, "*.py")) + glob.glob(os.path.join(H, "*.md")) + glob.glob(os.path.join(H, "*.mjs")) + glob.glob(os.path.join(H, "out", "*.json"))
for f in own:
    if os.path.basename(f) == "check_numbers.py":
        continue
    s = open(f, encoding="utf-8").read()
    for pat in ("/Users/", "Users-", "khalid", "glpat", "sk-ant", "/private/tmp", chr(0x2014)):
        if pat in s:
            print("BAD", os.path.basename(f), "contains", repr(pat)); bad += 1
print("FAIL" if bad else "all checks pass", bad)
sys.exit(1 if bad else 0)
