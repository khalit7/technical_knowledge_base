"""Check every measured number quoted in this page's static text against the recorded outputs in pa/outputs.
Run after pa/run_all.sh (timings and sizes can move) and after editing the templates: python3 src/check_numbers.py"""
import re
from pathlib import Path

H = Path(__file__).resolve().parent
O = lambda n: (H / "pa" / "outputs" / f"{n}.txt").read_text()
T = "".join(p.read_text() for p in sorted((H / "pa" / "tpl").glob("*.html"))) + (H / "parts" / "20_read_a.html").read_text()
JS = (H / "parts" / "23_js_dm_read.js").read_text()

g3 = O("g3_memory")
eager_kib = float(re.search(r"eager.*peak=\s*([\d,.]+) KiB", g3).group(1).replace(",", ""))
lazy_kib = float(re.search(r"lazy.*peak=\s*([\d,.]+) KiB", g3).group(1))
sizes = {m.group(1).strip(): float(m.group(2)) for m in re.finditer(r"^(.+?)\s+([\d.]+) bytes per record", O("c3_sizes"), re.M)}
f4 = O("f4_cache")
calls = int(re.search(r"calls: (\d+)", f4).group(1))
nocache = int(re.search(r"makes (\d+) calls", f4).group(1))

want = [
    (f"about {lazy_kib} KiB", T),
    (f"about {round(eager_kib / 1024)} MiB", T),
    (f"about {round(eager_kib / 1024)} MiB", JS),
    (f"about {lazy_kib} KiB", JS),
    (f"{calls} calls instead of {nocache:,}", T),
    (f"({sizes['class']:.0f} against {sizes['class + __slots__']:.0f})", T),
    (f"Slots save {sizes['class'] - sizes['class + __slots__']:.0f} bytes", T),
    (f"from {sizes['class']:.0f} to {sizes['class + __slots__']:.0f} bytes", T),
]
bad = [w for w, src in want if w not in src]
# the bar chart: every row's printed value and its width relative to the largest
mx = max(sizes.values())
for name, v in sizes.items():
    row = re.search(r'<span class="nm">' + re.escape(name) + r'</span><span class="track"><span class="fill" style="width:([\d.]+)%[^"]*"></span></span><span class="val">([\d.]+) B</span>', T)
    if not row or abs(float(row.group(1)) - 100 * v / mx) > 0.1 or float(row.group(2)) != v:
        bad.append(f"bar {name}")
if abs(sizes["dict"] / sizes["class"] - 2) > 0.01:
    bad.append("dict is no longer twice a plain object")
print("numbers checked:", len(want) + len(sizes) + 1, "| stale:", bad or "none")
raise SystemExit(1 if bad else 0)
