"""Check that the built page embeds exactly the recorded outputs and code of Part 3:
every <pre data-tl-src="X.txt"> equals outputs/X.txt; every code block equals the file (or its line range);
window.TL equals the data gen.py derives from outputs/; and no output contains an API key-looking string."""
import html, json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE)); import gen
page = (HERE.parent.parent / "index.html").read_text()
bad = 0
outs = re.findall(r'<pre class="tl-out" data-tl-src="([^"]+)">(.*?)</pre>', page, re.S)
for name, body in outs:
    want = (gen.OUT / name).read_text().rstrip("\n")
    if html.unescape(body) != want: print("MISMATCH output", name); bad += 1
codes = re.findall(r'<div class="tl-file">([^<]+)</div><pre class="tl-code">(.*?)</pre>', page, re.S)
for lab, body in codes:
    lab = html.unescape(lab); name, _, rng = lab.partition(", lines ")
    src = (gen.CODE / name).read_text().rstrip("\n")
    if rng: a, b = map(int, rng.split("-")); src = "\n".join(src.split("\n")[a - 1:b])
    if html.unescape(re.sub(r"<[^>]+>", "", body)) != src: print("MISMATCH code", lab); bad += 1
m = re.search(r"window\.TL=(\{.*?\});\n", page, re.S)
tl = m.group(1)
for k, v in gen.DATA.items():
    if f"{k}:" + json.dumps(v, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/") not in tl: print("MISMATCH data", k); bad += 1
for f in gen.OUT.iterdir():
    if re.search(r"glpat|sk-ant-|sk-[A-Za-z0-9]{20}", f.read_text()): print("KEY-LIKE STRING in", f.name); bad += 1
print(f"{len(outs)} outputs, {len(codes)} code blocks, {len(gen.DATA)} datasets checked; problems: {bad}")
sys.exit(1 if bad else 0)
