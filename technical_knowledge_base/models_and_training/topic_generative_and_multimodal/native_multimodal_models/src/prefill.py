"""Write the recorded numbers into the built page's static text.

  python3 prefill.py      (run by build.sh after assembling ../index.html)

Every <span data-nm="path" data-f="fmt"></span> (or <code data-nm=...>) is filled with the value that
24_js_nm_read.js would write at load, using the same lookup (window.NM.d first, then window.NM) and the
same formats. The page then shows its measured numbers without JavaScript, and the knowledge ledger
(html_utils/ledger.py check, which reads static text only) can find them. The script still rewrites them.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "..", "index.html")
html = open(PAGE, encoding="utf8").read()
data = open(os.path.join(HERE, "parts", "22_js_nm_0data.js"), encoding="utf8").read()
N = json.loads(re.search(r"window\.NM=(\{.*?\});\n", data, re.S).group(1))


def walk(root, path):
    v = root
    for k in path.split("."):
        if isinstance(v, dict) and k in v:
            v = v[k]
        else:
            return None
    return v


def get(path):
    v = walk(N["d"], path)
    return v if v is not None else walk(N, path)


def js_fixed(v, n):
    # JavaScript toFixed rounds half away from zero on the decimal string for these magnitudes
    from decimal import Decimal, ROUND_HALF_UP
    return str(Decimal(repr(float(v))).quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_UP))


def fmt(v, f):
    if v is None:
        return "n/a"
    if isinstance(v, str):
        return v
    if f == "int":
        return f"{round(v):,}"
    if f == "pct":
        return js_fixed(100 * v, 1) + "%"
    if f == "g":
        return js_fixed(v / 1e9, 2)
    if f == "t":
        return js_fixed(v / 1e12, 0)
    if f == "m":
        return js_fixed(v / 1e6, 1)
    if f == "1":
        return js_fixed(v, 1)
    if f == "2":
        return js_fixed(v, 2)
    if isinstance(v, int) or float(v).is_integer():
        return f"{int(v):,}"
    return js_fixed(v, 2)


missing = []


def fill(m):
    tag, attrs = m.group(1), m.group(2)
    path = re.search(r'data-nm="([^"]+)"', attrs).group(1)
    f = re.search(r'data-f="([^"]+)"', attrs)
    v = get(path)
    if v is None:
        missing.append(path)
    s = fmt(v, f.group(1) if f else None)
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f"<{tag}{attrs}>{s}</{tag}>"


html, n = re.subn(r"<(span|code)(\s[^>]*data-nm=\"[^\"]+\"[^>]*)></\1>", fill, html)
open(PAGE, "w", encoding="utf8").write(html)
print(f"prefill: {n} numbers written" + (f", MISSING {missing}" if missing else ""))
sys.exit(1 if missing else 0)
