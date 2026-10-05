"""Check (1) the built page embeds exactly the redacted recordings in data/runs.json, (2) numbers in the tab's
prose match the data. Run after build: python3 check_data.py"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "..", "index.html")).read()
runs = json.load(open(os.path.join(HERE, "data", "runs.json")))
ft = json.load(open(os.path.join(HERE, "data", "first_tokens.json")))
causes = json.load(open(os.path.join(HERE, "causes.json")))
m = re.search(r"window\.SAME=(\{.*?\});\n", page, re.S)
emb = json.loads(m.group(1))
bad = []

# 1. recordings: same run set, same meta, calls, diff; transcripts are prefixes of the stored ones
for g in ("local", "claude"):
    if set(emb[g]) != set(runs[g]):
        bad.append(f"{g} run set differs: {set(emb[g]) ^ set(runs[g])}")
    for k, r in emb[g].items():
        src = runs[g][k]
        for f in ("meta", "calls", "diff"):
            if r[f] != src[f]:
                bad.append(f"{k}.{f} differs")
        if "transcript" in r:
            if len(r["transcript"]) != len(src["transcript"]):
                bad.append(f"{k} transcript length differs")
            for a, b in zip(r["transcript"], src["transcript"]):
                ta, tb = a.get("text") or "", b.get("text") or ""
                if not tb.startswith(ta.split("\n[... ")[0]):
                    bad.append(f"{k} transcript text is not a prefix of the stored one"); break
        if "first" in r and r["first"] != src["first"]:
            bad.append(f"{k}.first differs")
for k, v in ft.items():
    if v["full"] != v["server"]:
        bad.append(f"{k}: tokenizer total {v['full']} != server {v['server']}")

# 2. prose numbers against data
tab = open(os.path.join(HERE, "..", "parts", "31_tab_same.html")).read()
def need(text, ok, why):
    if text not in tab and text not in json.dumps(causes):
        bad.append(f"prose missing '{text}' ({why})")
    if not ok:
        bad.append(f"prose number wrong: '{text}' ({why})")
need("397 tokens", ft["a1_1"]["full"] == 397, "plain first request")
need("385 tokens", ft["a2_1"]["full"] == 385, "LangGraph first request")
need("491 tokens against our 397", ft["a4_1"]["full"] == 491, "Agents SDK first request")
need("2,231 tokens on the first call", ft["a5_1"]["full"] == 2231, "smolagents first request")
c = runs["claude"]
first = lambda k: sum(c[k]["calls"][0][x] or 0 for x in ("in", "cw", "cr"))
fixed = lambda pre: sum(1 for k, r in runs["local"].items() if re.match(pre, k) and r["meta"]["tests_pass"] and r["meta"]["tests_unchanged"])
clean = lambda pre: sum(1 for k, r in runs["local"].items() if re.match(pre, k) and r["meta"]["rc"] == 0)
summ = causes["summary"]
for txt, ok in [("plain loop fixed 3 of 4 runs", fixed(r"a1_") == 3), ("LangGraph 4 of 4", fixed(r"a2_") == 4),
                ("Pydantic AI fixed the code in 3 of 4 runs but ended none cleanly", fixed(r"a3_") == 3 and clean(r"a3_") == 0),
                ("smolagents fixed none of 8 runs", fixed(r"a5") == 0 and sum(1 for k in runs["local"] if k.startswith("a5")) == 8)]:
    if txt not in summ or not ok:
        bad.append(f"summary claim fails: {txt}")
if not all(r["meta"]["tests_pass"] for r in c.values()):
    bad.append("not every Claude run passed")
# confident wrong claims: four runs
if len([k for k in ("a4_1", "a5_1", "a5_t07_2", "a5_t07_3") if not runs["local"][k]["meta"]["tests_pass"]]) != 4:
    bad.append("four confident failures claim")
for x in ("/Users/", "Users-", "glpat", "sk-ant"):
    if x in page:
        bad.append(f"forbidden string {x} in page")
print("first-call Claude tokens:", {k: first(k) for k in ("a6_haiku_1", "a6b_haiku_1", "a6c_haiku_1", "a6_sonnet_1")})
print("FAIL" if bad else "OK", *bad, sep="\n")
sys.exit(1 if bad else 0)
