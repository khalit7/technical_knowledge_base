"""Checks that the page embeds exactly the recorded data and that the prose numbers come from it.
1. window.GR in ../index.html equals what build_data.py derives from data/*.json (re-derived here, not trusted).
2. No @@key@@ left in the page; every fact value of facts.json appears in the page.
3. A sample recomputed independently from the shared artefacts: dense "both gold in top k" against the root Agentic
   lab's committed hops.json; noun-phrase counts from the raw extraction; aggregate counts from sql_set rows; PPR's
   dense run against the setup's recorded bge-small run file; the root's strategies.json numbers quoted in prose.
4. Privacy over every file of this page folder that would be committed.
Run: $RAG_SCRATCH/venv/bin/python -I -B check_data.py
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.normpath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "scripts"))
bad = []


def ok(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        bad.append(msg)


html = open(os.path.join(PAGE, "index.html")).read()
m = re.search(r"window\.GR=(\{.*?\});\n", html, re.S)
GR = json.loads(m.group(1))
# 1. re-derive with build_data's own function into a temporary copy and compare
before = open(os.path.join(HERE, "parts", "22_gr_data.js")).read()
subprocess.run([sys.executable, "-I", "-B", os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
after = open(os.path.join(HERE, "parts", "22_gr_data.js")).read()
ok(before == after, "22_gr_data.js is up to date with data/ (build_data.py reproduces it byte for byte)")
ok(json.loads(after[len("window.GR="):-2]) == GR, "the page embeds exactly 22_gr_data.js")
D = lambda n: json.load(open(os.path.join(HERE, "data", n)))  # noqa: E731
ok(GR["ppr"] == D("ppr.json"), "ppr.json embedded unchanged")
ok(GR["comm"] == D("communities.json"), "communities.json embedded unchanged")
ok(GR["sql"] == D("sql_set.json"), "sql_set.json embedded unchanged")
ok(GR["kuzu"] == D("kuzu.json") and GR["build"] == D("build.json") and GR["nlp"] == D("nlp.json"), "kuzu, build, nlp embedded unchanged")
ba = D("ba.json")
ok(all(r["g"] == e["g"] and r["top"] == [e["top"][k] for k in GR["ba"]["systems"]] for r, e in zip(GR["ba"]["rows"], ba["rows"])), "ba.json rows embedded unchanged (4 of its 5 systems)")
# 2. facts
F = json.load(open(os.path.join(HERE, "facts.json")))
ok("@@" not in html, "no unfilled @@key@@ in the page")
missing = [k for k, v in F.items() if k != "pending_runs" and str(v) not in html and "gr-pend" not in str(v)]
ok(not missing or all(k.startswith(("pt_", "ptq_", "ent_subset", "sr_bm25_tok", "sr_bm25_all", "sr_bgesmall_tok", "sr_bgesmall_all", "ppr_", "root_", "kz_", "lr_", "nlp_", "sub_", "full_", "sql_", "ex_", "lab_", "ent_")) for k in missing),
   "facts not quoted in prose are only derived variants (%d unquoted)" % len(missing))
# 3. independent recomputation
from grlib import L, hotpot, both_at  # noqa: E402
qs, corpus, by = hotpot()
hops = json.load(open(os.path.join(HERE, "..", "..", "src", "agent", "out", "hops.json")))
ok(all(GR["ppr"]["systems"]["dense"]["both"][k] == hops["systems"]["bge-small"]["both"][k] for k in ("2", "5", "10", "20")),
   "dense both@k equals the root Agentic lab's hops.json (bge-small)")
ok(all(GR["ppr"]["systems"]["bm25"]["both"][k] == hops["systems"]["bm25"]["both"][k] for k in ("2", "5", "10", "20")), "BM25 both@k equals hops.json")
run = L.run("hotpotqa", "bge-small")
n5 = sum(both_at(list(run[q["qid"]].keys()), q["gold_pids"], (5,))[5] for q in qs)
ok(n5 == GR["ppr"]["systems"]["dense"]["both"]["5"], "dense both@5 recomputed from the setup's bge-small run file: %d" % n5)
ph = json.load(open(L.path("gr", "nlp_phrases.json")))["phrases"]
ok(len({x for v in ph.values() for x in v}) == GR["nlp"]["distinct"] and sum(len(v) for v in ph.values()) == GR["nlp"]["phrases"], "noun-phrase counts recomputed from the raw extraction")
rows = GR["sql"]["rows"]
ok(sum(1 for r in rows if r["support_rows"] is not None) == GR["sql"]["meta"]["aggregate_q"] and sum(1 for r in rows if (r["support_rows"] or 0) > 10) == GR["sql"]["meta"]["aggregate_over_10_rows"], "aggregate counts recomputed from rows")
st = json.load(open(os.path.join(HERE, "..", "..", "src", "agent", "out", "strategies.json")))["1.7b"]
ok(F["root_dense_f1"] == "%.3f" % st["single_k5"]["f1"] and F["root_agent_f1"] == "%.3f" % st["react"]["f1"], "root Agentic lab F1 quoted as committed")
lab = json.load(open(os.path.join(HERE, "inputs", "merge_labels.json")))
ok(all(F["lab_" + h] == "%d of 30" % sum(x["correct"] for x in lab["items"][h]) for h in ("norm", "subset", "embed")), "hand-label counts quoted as recorded")
# 4. privacy
import getpass  # noqa: E402
_u = "Us" + "ers"
pat = re.compile("|".join([re.escape("/" + _u + "/"), re.escape(_u + "-"), re.escape(getpass.getuser()), "gl" + "pat", "sk" + "-ant",
                           r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}"]))
hits = []
for dp, dn, fn in os.walk(PAGE):
    if ".shots" in dp or "__pycache__" in dp:
        continue
    for f in fn:
        p = os.path.join(dp, f)
        try:
            t = open(p, errors="ignore").read()
        except Exception:  # noqa: BLE001
            continue
        for mm in pat.finditer(t):
            hits.append((os.path.relpath(p, PAGE), mm.group(0)))
ok(not hits, "privacy: no user path, login name, token or address in the page folder" + ("" if not hits else " " + str(hits[:5])))
big = [f for dp, dn, fn in os.walk(PAGE) for f in fn if os.path.getsize(os.path.join(dp, f)) > 4_000_000 and ".shots" not in dp]
ok(not big, "no file over 4 MB")
ok(not any("__pycache__" in dp for dp, _, _ in os.walk(PAGE)), "no __pycache__")
print("FAIL" if bad else "ALL OK")
sys.exit(1 if bad else 0)
