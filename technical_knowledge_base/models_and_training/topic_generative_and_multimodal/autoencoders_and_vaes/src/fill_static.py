"""Write every recorded number into the built page's static HTML, so the text reads the same with or without scripts
(and the reading-time audit and the knowledge ledger see the numbers).  Run by build.sh after assembly:
  python3 fill_static.py ../index.html
A span <span data-av="path" data-f="fmt"></span> gets its value from window.AVD (this page's runs) or window.AVL
(paths starting "lab.": the topic's Latent lab runs this page reuses, written by absorb_lab.py).
Formats: none (as recorded), int (rounded, thousands separated), pct (percent, 0 decimals), 0/1/2/3 (fixed decimals).
Fails loudly on a path that does not resolve.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name, var):
    s = open(os.path.join(HERE, "parts", name)).read()
    i = s.index("window." + var + "=") + len("window." + var + "=")
    return json.loads(s[i:].strip().rstrip(";"))


D = load("22_js_av_0data.js", "AVD")
L = load("22_js_av_1lab.js", "AVL") if os.path.exists(os.path.join(HERE, "parts", "22_js_av_1lab.js")) else {}
ROOTS = {"lt": D["lt"], "elbo": D["elbo"]["runs"], "pc": D["pc"]["runs"], "quant": D["quant"], "derived": D["derived"],
         "tok": D["tok"]["m"], "lab": L}


def get(path):
    p = path.split(".")
    o = ROOTS[p[0]]
    for k in p[1:]:
        o = o[int(k)] if isinstance(o, list) else o[k]
    return o


def grp(x, dec):
    s = f"{x:,.{dec}f}"
    return s


def fmt(v, f):
    if not isinstance(v, (int, float)) or isinstance(v, bool):
        return str(v)
    if f == "int":
        return grp(round(v), 0)
    if f == "pct":
        return f"{100 * v:.0f}%"
    if f in ("0", "1", "2", "3", "4"):
        return grp(v, int(f))
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    if abs(v) >= 1000:
        s = f"{v:,.3f}".rstrip("0").rstrip(".") if isinstance(v, float) else f"{v:,}"
        return s
    return repr(v) if isinstance(v, float) else str(v)


def main(path):
    h = open(path, encoding="utf-8").read()
    n = 0

    def rep(m):
        nonlocal n
        attrs = m.group(1)
        p = re.search(r'data-av="([^"]+)"', attrs).group(1)
        f = re.search(r'data-f="([^"]+)"', attrs)
        n += 1
        return "<span" + attrs + ">" + fmt(get(p), f.group(1) if f else None) + "</span>"

    h = re.sub(r'<span((?:\s+[\w-]+="[^"]*")*\s+data-av="[^"]+"(?:\s+[\w-]+="[^"]*")*)>[^<]*</span>', rep, h)
    open(path, "w", encoding="utf-8").write(h)
    print("fill_static:", n, "numbers written")


if __name__ == "__main__":
    main(sys.argv[1])
