"""From src/: the page embeds exactly out/data.json and out/ladder.json; every <span data-wk> number in the built page equals
out/expected.json (recompute.py); no private paths or tokens in the page or the committed sources."""
import json, os, re, sys, glob
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(HERE, "../index.html")).read()
ok = True
m = re.search(r"window\.WKD=(\{.*?\});\n", html, re.S)
emb = json.loads(m.group(1).replace("{\\u007b", "{{"))
if emb != json.load(open(os.path.join(HERE, "out/data.json"))):
    ok = False; print("FAIL embedded data differs from out/data.json")
m = re.search(r"window\.WKL=(\{.*?\});\n", html, re.S)
if json.loads(m.group(1)) != json.load(open(os.path.join(HERE, "out/ladder.json"))):
    ok = False; print("FAIL embedded ladder differs from out/ladder.json (run ladder.py)")
E = json.load(open(os.path.join(HERE, "out/expected.json")))
spans = re.findall(r'<span data-wk="([\w-]+)">([^<]*)</span>', html)
bad = [(k, v, E.get(k)) for k, v in spans if E.get(k) != v]
if bad:
    ok = False; print("FAIL prose numbers:", bad[:10])
print(f"{len(spans)} prose numbers checked against recompute.py, {len(bad)} mismatches")
pat = re.compile(r"Users/|Users-|glpat|sk-ant")
files = [os.path.join(HERE, "../index.html"), os.path.join(HERE, "../README.md")] + [f for f in glob.glob(os.path.join(HERE, "**/*"), recursive=True)
        if os.path.isfile(f) and not f.endswith((".png", ".pyc")) and "/.shots/" not in f and not f.endswith("check_embed.py")]
for f in files:
    try: t = open(f, errors="ignore").read()
    except Exception: continue
    if pat.search(t):
        ok = False; print("FAIL private pattern in", os.path.relpath(f, HERE), pat.search(t).group(0))
print("OK" if ok else "FAIL"); sys.exit(0 if ok else 1)
