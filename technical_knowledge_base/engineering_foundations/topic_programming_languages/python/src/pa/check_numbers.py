"""Check that every measured number quoted in the Part 1 prose matches the recorded outputs.
Run after run_all.sh; if a re-run changed a timing, this lists the sentences to update."""
import re
from pathlib import Path
H = Path(__file__).resolve().parent
O = lambda n: (H / "outputs" / f"{n}.txt").read_text()
T = "".join(p.read_text() for p in sorted((H / "tpl").glob("*.html")))
def num(pat, text):
    return float(re.search(pat, text).group(1))
k, kt = O("k1_gil"), O("k1_gil_314t")
cpu1, cpu4t, cpu4p = num(r"CPU serial\s+([\d.]+)", k), num(r"CPU 4 threads\s+([\d.]+)", k), num(r"CPU 4 processes\s+([\d.]+)", k)
io4 = num(r"I/O 4 threads\s+([\d.]+)", k)
ft1, ft4 = num(r"CPU serial\s+([\d.]+)", kt), num(r"CPU 4 threads\s+([\d.]+)", kt)
p = O("p1_profile")
slow, fast, prof = num(r"p1_slow: (\d+) ms", p), num(r"p1_fast: (\d+) ms", p), num(r"function calls in ([\d.]+) seconds", p)
idx = num(r"([\d.]+)\s+[\d.]+\s+[\d.]+\s+[\d.]+ \{method 'index'", p)
fan = num(r"gather, 20 at once\s+([\d.]+)", O("a3_fanout"))
sc = O("p1_scalene"); ml = num(r"make_log \(line 4\): (\d+)% Python", sc) + num(r"make_log \(line 4\): \d+% Python, (\d+)% native", sc)
rows = [list(map(float, re.findall(r"([\d.]+)us", l))) for l in O("p2_numpy").splitlines() if "us" in l and not l.startswith("Python")]
sp = [r[0] / r[2] for r in rows[1:]]; conv = rows[-1][3] / rows[-1][0]
want = {
  f"({cpu1:.2f} s serial, {cpu4t:.2f} s on four threads)": True,
  f"about {cpu1 / cpu4p:.1f} times faster": True,
  f"took {io4 * 1000:.0f} ms": True,
  f"({ft1:.2f} s to {ft4:.2f} s)": True,
  f"overlaps all the waits: {fan:.2f} s": True,
  f"{slow:.0f} ms down to {fast:.0f} ms": True,
  f"became {prof:.2f} s under": True,
  f"cost {idx * 1000:.0f} ms": True,
  f"({ml:.0f}%) to": True,
  f"{int(min(sp))} to {round(max(sp) + 0.5)} times faster": True,
  f"about {round(conv * 10) * 10:.0f}% of the whole Python loop": True,
}
bad = [w for w in want if w not in T]
print("numbers checked:", len(want), "| stale:", bad or "none")
