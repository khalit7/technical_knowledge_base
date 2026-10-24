"""Checks before publishing (standard library only): python3 check_data.py
1. the page embeds exactly the recorded results (22_rp_data.js against out/*.json and the root lab's out/*.json);
2. every @@fact@@ was filled, and each fact's value appears in the built page;
3. numbers this page shares with the root Pipeline lab agree with the root's recorded files;
4. numbers quoted from the root in prose are present in the root's files;
5. privacy and hygiene over the whole folder: no user path, login name, token prefix or email; no __pycache__; no file over 4 MB."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.normpath(os.path.join(HERE, ".."))
ROOT_OUT = os.path.normpath(os.path.join(HERE, "..", "..", "src", "pipe", "out"))
bad = []


def J(p):
    return json.load(open(p))


html = open(os.path.join(PAGE, "index.html"), encoding="utf-8").read()
data = open(os.path.join(HERE, "parts", "22_rp_data.js"), encoding="utf-8").read()
D = json.loads(data[len("window.RPD="):].rstrip().rstrip(";"))
# 1. embedded = recorded (the dash replacement in make_data.py is the only allowed change)
for name in ("bm25", "bm25_example", "score_ranges", "chunk_internals", "chunking_rp", "parent_child", "mmr", "router", "mixed", "late", "sparse", "qrewrite", "prompt_asm"):
    p = os.path.join(HERE, "out", name + ".json")
    if os.path.exists(p):
        rec = json.loads(json.dumps(J(p), ensure_ascii=False).replace("\u2014", "-"))
        if D.get(name) != rec:
            bad.append("embedded %s differs from out/%s.json" % (name, name))
for name, key in (("chunking.json", "root_chunking"), ("filter.json", "root_filter"), ("qtrans.json", "root_qtrans")):
    if D.get(key) != J(os.path.join(ROOT_OUT, name)):
        bad.append("embedded %s differs from the root's %s" % (key, name))
# 2. facts
F = J(os.path.join(HERE, "facts.json"))
if "@@" in html:
    bad.append("unfilled facts: %s" % sorted(set(re.findall(r"@@(\w+)@@", html))))
txt = re.sub(r"<[^>]+>", " ", html)
for k, v in F.items():
    if str(v) not in html and str(v) not in txt:
        bad.append("fact %s=%r not in the page" % (k, v))
# 3. shared with the root
FD = J(os.path.join(HERE, "out", "fusion_deep.json")); FT = J(os.path.join(ROOT_OUT, "fusion_tuned.json"))
for ds in FT:
    for m, row in FT[ds]["models"].items():
        for meth in ("rrf", "minmax", "zscore"):
            a = FD[ds]["models"][m]["methods"][meth]; b = row[meth]
            if a["best_on_tune"] != b["best_on_tune"] or a["test"]["ndcg10"] != b["test_ndcg10"]:
                bad.append("fusion %s %s %s: mine %s/%s root %s/%s" % (ds, m, meth, a["best_on_tune"], a["test"]["ndcg10"], b["best_on_tune"], b["test_ndcg10"]))
RR = J(os.path.join(ROOT_OUT, "rerank.json"))["sweep"]["hybrid"]["qwen3-reranker-0.6b"]
for K in (10, 20, 30):
    if FD["scifact"]["fuse_then_rerank"]["rrf k60|%d" % K]["after"]["ndcg10"] != RR[str(K)]["ndcg10"]:
        bad.append("fuse-then-rerank K%d differs from the root's rerank.json" % K)
CH = J(os.path.join(ROOT_OUT, "chunking.json")); PCh = J(os.path.join(HERE, "out", "parent_child.json"))["strategies"]
for mine, root in (("structure-256 (retrieve = return)", "structure-256"), ("paragraph (retrieve = return)", "paragraph")):
    for b_ in ("256", "512", "1024", "2048"):
        if PCh[mine]["budget"][b_] != CH[root]["bge-small"]["budget"][b_]:
            bad.append("parent_child %s %s differs from the root" % (mine, b_))
B = J(os.path.join(HERE, "out", "bm25.json"))
if round(B["scifact"]["default"]["test"]["ndcg10"], 3) != 0.679 or round(B["nfcorpus"]["default"]["test"]["ndcg10"], 3) != 0.318:
    bad.append("BM25 default does not reproduce the root's 0.679 / 0.318")
# 4. root numbers quoted in prose
quoted = {"607": CH["fixed-256-32"]["intact"], "832": CH["structure-256"]["intact"], "838": CH["recursive-256"]["intact"], "546": CH["fixed-256-0"]["intact"],
          "0.568": CH["fixed-256-32"]["bge-small"]["budget"]["1024"], "0.700": CH["structure-256"]["bge-small"]["budget"]["1024"],
          "0.613": CH["recursive-256"]["bm25"]["budget"]["1024"], "0.645": CH["structure-256"]["bm25"]["budget"]["1024"],
          "0.386": CH["semantic-p95"]["bm25"]["budget"]["1024"], "593": CH["sentence-256"]["intact"]}
for s, v in quoted.items():
    if ("%.3f" % v if isinstance(v, float) else str(v)) != s:
        bad.append("root number %s quoted, root file says %s" % (s, v))
FL = J(os.path.join(ROOT_OUT, "filter.json"))["groups"]["10"]["post"]["10"]
if FL["returned_mean"] != 1.73 or FL["empty"] != 14:
    bad.append("post-filter 1.73 / 14 not in the root's filter.json")
QT = J(os.path.join(ROOT_OUT, "qtrans.json"))
for m, k, v in (("qwen3-emb-0.6b", "hyde", 0.718), ("bge-small", "hyde+claim", 0.733), ("bge-small", "hyde", 0.692), ("qwen3-emb-0.6b", "multi-query", 0.699)):
    if QT[m][k]["ndcg10"] != v:
        bad.append("qtrans %s %s is %s, prose says %s" % (m, k, QT[m][k]["ndcg10"], v))
# 4b. section 9's waffle data and the hero's numbers equal the root's end-to-end run
E2 = J(os.path.join(ROOT_OUT, "e2e.json"))["agg"]
RPE = json.loads(open(os.path.join(HERE, "parts", "22_rp_e2e.js"), encoding="utf-8").read()[len("window.RPE="):].rstrip().rstrip(";"))
for c, v in RPE["conds"].items():
    for k, x in v.items():
        if E2[c][k] != x:
            bad.append("e2e %s %s: page %s, root %s" % (c, k, x, E2[c][k]))
c = E2["rr30@3"]
if (c["in_K"], c["in_k"], c["correct_strict"], E2["oracle"]["strict"], E2["closed"]["lenient"], c["lenient_without_evidence"]) != (186, 178, 96, 112, 45, 4):
    bad.append("section 9 prose numbers (186, 178, 96, 112, 45, 4) differ from the root's e2e.json")
if E2["rr10@1"]["correct_strict"] != 97 or E2["rr20@3"]["correct_strict"] != 96:
    bad.append("prompt budget numbers differ from the root's e2e.json")
# 5. privacy and hygiene
pat = re.compile(r"/Users/|Users-|khalid|glpat|sk-ant|[\w.+-]+@[\w-]+\.[\w.]+|claude-502")
for dp, dn, fn in os.walk(PAGE):
    if ".shots" in dp:
        continue
    if "__pycache__" in dn:
        bad.append("__pycache__ in " + dp)
    for f in fn:
        p = os.path.join(dp, f)
        if os.path.getsize(p) > 4_000_000:
            bad.append("file over 4 MB: " + p)
        if f.endswith((".png", ".npy")):
            continue
        t = open(p, encoding="utf-8", errors="ignore").read()
        for m in pat.finditer(t):
            if f == "check_data.py":
                continue
            bad.append("privacy: %s in %s" % (m.group(0), os.path.relpath(p, PAGE)))
print("\n".join(bad) if bad else "all checks passed", "| facts", len(F), "| page bytes", len(html.encode()))
sys.exit(1 if bad else 0)
