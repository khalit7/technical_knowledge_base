"""Check that the built page embeds exactly the recorded (redacted) outputs: every output block, symptom,
bar value and the environment block of the Debug lab must occur verbatim in src/debug/raw/ (or in
sources/excerpts.txt for quoted source). Also scans the recordings for private strings.
Usage: python3 check_embed.py  (after sh ../build.sh)"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.DBG_DATA=(\{.*?\});\n", page, re.S)
data = json.loads(m.group(1).replace("<\\/", "</"))


def raw(f):
    if f == "@excerpts":
        return open(os.path.join(HERE, "sources", "excerpts.txt"), encoding="utf-8").read()
    return open(os.path.join(HERE, "raw", f + ".txt"), encoding="utf-8").read()


allraw = {f[:-4]: raw(f[:-4]) for f in os.listdir(os.path.join(HERE, "raw")) if f.endswith(".txt")}
bad = n = 0


def check(text, f, what):
    global bad, n
    n += 1
    src = raw(f) if f else "\n".join(allraw.values())
    if text not in src:
        bad += 1
        print(f"NOT FOUND ({what}) in {f}: {text[:100]!r}")


check(data["env"], "env", "env")
for c in data["cases"]:
    for r in c["rec"]:
        check(r["t"], "@excerpts" if r["k"] == "src" else r["f"], c["id"])
    check(c["symptom"], c["sf"], c["id"] + " symptom")
    for v in c.get("bars", {}).get("vals", []):
        check(v["g"], v["f"], c["id"] + " bar")
priv = re.compile(r"glpat|sk-ant|/Users/(?!<user>)")
for f, s in allraw.items():
    if priv.search(s):
        bad += 1
        print("PRIVATE STRING in raw/" + f)
blk = re.search(r'<div class="tab" id="t-debug".*?</div>\n(?=<div class="tab"|<div id="jsErr")', page, re.S)
if blk and priv.search(blk.group(0)):
    bad += 1
    print("PRIVATE STRING in the tab HTML")
print(f"{len(data['cases'])} cases, {n} embedded texts checked against raw/, {bad} problems")
sys.exit(1 if bad else 0)
