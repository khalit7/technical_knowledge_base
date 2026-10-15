"""Check that ../index.html embeds exactly data/dg_data.json, that every fact in data/facts.json appears in the page,
that no @@key@@ is left unfilled, and that numbers quoted in the prose agree with the data they come from.
usage: python3 scripts/check_numbers.py   (from src/; stdlib only)
"""
import json
import os
import re
import sys

SRC = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
html = open(os.path.join(SRC, "..", "index.html"), encoding="utf-8").read()
data = json.load(open(os.path.join(SRC, "data", "dg_data.json")))
facts = json.load(open(os.path.join(SRC, "data", "facts.json")))
bad = []

m = re.search(r"window\.DG=(.*?);\n</script>", html, re.S)
if not m or json.loads(m.group(1)) != data:
    bad.append("embedded window.DG differs from data/dg_data.json")
for k, v in facts.items():
    if v not in html:
        bad.append(f"fact {k} not found in page")
if re.search(r"@@[a-z0-9_]+@@", html):
    bad.append("unfilled facts: " + ", ".join(sorted(set(re.findall(r"@@([a-z0-9_]+)@@", html)))))

C = {c["key"]: c for c in data["corpora"]}
n_docs = sum(c["docs"] for c in data["corpora"])
if facts["n_docs_all"] != f"{n_docs:,}":
    bad.append("n_docs_all")
if facts["n_items"] != f"{sum(data['bench_sizes'].values()):,}":
    bad.append("n_items")
if facts["dt_rm_ex"] != f"{C['run0_extracted']['dt']['default']['docs']:,}":
    bad.append("dt_rm_ex")
P = data["pii"]
if facts["pii_n_gold"] != str(sum(P["gold_types"].values())):
    bad.append("pii_n_gold")
if facts["pii_n_rows"] != str(len(P["rows"])):
    bad.append("pii_n_rows")
s = P["summary"]
for k in ("datatrove", "dolma", "extra", "presidio"):
    if f"{round(100 * s[k]['recall'])}%" not in facts["pii_misses"]:
        bad.append("pii recall " + k)
rn = data["robots_now"]["counts"]
if f"{rn['blocked_any_ai_trainer']:,}" not in html:
    bad.append("robots blocked count")
# headline numbers in the static prose
for lit in ("14,042", "10,042", "2,376", "1,319", "1,172", "29,946", "2,617"):
    if lit not in html:
        bad.append("missing " + lit)
print("checked", len(facts), "facts;", "FAIL: " + "; ".join(bad) if bad else "all agree")
sys.exit(1 if bad else 0)
