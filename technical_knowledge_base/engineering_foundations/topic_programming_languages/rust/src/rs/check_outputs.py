"""Confirm the built page embeds every recorded output the templates reference, byte for byte (HTML-escaped),
and that the data script carries the recorded traces and benchmark runs. Run: python3 src/rs/check_outputs.py"""
import html, json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
page = (HERE.parent.parent / "index.html").read_text()
names = set()
for t in (HERE / "tpl").glob("*.html"):
    names |= set(re.findall(r"\[\[(?:out|pr):([\w]+)", t.read_text()))
bad = 0
def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")
for n in sorted(names):
    lines = (HERE / "out" / f"{n}.txt").read_text().rstrip("\n").split("\n")
    body = [l for l in lines if not l.startswith("$ ")]
    missing = [l for l in body if esc(l) not in page]
    if missing:
        bad += 1; print("MISSING", n, missing[:2])
m = re.search(r"window\.RS_DATA=(\{.*?\});\n", page, re.S)
data = json.loads(m.group(1))
rec = json.loads((HERE / "out" / "a2_trace.json").read_text())
for mode, v in rec.items():
    if [e[:3] for e in data["trace_rs"][mode]["events"]] != [[e[0], e[1], round(e[2], 2)] for e in v["events"]]:
        bad += 1; print("trace differs", mode)
runs = json.loads((HERE / "bench" / "results" / "bench_run1.json").read_text())["runs"]
if [round(r["rps"], 2) for r in runs] != [r["rps"] for r in data["bench"]["runs"]]:
    bad += 1; print("bench runs differ")
print(f"check_outputs: {len(names)} recorded outputs, traces and {len(runs)} benchmark runs checked, {bad} problems")
sys.exit(1 if bad else 0)
