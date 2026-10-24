"""Write each EV.txt value into its <span data-ev="key"></span> in ../index.html at build time, so every prose number
is static text (readable without JavaScript and visible to html_utils/ledger.py); the page's script fills the same values.
Also writes the reading time into the header subtitle from out/rt.json (minutes at 230 words a minute, copied by hand
from html_utils/audit_pages.mjs after a rebuild that changes the text)."""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
page = os.path.join(here, "..", "index.html")
s = open(page, encoding="utf-8").read()
ev = json.loads(re.search(r"window\.EV=(\{.*?\});\n", s, re.S).group(1))["txt"]
body_end = s.index("<script>/* ")   # only the HTML before the scripts
head, tail = s[:body_end], s[body_end:]
miss = set()
def fill(m):
    k = m.group(1)
    if k not in ev: miss.add(k); return m.group(0)
    return f'<span data-ev="{k}">{ev[k]}</span>'
head = re.sub(r'<span data-ev="([^"]+)"></span>', fill, head)
rt = json.load(open(os.path.join(here, "out", "rt.json")))
head = head.replace("RT_CORE", str(rt["core"])).replace("RT_DEPTH", str(rt["depth"]))
open(page, "w", encoding="utf-8").write(head + tail)
if miss: raise SystemExit(f"missing EV.txt keys: {sorted(miss)}")
