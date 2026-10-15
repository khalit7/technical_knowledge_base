"""Checks that ../index.html embeds exactly the recorded data and that every number in the prose matches it.
    python3 -I -B src/check_page.py            (from the page folder or anywhere)
1. window.PK in index.html equals parts/22_js_pk_data.js, and spot values equal src/runs/out/*.json.
2. PK.code equals the sections of src/runs/pk_kernels.py (and the root lab's matmul_kernel) byte for byte.
3. Every <span class="pkv" data-k=... data-f=...> shows the formatted value of its data path (same formatting as
   23_js_pk_util.js).
4. The copy counts recorded by pk_grid.py equal a recount from the recorded block indices (Pallas's rule).
5. Privacy: no home path, scratchpad path, login name, tokens or e-mail addresses in the files to commit.
Exits non-zero on any failure.
"""
import html, json, os, re, sys

SRC = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.dirname(SRC)
fails = []
page = open(os.path.join(PAGE, "index.html"), encoding="utf-8").read()
m = re.search(r"window\.PK=(\{.*?\});\n", page, re.S)
PK = json.loads(m.group(1))
part = open(os.path.join(SRC, "parts", "22_js_pk_data.js"), encoding="utf-8").read()
if json.loads(re.search(r"window\.PK=(\{.*\});", part, re.S).group(1)) != PK:
    fails.append("embedded PK differs from parts/22_js_pk_data.js (rebuild)")
out = lambda n: json.load(open(os.path.join(SRC, "runs", "out", n)))
K, PL, TI, SR = out("kernels.json"), out("pipeline.json"), out("tiles.json"), out("source.json")
close = lambda a, b: abs(a - b) <= 1e-3 * max(abs(a), abs(b), 1e-30)
for path, want in [("K.kernels.flash.err", K["kernels"]["flash"]["err"]), ("K.production.gmm_err", K["production"]["gmm_err"]),
                   ("K.paged.err", K["paged"]["err"]), ("PL.cases.big.t_overlap", PL["cases"]["big"]["t_overlap"]),
                   ("TI.err_wrong", TI["err_wrong"]), ("K.kernels.layer_norm.grads.dscale.err", K["kernels"]["layer_norm"]["grads"]["dscale"]["err"])]:
    got = PK
    for k in path.split("."):
        got = got[k]
    if not close(got, want):
        fails.append(f"{path}: page {got} vs recorded {want}")
# 2. code
src = open(os.path.join(SRC, "runs", "pk_kernels.py")).read()
for mm in re.finditer(r"# ---- (\w+)\n(.*?)# ---- end", src, re.S):
    if PK["code"].get(mm.group(1)) != mm.group(2).rstrip() + "\n":
        fails.append("code section differs: " + mm.group(1))


# 3. prose numbers
def comma(x, d):
    return f"{x:,.{d}f}"


def e2(x):
    if x == 0:
        return "0"
    s = f"{x:.1e}"
    mant, ex = s.split("e")
    return mant + "e" + ("-" if ex.startswith("-") else "") + str(int(ex.lstrip("+-")))


def fmt(x, f):
    if f == "s": return str(x)
    if f == "ln": return str(int(x))
    if f == "e2": return e2(x)
    if f == "i": return comma(x, 0)
    if re.fullmatch(r"f\d", f): return comma(x, int(f[1]))
    if f == "mb1": return comma(x / 1e6, 1) + " MB"
    if f == "kb0": return comma(x / 1e3, 0) + " KB"
    if f == "pct0": return comma(x * 100, 0) + "%"
    if f == "pct1": return comma(x * 100, 1) + "%"
    if f == "list": return ", ".join(str(v) for v in x)
    if f == "yn": return "yes" if x else "no"
    raise ValueError(f)


def get(path):
    o = PK
    for k in path.split("."):
        if isinstance(o, list):
            o = o[int(k)]
        else:
            o = o[k]
    return o


n = 0
for mm in re.finditer(r'<span class="pkv" data-k="([^"]+)" data-f="([^"]+)">(.*?)</span>', page, re.S):
    path, f, text = mm.group(1), mm.group(2), html.unescape(re.sub(r"<[^>]+>", "", mm.group(3)))
    n += 1
    try:
        want = fmt(get(path), f)
    except Exception as ex:
        fails.append(f"span {path}: {ex!r}"); continue
    if text.strip() != want:
        fails.append(f"span {path} [{f}]: page says {text!r}, data gives {want!r}")
print("prose numbers checked:", n)
# 4. copy recount
for L in PK["G"]["kernels"]:
    prev = [None] * len(L["ops"]); cnt = [0] * len(L["ops"])
    for st in L["steps"]:
        idx = st[2]
        for t in range(len(L["ops"])):
            b = (idx[2 * t], idx[2 * t + 1])
            if b != prev[t]:
                cnt[t] += 1; prev[t] = b
    if cnt != L["copies"]:
        fails.append(f"copies of {L['name']} {L['variant']}: recount {cnt} vs recorded {L['copies']}")
# 5. privacy
login = os.environ.get("USER", "")
pats = ["/" + "Users/", "Users" + "-", "/" + "private/tmp", "glp" + "at", "sk-" + "ant", "ave" + "ni"]
if login:
    pats.append(login)
email = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
for root, dirs, files in os.walk(PAGE):
    dirs[:] = [d for d in dirs if d not in (".shots", "__pycache__", "node_modules")]
    for fn in files:
        p = os.path.join(root, fn)
        try:
            t = open(p, encoding="utf-8").read()
        except Exception:
            continue
        for pat in pats:
            if pat in t:
                fails.append(f"privacy: {pat!r} in {os.path.relpath(p, PAGE)}")
        for e in email.findall(t):
            if not e.endswith((".py", ".js", ".html", ".json", ".md")) and "noreply" not in e and "@functools" not in e:
                fails.append(f"privacy: e-mail-like {e!r} in {os.path.relpath(p, PAGE)}")
        if os.path.getsize(p) > 4_000_000:
            fails.append(f"size: {os.path.relpath(p, PAGE)} over 4 MB")
print("\n".join(fails) if fails else "ALL OK")
sys.exit(1 if fails else 0)
