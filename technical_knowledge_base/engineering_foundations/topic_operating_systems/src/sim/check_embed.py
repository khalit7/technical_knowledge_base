"""Confirm the built page embeds exactly the recorded outputs of this tab, and nothing private.
Every line of real/out/*.txt, check_ostep.txt and check_js.txt must appear in ../../index.html (as a JSON string),
the embedded data must equal a fresh parse of those files, and no private pattern may appear in src/sim or the tab parts."""
import json, os, re, sys, glob
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, "..", "..", "index.html")).read()
m = re.search(r"window\.SIMDATA=(\{.*?\});\n", page)
emb = json.loads(m.group(1))
bad, n = [], 0
for f in sorted(glob.glob(os.path.join(H, "real", "out", "*.txt"))):
    lines = [l.rstrip("\n") for l in open(f) if l.strip()]
    key = os.path.basename(f)[:-4]
    if emb["raw"].get(key) != lines:
        bad.append(f"{key}: embedded lines differ from {f}")
    for l in lines:
        n += 1
        if json.dumps(l) not in page:
            bad.append(f"{key}: line not in page: {l[:60]}")
for k, f in (("ostep", "check_ostep.txt"), ("js", "check_js.txt")):
    if emb["checks"][k] != [l.rstrip("\n") for l in open(os.path.join(H, f)) if l.strip()]:
        bad.append(f"checks {k} differ from {f}")
pats = ["glpat", "sk-ant", "/Users/", "/private/tmp", "khalid"]
files = glob.glob(os.path.join(H, "**", "*"), recursive=True) + glob.glob(os.path.join(H, "..", "parts", "31_*"))
for f in files:
    if os.path.isfile(f) and not f.endswith(".png"):
        t = open(f, errors="replace").read()
        for p in pats:
            if p in t and not f.endswith("check_embed.py"):
                bad.append(f"private pattern {p!r} in {os.path.relpath(f, H)}")
print(f"{n} recorded lines checked; " + ("OK" if not bad else f"{len(bad)} problems"))
print("\n".join(bad[:30]))
sys.exit(1 if bad else 0)
