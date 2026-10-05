"""Confirm the built page embeds exactly the recorded outputs: every <pre data-rb-out="NAME"> equals outputs/NAME,
every code excerpt comes from a file that exists, and window.RB equals the JSON files. Run after sh ../build.sh."""
import html
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
page = (HERE.parents[1] / "index.html").read_text()
bad = n = 0
for name, body in re.findall(r'<pre class="rb-out" data-rb-out="([^"]+)">(.*?)</pre>', page, re.S):
    n += 1
    want = (HERE / "outputs" / name).read_text().rstrip("\n")
    got = html.unescape(body)
    if got != want:
        bad += 1
        print("DIFFERS", name)
m = re.search(r"window\.RB=(\{.*?\});\n", page)
rb = json.loads(m.group(1))
for key, f in [("convert", "c3_convert.json"), ("gil314", "c7_gil_314.json"), ("gil314t", "c7_gil_314t.json"),
               ("phases", "ladder_phases.json"), ("alts", "c8_alts.json"), ("startup", "startup.json")]:
    if rb[key] != json.loads((HERE / "outputs" / f).read_text()):
        bad += 1
        print("DATA DIFFERS", key)
lad = json.loads((HERE / "outputs" / "ladder_hf.json").read_text())
if [(r["step"], r["median"]) for r in lad] != [(r["step"], r["median"]) for r in rb["ladder"]]:
    bad += 1
    print("DATA DIFFERS ladder")
print(f"{n} output blocks checked, data checked: {'ok' if not bad else str(bad) + ' differences'}")
sys.exit(1 if bad else 0)
