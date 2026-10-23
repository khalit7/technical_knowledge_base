"""Write the recorded facts into the built page as static text, so the prose reads the same with scripts off and the
knowledge ledger (html_utils/ledger.py, which ignores script output) can find every number. The page's scripts fill
the same spans again from window.SD_DATA, so the values are identical either way.
usage (from build.sh): python3 -I fill_static.py ../index.html"""
import json, os, re, sys
H = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(H, "data.json")))
f = sys.argv[1]
s = open(f, encoding="utf-8").read()
F = D["facts"]
s = re.sub(r'<span data-f="([^"]+)"></span>', lambda m: '<span data-f="%s">%s</span>' % (m.group(1), F.get(m.group(1), "?")), s)
dr = D.get("drafters", {})
s = s.replace('<div id="sddr-find"></div>', '<div id="sddr-find">%s</div>' % dr.get("findings", ""))
s = s.replace('<span id="sddr-setup"></span>', '<span id="sddr-setup">%s</span>' % dr.get("setup", ""))
open(f, "w", encoding="utf-8").write(s)
