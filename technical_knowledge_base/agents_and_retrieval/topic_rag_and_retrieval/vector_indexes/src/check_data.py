"""Checks that the page embeds exactly the recorded data and that the numbers in the prose match it.
usage: python3 check_data.py   (after build_data.py and build.sh)
1. parts/22_vix_data.js parsed back equals data/results.json, data/hnsw_anim.json and data/ivfpq_anim.json.
2. index.html carries that data line verbatim, and no @@key@@ is left unfilled.
3. Every fact in facts.json appears in index.html, and a set of facts is recomputed here by separate code."""
import json
import os
import re

H = os.path.dirname(os.path.abspath(__file__))
D = lambda n: json.load(open(os.path.join(H, "data", n)))
js = open(os.path.join(H, "parts", "22_vix_data.js")).read()
line = js.split("\n")[1]
emb = json.loads(line[len("window.VIX="):line.rindex(";")])
html = open(os.path.join(H, "..", "index.html")).read()
F = json.load(open(os.path.join(H, "facts.json")))
bad = 0


def ok(c, msg):
    global bad
    print(("ok   " if c else "FAIL ") + msg)
    bad += not c


ok(emb["r"] == D("results.json"), "embedded results equal data/results.json")
h = dict(emb["hnsw"]); h.pop("check", None)
ok(h == D("hnsw_anim.json"), "embedded HNSW lab data equal data/hnsw_anim.json")
ok(emb["pq"] == D("ivfpq_anim.json"), "embedded IVF-PQ lab data equal data/ivfpq_anim.json")
ok(emb["f"] == F, "embedded facts equal facts.json")
ok(line in html, "index.html carries 22_vix_data.js verbatim")
ok("@@" not in html.replace(line, ""), "no unfilled @@key@@ in index.html")
text = re.sub(r"<[^>]+>", " ", html.replace(line, ""))
missing = [k for k, v in F.items() if v not in text]
ok(not missing, "every fact value appears in the page text (%d facts)" % len(F) + (": missing " + ", ".join(missing) if missing else ""))

# independent recomputation of a sample of facts
R = D("results.json")
q = {r["name"]: r["recall10"] for r in R["quant"]["scifact"]["rows"]}
ok(F["pq16_rec"] == "%.3f" % q["PQ m=16"], "PQ m=16 recall")
ok(F["rabitq_rs_rec"] == "%.3f" % q["RaBitQ + rescore x10"], "RaBitQ rescored recall")
c = R["ivf"]["cell_rank_of_true_neighbours"]
ok(F["ivf_rank1_pct"] == str(round(100 * c["hist"]["1"] / c["total"])), "share of true neighbours in the nearest cell")
own = {(r["strategy"], r["setting"]): r for r in R["filter"]["qasper"]["own"]}
ok(F["post_own_rec"] == "%.2f" % own[("post-filter", "k'=100")]["recall10"], "post-filter own-paper recall")
ok(F["pre_own_ndis"] == str(round(own[("pre-filter + exact", "")]["ndis"])), "pre-filter work, own paper")
pc = R["port_check"]
ok(pc["identical_order"] <= pc["lists"] and all(s["queries_identical_top10"] == s["queries"] for s in pc["search"]), "port reproduces hnswlib's top 10 on every query")
v = R["variants"]["all4"]["variants"]
g = lambda k: [r for r in v[k]["rows"] if r["ef"] == 40][0]["recall10"]
ok(F["var_simple_gap"] == str(round(100 * (g("hnsw") - g("simple")))), "heuristic vs closest-M gap")
qs = [r for r in R["bench"]["quora"]["exact_scaling"] if r["n"] == 522931][0]
ok(F["exact_quora_ms"] == str(round(sorted(qs["ms_per_query_passes"])[1])), "Quora exact search ms")
ok(all(r["load"] for b in R["bench"].values() for r in b["rows"]), "every timed row records its load average")
priv = ["/Us" + "ers/", "Us" + "ers-", "glp" + "at", "sk-" + "ant", "/private/" + "tmp"] + ([os.environ["USER"]] if os.environ.get("USER") else [])
for k in priv:
    ok(k not in html, "privacy: a private pattern is absent from index.html")
ok(not re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]{2,}", html), "privacy: no e-mail address in index.html")
print("FAIL" if bad else "OK", bad)
raise SystemExit(1 if bad else 0)
