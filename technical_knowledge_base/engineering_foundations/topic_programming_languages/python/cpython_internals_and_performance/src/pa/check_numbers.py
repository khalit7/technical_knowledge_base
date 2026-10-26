"""Check that every measured number quoted in this page's prose matches the recorded outputs.
Copied from the language page's src/pa/check_numbers.py (2026-10-26) and trimmed to this page (profiling, NumPy, the hero
and lazy-import figures). Run after run_all.sh; if a re-run changed a timing, this lists the sentences to update."""
import json, re, sys
from pathlib import Path
H = Path(__file__).resolve().parent
O = lambda n: (H / "outputs" / f"{n}.txt").read_text()
T = "".join(p.read_text() for p in sorted((H / "tpl").glob("*.html")))
T += "".join(p.read_text() for p in sorted((H.parent / "parts").glob("20_read_[a,d-f].html")))
def num(pat, text):
    return float(re.search(pat, text).group(1))
p = O("p1_profile")
slow, fast, prof = num(r"p1_slow: (\d+) ms", p), num(r"p1_fast: (\d+) ms", p), num(r"function calls in ([\d.]+) seconds", p)
idx = num(r"([\d.]+)\s+[\d.]+\s+[\d.]+\s+[\d.]+ \{method 'index'", p)
sc = O("p1_scalene"); ml = num(r"make_log \(line 4\): (\d+)% Python", sc) + num(r"make_log \(line 4\): \d+% Python, (\d+)% native", sc)
rows = [list(map(float, re.findall(r"([\d.]+)us", l))) for l in O("p2_numpy").splitlines() if "us" in l and not l.startswith("Python")]
sp = [r[0] / r[2] for r in rows[1:]]; conv = rows[-1][3] / rows[-1][0]
L = json.loads((H.parent / "pb" / "out" / "lazy.json").read_text()); hf, it = L["hyperfine"], L["importtime"]
want = [
  f"{slow:.0f} ms down to {fast:.0f} ms",
  f"cost {idx * 1000:.0f} ms",
  f"({ml:.0f}%) to",
  f"{int(min(sp))} to {round(max(sp) + 0.5)} times faster",
  f"about {round(conv * 10) * 10:.0f}% of the whole Python loop",
  f"{rows[-1][0] / 1000:.1f} ms as a Python loop, {rows[-1][2] / 1000:.1f} ms as one NumPy call",
  f"loads {it['cli_lazy']['modules']} of the eager file's {it['cli_eager']['modules']} modules",
  f"takes {hf[1]['median_ms']:.0f} ms instead of {hf[0]['median_ms']:.0f} ms",
]
bad = [w for w in want if w not in T]
print("numbers checked:", len(want), "| stale:", bad or "none")
sys.exit(1 if bad else 0)
