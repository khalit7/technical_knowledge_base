"""Checks that the page embeds exactly the recorded data and that the numbers in the prose match it.
usage: python3 check_data.py   (after build_data.py and build.sh)
1. parts/22_prd_data.js parsed back equals the data files it was made from.
2. index.html carries that data line verbatim, and no @@key@@ is left unfilled.
3. Every fact in facts.json appears in the page text, and a sample of facts is recomputed here by separate code.
4. Privacy patterns are absent from index.html and from every file under src/."""
import json
import os
import re

H = os.path.dirname(os.path.abspath(__file__))
D = lambda n, sub="data": json.load(open(os.path.join(H, sub, n)))
js = open(os.path.join(H, "parts", "22_prd_data.js")).read()
line = js.split("\n")[1]
emb = json.loads(line[len("window.PRD="):line.rindex(";")])
html = open(os.path.join(H, "..", "index.html")).read()
F = json.load(open(os.path.join(H, "facts.json")))
bad = 0


def ok(c, msg):
    global bad
    print(("ok   " if c else "FAIL ") + msg)
    bad += not c


ok(emb["cache"] == D("cache_scifact.json"), "embedded cache data equal data/cache_scifact.json")
ok(emb["backfill"] == D("backfill.json"), "embedded backfill data equal data/backfill.json")
ok(emb["monitor"] == D("monitor.json"), "embedded monitor data equal data/monitor.json")
ok(emb["prices"] == D("prices.json", "inputs"), "embedded prices equal inputs/prices.json")
ok(emb["aclcorpus"] == D("acl_corpus.json", "inputs"), "embedded constructed corpus equals inputs/acl_corpus.json")
pg = D("acl_pg.json")
ok(emb["aclpg"]["users"] == pg["users"] and emb["aclpg"]["info"] == pg["info"], "embedded pgvector results equal data/acl_pg.json")
pu = D("purge_pg.json")
ok(emb["purge"]["steps"] == pu["steps"], "embedded purge steps equal data/purge_pg.json")
ok(emb["aclctx"] == D("acl_contexts.json"), "embedded constructed-corpus retrieval equals data/acl_contexts.json")
ok(emb["pipgen"] == D("pip_gen_summary.json"), "embedded generator records equal data/pip_gen_summary.json")
for name, key in (("ttft.json", "ttft"),):  # timed runs: checked when present
    p = os.path.join(H, "data", name)
    if os.path.exists(p):
        ok(emb.get(key) == D(name), "embedded %s equals data/%s" % (key, name))
    else:
        print("note data/%s not recorded yet (bench lock); the page says so" % name)
if os.path.exists(os.path.join(H, "data", "e2e_latency.json")):
    ok(emb["e2e"]["summary"] == D("e2e_latency.json")["summary"], "embedded end-to-end summary equals data/e2e_latency.json")
if os.path.exists(os.path.join(H, "data", "acl_llm.json")):
    g = D("acl_llm.json")
    ok(all(emb["aclllm"]["models"][m]["rows"][i]["text"] == g["models"][m]["rows"][i]["text"] for m in g["models"] for i in range(len(g["models"][m]["rows"]))), "embedded model answers equal data/acl_llm.json")
PG = D("pip_gen_summary.json")
r = [b for b in PG["rows"] if b["tokens"][0] <= 1720 < b["tokens"][1]][0]
ok(F["tt_k5"] == "{:,}".format(round(1000 * 1720 / r["prefill_tps_p50"])), "derived time to first token for 5 abstracts")
ok(emb["f"] == F, "embedded facts equal facts.json")
ok(line in html, "index.html carries 22_prd_data.js verbatim")
ok("@@" not in html.replace(line, ""), "no unfilled @@key@@ in index.html")
text = re.sub(r"<[^>]+>", " ", html.replace(line, ""))
missing = [k for k, v in F.items() if v not in text]
ok(not missing, "every fact value appears in the page text (%d facts)" % len(F) + (": missing " + ", ".join(missing) if missing else ""))

# independent recomputation of a sample of facts
C = D("cache_scifact.json")["models"]["qwen3-emb-0.6b"]
r95 = [r for r in C["answer_cache"] if abs(r["t"] - 0.95) < 1e-9][0]
ok(F["c_oppshare_95"] == str(round(100 * r95["opposite"] / r95["hits"])), "opposite share of hits at 0.95")
ok(F["c_opp_med"] == "%.3f" % C["pairs"]["opposite_sim_pct"][2], "median similarity of opposite pairs")
U = pg["users"]
ok(F["leakq_hr"] == "%.2f" % (U["hr"]["modes"]["unfiltered"]["leaked_rows"] / 300), "hr user's forbidden rows per claim")
ok(F["prep_empty_hr"] == str(U["hr"]["modes"]["rls_prepared"]["queries_empty"]), "empty results with the reused plan")
ok(sum(U[u]["modes"][m]["leaked_rows"] for u in U for m in U[u]["modes"] if m.startswith("rls")) == 0 and F["rls_leaks"] == "0", "row-level security let no forbidden row through")
ok(abs(sum(1 for _ in U) - 5) == 0 and abs(U["hr"]["share"] - 110 / 5183) < 1e-3, "hr share is 110 of 5,183")
B = {r["f"]: r for r in D("backfill.json")["rows"]}
ok(F["bf_half_new"] == "%.3f" % B[0.5]["ndcg_new_query"], "backfill halfway nDCG")
st = pu["steps"]
ok(st[2]["heap_marker"] > 0 and st[3]["heap_marker"] == 0 and st[3]["wal_marker"] > 0, "purge: present after VACUUM, gone after VACUUM FULL, still in WAL")
# cost: recompute the default total without cost_model.py
d = emb["costdef"]
rer = (d["q_tok"] * d["K"] + d["K"] * d["chunk_tok"]) * d["p_rerank"] / 1e6
gen = ((d["k"] * d["chunk_tok"] + d["q_tok"]) * d["p_in"] + d["sys_tok"] * d["p_cached"] + d["out_tok"] * d["p_out"]) / 1e6
tot = d["q_tok"] * d["p_embed"] / 1e6 + rer + gen + d["n_chunks"] * d["chunk_tok"] * d["churn"] * d["p_embed"] / 1e6 / d["queries_month"] + d["n_chunks"] * d["dims"] * 4 / 1e9 * d["p_gb_month"] / d["queries_month"]
ok(F["co_total"] == ("$%.4f" % tot if tot >= 0.001 else "$%.5f" % tot), "cost per query at the defaults")
ok(F["co_month"] == "$" + "{:,}".format(round(tot * d["queries_month"])), "cost per month at the defaults")
if "aclllm" in emb:
    for m, k in (("qwen3-1.7b", "17"), ("qwen3-4b", "4")):
        rows = emb["aclllm"]["models"][m]["rows"]
        mk = {q: it["marker"] for it in D("acl_corpus.json", "inputs")["questions"] for q in it["q"]}
        n = sum(1 for r in rows if r["cond"] == "prompt_rule" and any(x.lower() in r["text"].lower() and x.lower() not in r["q"].lower() for x in mk[r["q"]]))
        ok(F["pl_" + k] == str(n), "prompt-rule leaks " + m)
# privacy
priv = ["/Us" + "ers/", "Us" + "ers-", "glp" + "at", "sk-" + "ant", "/private/" + "tmp", "claude-" + "502"] + ([os.environ["USER"]] if os.environ.get("USER") else [])
files = [os.path.join(H, "..", "index.html")] + [os.path.join(dp, f) for dp, _, fs in os.walk(H) for f in fs]
leaks = [(f, k) for f in files for k in priv if k in open(f, errors="ignore").read()]
ok(not leaks, "privacy: no private pattern in index.html or src/" + (" " + str(leaks[:3]) if leaks else ""))
mails = [f for f in files if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}", open(f, errors="ignore").read())]
ok(not mails, "privacy: no e-mail address" + (" " + str(mails[:3]) if mails else ""))
print("FAIL" if bad else "OK", bad)
raise SystemExit(1 if bad else 0)
