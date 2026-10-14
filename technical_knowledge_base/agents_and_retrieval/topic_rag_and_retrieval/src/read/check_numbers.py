"""Checks for the Reading and Further reading tabs.

1. The page embeds exactly the data make_data.py recorded (parts/22_js_rd_data.js == rd_data.json, and the same
   object inside ../index.html).
2. Key prose numbers equal the recorded data (a list of (text in the page, value from a source file)).
3. Provenance: every number in the Reading tab's prose is found in a source (the other tabs' and children's
   recorded results, the running example's README, the shared FACTS notes, the Agentic lab's published-number notes,
   the paper pages' tables) or is on the short list of arithmetic and illustrative inputs below. Prints the rest.
4. Privacy and hygiene: no home path, user name, scratch path, tokens or em dashes in this folder's files or the page.
usage: RAG_SCRATCH=<shared rag folder> python3 check_numbers.py
"""
import glob, json, os, re, sys, html

HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE); ROOT = os.path.dirname(SRC)
KB = os.path.dirname(os.path.dirname(ROOT))
page = open(os.path.join(ROOT, "index.html")).read()
bad = []

# 1. embedded data
rec = json.load(open(os.path.join(HERE, "rd_data.json")))
js = open(os.path.join(SRC, "parts/22_js_rd_data.js")).read()
emb = json.loads(re.search(r"window\.RD_DATA=(\{.*\});", js).group(1))
if emb != rec: bad.append("22_js_rd_data.js differs from rd_data.json")
inpage = json.loads(re.search(r"window\.RD_DATA=(\{.*?\});\n", page).group(1))
if inpage != rec: bad.append("index.html embeds different RD_DATA")

# Reading tab text
a, b = page.find('<div class="tab" id="t-read"'), page.find('<div class="tab" id="t-pipe"')
read = page[a:b]
read_txt = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<style>.*?</style>", "", read, flags=re.S)))
read_txt = re.sub(r"\s+", " ", read_txt)

# 2. key prose numbers against the data
F = rec["fates"]; on = F["agg_on"]; off = F["agg_off"]; H = rec["hybrid"]; R = rec["rerank"]; L = rec["latency"]
fmt = lambda x: f"{x:,.0f}"
key = [
    (f"{on['in_K']} / {F['n']} = {on['r_K']:.3f}", True), (f"{on['in_k']} / {on['in_K']} = {on['p_k_given_K']:.3f}", True),
    (f"{on['correct_strict']} / {on['in_k']} = {on['g']:.3f}", True), (f"= {on['A']:.3f} = {on['correct_strict']} / {F['n']}", True),
    (f"get {F['oracle']} of 188", True), (f"right on {F['closed_label']} of 188", True),
    (f"Every one of the {F['contra_in_prompt']} CONTRADICT claims that reached the prompt", True),
    (f"BM25 0.679, Qwen3-Embedding 0.700, the two fused {R['first']:.3f}", True),
    (f"MiniLM {H['rows'][0]['alone']:.3f} to {H['rows'][0]['rrf']:.3f}, Qwen3-Embedding {H['rows'][2]['alone']:.3f} to {H['rows'][2]['rrf']:.3f}", True),
    (f"gte-modernbert {H['rows'][4]['alone']:.3f} to {H['rows'][4]['rrf']:.3f}, ColBERT-small {H['rows'][3]['alone']:.3f} to {H['rows'][3]['rrf']:.3f}", True),
    (f"from {R['first']:.3f} to {R['rows'][2]['k20']:.3f} at K 20; bge-reranker-v2-m3 reaches {R['rows'][1]['k20']:.3f}", True),
    (f"({R['rows'][0]['k30']:.3f} at K 30, {R['rows'][0]['k100']:.3f} at K 100)", True),
    (f"{rec['metric']['cos']:.3f} by cosine, {rec['metric']['l2']:.3f} by L2 and {rec['metric']['dot']:.3f} by dot product", True),
    (f"leaves {rec['filter10']['post_returned']} on average and nothing at all for {rec['filter10']['post_empty']} of 300", True),
    (f"(61.4% of questions found against 45.3%)", round(rec['chunk']['fixed512_top3'] * 100, 1) == 61.4 and round(rec['chunk']['struct256_top3'] * 100, 1) == 45.3),
    (f"45.9% against 64.5%", round(rec['chunk']['fixed512_b1024'] * 100, 1) == 45.9 and round(rec['chunk']['struct256_b1024'] * 100, 1) == 64.5),
    (f"puts at least one of the two gold paragraphs in the top 10 for {rec['hops']['bge-small']['any']['10']} questions, but both for {rec['hops']['bge-small']['both']['10']}", True),
    (f"for the 160 bridge questions, {rec['hops']['bge-small']['bridge']['10']}; for the 40 comparison questions, all {rec['hops']['bge-small']['comparison']['10']}", True),
    (f"BM25: {rec['hops']['bm25']['both']['10']} of 200 with both", True),
]
# section 7: the Agentic lab's 4B rows, position curve and small GraphRAG, against src/agent/out
S = json.load(open(os.path.join(SRC, "agent/out/strategies.json")))["4b"]
P4 = json.load(open(os.path.join(SRC, "agent/out/position.json")))["4b"]
G = json.load(open(os.path.join(SRC, "agent/out/graphrag.json")))
ST = json.load(open(os.path.join(SRC, "agent/out/steps.json")))["4b"]["by_n_calls"]
row = lambda k, name: f"{name} {S[k]['f1']:.3f}"
for k, nm in [("closed", "No retrieval (closed book)"), ("single_k5", "Single search, top 5 into the prompt"), ("react", "Agent loop (ReAct, search as a tool)"),
              ("decomp", "Fixed decomposition into sub-questions"), ("longctx", "Long context: the question's own 10 paragraphs"),
              ("longctx_tokens8000", "Long context: an 8,000-token window")]:
    key.append((row(k, nm), True)); key.append((f"{S[k]['wall_mean']:.2f}", True))
vs = S["react"]["vs_single"]
key += [(f"by {vs['diff']:.3f} F1 (paired over the same questions, 95% interval {vs['ci'][0]:.3f} to {vs['ci'][1]:.3f}; better on {vs['wins']}, worse on {vs['losses']})", True),
        (f"{round(S['react']['tok_in']):,} {round(S['react']['tok_in_new']):,} newly computed", True), (f"{S['react']['searches']:.2f}", True),
        (f"bills {round(ST['2']['tok_in']):,} input tokens, one that uses all five {round(ST['5']['tok_in']):,}", True),
        (f"{ST['5']['n']} questions used all four searches and score F1 {ST['5']['f1']:.2f}, against {ST['3']['f1']:.3f} for the {ST['3']['n']}", True),
        ("F1 " + f"{P4['f1'][0]:.3f} with them first, {P4['f1'][1]:.3f} at positions 5 and 6, {P4['f1'][2]:.3f} at 10 and 11, then {P4['f1'][3]:.3f} and {P4['f1'][4]:.3f}", True),
        (f"from {G['index']['paragraphs']} HotpotQA paragraphs ({G['index']['corpus_tokens']:,} tokens of text): {G['index']['tok_in'] + G['index']['tok_out']:,} generator tokens", True),
        (f"top 3 for {G['local']['graph']['3']} of the first {G['local']['n_q']} test questions against {G['local']['dense']['3']}", G['local']['graph']['2'] == G['local']['dense']['2'] and G['local']['graph']['5'] == G['local']['dense']['5']),
        (f"cost {G['global'][0]['graph']['calls']} model calls", True)]
for s, ok in key:
    if s not in read_txt or not ok: bad.append("prose/data mismatch: " + s)
# latency numbers appear in the note strings built by JS; check the inputs instead
assert abs(L["isolated"]["embed"] - 49.0) < 1e-9 and L["inproc"]["embed"] == 428 and L["wall_p50"] == 2981

# 3. provenance of every number in the Reading prose
scratch = os.environ.get("RAG_SCRATCH", "")
srcs = []
for p in glob.glob(os.path.join(SRC, "*/out/*.json")) + glob.glob(os.path.join(ROOT, "*/src/facts.json")) + \
         glob.glob(os.path.join(ROOT, "*/src/data/*.json")) + glob.glob(os.path.join(ROOT, "*/src/out/*.json")) + \
         [os.path.join(SRC, "data/README.md")] + glob.glob(os.path.join(KB, "reference/papers/*memory*/src/tables.json")) + \
         glob.glob(os.path.join(SRC, "parts/3*_tab_*.html")):
    try: srcs.append(open(p).read())
    except Exception: pass
for p in ["FACTS.md", "agt/published.md"]:
    if scratch and os.path.exists(os.path.join(scratch, p)): srcs.append(open(os.path.join(scratch, p)).read())
    else: print("note: RAG_SCRATCH not set or", p, "missing; provenance check is partial")
corpus = " ".join(srcs).replace(",", "")
nums_src = set(re.findall(r"\d+(?:\.\d+)?", corpus))
fl = set()
for n in nums_src:
    try: fl.add(float(n))
    except ValueError: pass
# arithmetic results and illustrative inputs written on this page (derived or labelled illustrative)
ALLOWED = {"0.511", "0.479", "0.675", "0.75", "0.81", "18000", "52500", "3.3", "9.5", "5500", "0.021", "3.009", "0.309", "143", "15",
           "1500", "2000", "4000", "500", "400", "3", "1000000", "10", "0.027", "66", "82", "92", "112", "200", "300", "50", "100",
           "26", "51", "256", "512", "1024", "205", "410", "25.6", "51.2", "8", "20", "30", "5", "7", "1", "2", "4", "6", "0", "9",
           "13", "14", "16", "17", "18", "19", "23", "40", "44", "60", "64", "90", "96", "98", "120", "150", "320", "3000", "20000",
           "50000", "5000000", "0.6", "0.7", "0.5", "1.7", "0.05", "2009", "2019", "2020", "2022", "2023", "2024", "2025", "2026",
           "1990", "8", "2.4", "4.2", "100000", "0.95", "0.90", "0.2", "0.10", "0.56", "6.4", "144", "0.62", "0.65", "0.79", "0.06",
           # read outside the shared notes: Topic: benchmarks (39.42), NoLiMa abstract (99.3, 69.7), 87.9 - 64.6 (23.3), arXiv id
           "39.42", "99.3", "69.7", "23.3", "2607.08716"}
missing = []
for m in re.finditer(r"(?<![\w.])(\d[\d,]*(?:\.\d+)?)(?![\w])", read_txt):
    raw = m.group(1).replace(",", "")
    if raw in ALLOWED or raw in nums_src: continue
    try: v = float(raw)
    except ValueError: continue
    d = len(raw.split(".")[1]) if "." in raw else 0
    if any(abs(round(x, d) - v) < 1e-9 for x in fl if abs(x - v) < 1): continue
    if any(abs(round(x * 100, d) - v) < 1e-9 for x in fl if abs(x * 100 - v) < 1): continue  # a share written as a percentage
    if v == int(v) and (v < 13 or v in (2026,)): continue
    missing.append(raw + " ... " + read_txt[max(0, m.start() - 60):m.end() + 20])
if missing:
    print("numbers without a source match (check by hand):"); [print("  ", x) for x in missing]

# 4. privacy and hygiene
pat = re.compile(r"/Users/|Users-|khalid|glpat|sk-ant|claude-502|@aveni")
for p in glob.glob(os.path.join(HERE, "**/*"), recursive=True) + glob.glob(os.path.join(SRC, "parts/2*")) + glob.glob(os.path.join(SRC, "parts/39_*")):
    if os.path.isdir(p) or p.endswith(".png"): continue
    t = open(p, errors="ignore").read()
    if pat.search(t) and not p.endswith("check_numbers.py"): bad.append("privacy pattern in " + p + ": " + pat.search(t).group(0))
    if chr(0x2014) in t: bad.append("em dash in " + p)
if pat.search(read) : bad.append("privacy pattern in the Reading tab")
print("FAIL\n  " + "\n  ".join(bad) if bad else "ok: data embedded exactly, %d key prose numbers match, privacy clean" % len(key))
sys.exit(1 if bad else 0)
