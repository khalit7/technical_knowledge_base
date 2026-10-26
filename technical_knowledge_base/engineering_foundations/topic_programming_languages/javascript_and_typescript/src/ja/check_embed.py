"""Check that the built page embeds exactly the recorded outputs, that the bar figures carry the recorded numbers. The page has no widgets: every figure is static HTML.
Run from anywhere: python3 src/ja/check_embed.py (after python3 src/ja/gen.py and sh src/build.sh)."""
import html, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
page = (HERE.parent.parent / "index.html").read_text()
bad = 0
boxes = re.findall(r'<pre class="je-out" data-je-src="([^"]+)">(.*?)</pre>', page, flags=re.S)
for name, body in boxes:
    if html.unescape(body).replace("&#123;", "{").replace("&#125;", "}") != (HERE / "outputs" / name).read_text().rstrip("\n"):
        print("DIFFERS", name); bad += 1
for f in sorted((HERE / "outputs").glob("*.txt")):
    if f.name != "node_versions_diff.txt" and f.name not in {n for n, _ in boxes}:
        print("NOT ON PAGE", f.name); bad += 1
m3 = (HERE / "outputs" / "m3_memory.txt").read_text()
k6 = (HERE / "outputs" / "k6_workers.txt").read_text()
m2 = (HERE / "outputs" / "m2_startup.txt").read_text()
for want, src in [("71 MB, 0.39 s", m3), ("347 MB, 0.43 s", m3), ("438 ms worst gap, 3 beats", k6), ("14 ms worst gap, 45 beats", k6),
                  ("31.4 ms", m2), ("8.7 ms", m2), ("11.3 ms", m2)]:
    if want not in page:
        print("FIGURE MISSING", want); bad += 1
print(f"{len(boxes)} outputs embedded, problems {bad}")
sys.exit(1 if bad else 0)
