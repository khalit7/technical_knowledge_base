"""Checks for the Agentic lab: (1) the built page embeds exactly the data make_data.py writes from out/*.json;
(2) every number quoted in the tab's prose (listed in CLAIMS with the data path it comes from) matches the data;
(3) no private paths, tokens or em-dashes in the tab's files.
usage: python -I -B check_numbers.py   (exit 1 on any failure)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glob
import json
import re

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(HERE, "..", "parts")
PAGE = os.path.join(HERE, "..", "..", "index.html")
bad = 0


def fail(msg):
    global bad
    bad += 1
    print("FAIL", msg)


# (1) embedded data
part = open(os.path.join(PARTS, "33_js_agt_0data.js")).read()
page = open(PAGE).read()
if part.split("\n", 1)[1].strip() not in page:
    fail("index.html does not embed parts/33_js_agt_0data.js (rebuild)")
D = json.loads(part.split("window.AGTD=", 1)[1].rstrip().rstrip(";"))
for name in ("hops", "strategies", "steps", "position", "tune", "router", "graphrag"):
    p = os.path.join(HERE, "out", name + ".json")
    if os.path.exists(p) and json.load(open(p)) != D.get(name):
        fail("embedded %s differs from out/%s.json" % (name, name))

# (2) prose numbers: (text that must appear in the tab's HTML, value from data formatted the same way)
prose = "".join(open(f).read() for f in sorted(glob.glob(os.path.join(PARTS, "33_tab_agt_*.html"))))


def get(path):
    x = D
    for k in re.split(r"\.(?!7b)", path):
        x = x[int(k)] if isinstance(x, list) else x[k]
    return x


from claims import CLAIMS  # noqa: E402  (text template with {}, data path, format)
for tmpl, path, fmt in CLAIMS:
    try:
        v = get(path) if isinstance(path, str) else path(D)
    except Exception as e:
        fail("claim %r: data path %s missing (%s)" % (tmpl, path, e)); continue
    s = tmpl.format(format(v, fmt) if fmt else v) if "{}" in tmpl else tmpl
    if s not in prose:
        fail("prose lacks %r (data %s = %r)" % (s, path, v))
print("claims checked:", len(CLAIMS))

# (3) privacy and style
for f in sorted(glob.glob(os.path.join(PARTS, "33_*"))) + sorted(glob.glob(os.path.join(HERE, "*.*"))) + sorted(glob.glob(os.path.join(HERE, "out", "*"))):
    t = open(f, errors="ignore").read()
    for pat in ("/Users/", "Users-", os.environ.get("USER") or "/Users/", "glpat", "sk-ant", "/private/tmp", "\u2014"):
        if pat in t and not f.endswith("check_numbers.py"):
            fail("%s contains %r" % (os.path.basename(f), pat))
print("FAILURES", bad)
sys.exit(1 if bad else 0)
