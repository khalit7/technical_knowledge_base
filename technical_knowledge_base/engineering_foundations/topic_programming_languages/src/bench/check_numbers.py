"""Check that the Benchmark tab's numbers match the raw results.
1. Every median, min and max in summary.json is recomputed from the raw hyperfine JSON and memory.tsv.
2. ../parts/32_js_bm_data.js holds exactly summary.json.
3. If ../../index.html exists, it embeds that same data.
4. Every data-bm="path" placeholder in ../parts/32_tab_bench.html resolves to a value in summary.json.
Exits non-zero on any mismatch."""
import json
import re
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RES = HERE / "results"
bad = []
S = json.loads((RES / "summary.json").read_text())
raw = {r["command"]: r["times"] for r in json.loads((RES / "time_200k.json").read_text())["results"]}
mem = {}
for line in (RES / "memory.tsv").read_text().splitlines():
    i, _, rss, fp = line.split("\t")
    mem.setdefault(i, []).append((int(rss), int(fp)))
for v in S["variants"]:
    t = raw[v["id"]]
    for k, x in (("t_med", statistics.median(t)), ("t_min", min(t)), ("t_max", max(t))):
        if abs(v[k] - round(x, 4)) > 1e-9:
            bad.append(f"{v['id']} {k} {v[k]} != {x}")
    if abs(v["rss_mb"] - round(statistics.median(r for r, _ in mem[v["id"]]) / 2**20, 1)) > 1e-9:
        bad.append(f"{v['id']} rss")
part = (HERE.parent / "parts" / "32_js_bm_data.js").read_text()
m = re.search(r"window\.BM_DATA=(.*);\s*$", part, re.S)
if not m or json.loads(m.group(1)) != S:
    bad.append("parts/32_js_bm_data.js differs from summary.json")
page = HERE.parent.parent / "index.html"
if page.exists():
    html = page.read_text()
    m2 = re.search(r"window\.BM_DATA=(\{.*?\});\n", html, re.S)
    if not m2 or json.loads(m2.group(1)) != S:
        bad.append("index.html does not embed the current summary (rebuild with sh build.sh)")
tab = HERE.parent / "parts" / "32_tab_bench.html"
n_keys = 0
if tab.exists():
    t = tab.read_text()
    keys = re.findall(r'data-bm="([^"]+)"', t)
    for pair in re.findall(r'data-bm[rd]="([^"]+)"', t):
        keys += re.split(r"[/*]", pair)
    for key in keys:
        n_keys += 1
        cur = S
        for part_ in key.split("."):
            if isinstance(cur, list):
                cur = next((x for x in cur if x.get("id") == part_ or x.get("label") == part_), None)
            elif isinstance(cur, dict):
                cur = cur.get(part_)
            if cur is None:
                bad.append(f"data-bm key does not resolve: {key}")
                break
print(f"variants {len(S['variants'])}, data-bm placeholders {n_keys}, problems {len(bad)}")
for b in bad:
    print("  ", b)
sys.exit(1 if bad else 0)
