"""Check that every measured number quoted in this page's prose matches the recorded outputs.
Copied from the language page's src/pa/check_numbers.py (2026-10-26), trimmed to this page.
Run after run_all.sh; if a re-run changed a timing, this lists the sentences to update."""
import re, sys
from pathlib import Path
H = Path(__file__).resolve().parent
O = lambda n: (H / "outputs" / f"{n}.txt").read_text()
T = "".join(p.read_text() for p in sorted((H / "tpl").glob("*.html")))
T += "".join(p.read_text() for p in sorted((H.parent / "parts").glob("20_read_[d-f].html")))
def num(pat, text):
    return float(re.search(pat, text).group(1))
k, kt = O("k1_gil"), O("k1_gil_314t")
cpu1, cpu4t, cpu4p = num(r"CPU serial\s+([\d.]+)", k), num(r"CPU 4 threads\s+([\d.]+)", k), num(r"CPU 4 processes\s+([\d.]+)", k)
io4 = num(r"I/O 4 threads\s+([\d.]+)", k)
ft1, ft4 = num(r"CPU serial\s+([\d.]+)", kt), num(r"CPU 4 threads\s+([\d.]+)", kt)
a3 = O("a3_fanout")
fan, to = num(r"gather, 20 at once\s+([\d.]+)", a3), num(r"timeout after\s+([\d.]+)", a3)
ticks = int(num(r"the ticker ran (\d+) times", O("a5_stream")))
want = [
  f"({cpu1:.2f} s serial, {cpu4t:.2f} s on four threads)",
  f"about {cpu1 / cpu4p:.1f} times faster",
  f"took {io4 * 1000:.0f} ms",
  f"({ft1:.2f} s to {ft4:.2f} s)",
  f"(0.94 s serial, 0.37 s on four threads, about {ft1 / ft4:.1f}x)",
  f"overlaps all the waits: {fan:.2f} s",
  f"stopped at {to:.3f} s",
  f"ran {ticks} times meanwhile",
]
bad = [w for w in want if w not in T]
print("numbers checked:", len(want), "| stale:", bad or "none")
sys.exit(1 if bad else 0)
