#!/usr/bin/env python3
"""Generate this page's Reading parts from tpl/ templates, code/ sources and out/ recordings (programs copied from the C++ page's Part 1, plus dispatch.cpp and exc_cost.cpp).

Template directives (all replaced by HTML):
  [[code:PATH]] or [[code:PATH:A-B]]   source file under code/ (lines A..B), highlighted
  [[out:NAME]]                          recorded output out/NAME.txt (long ones folded after 22 lines)
  [[pr:NAME|QUESTION]]                  predict, then reveal: the output hidden in a <details>
  [[g:NAME|REGEX]]                      the first regex group found in out/NAME.txt (inline number)
  [[m:KEY]]                             a number from summary() below (medians of the three timing runs)
  NAME may be out_2026-10-05/NAME for the C++ page's original recordings (kept for comparison)
Run: python3 src/ca/gen.py  (then sh src/build.sh)
"""
import html, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PARTS = HERE.parent / "parts"
OUT, CODE, TPL = HERE / "out", HERE / "code", HERE / "tpl"

KW = set("""alignas auto bool break case catch char class concept const consteval constexpr constinit continue
co_await co_return co_yield decltype default delete do double else enum explicit export extern false float for
friend if inline int long mutable namespace new noexcept nullptr operator override private protected public
requires return short signed sizeof static static_assert static_cast struct switch template this throw true try
typedef typename union unsigned using virtual void volatile while""".split())
TOK = re.compile(r'(?P<c>//[^\n]*)|(?P<p>^[ \t]*#[^\n]*)|(?P<s>"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\')|(?P<w>[A-Za-z_]\w*)|(?P<o>[\s\S])', re.M)


def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")


def hl(src):
    out = []
    for m in TOK.finditer(src):
        k, t = m.lastgroup, m.group()
        if k == "c":
            out.append('<span class="ca-cm">' + esc(t) + "</span>")
        elif k == "p":
            out.append('<span class="ca-pp">' + esc(t) + "</span>")
        elif k == "s":
            out.append('<span class="ca-st">' + esc(t) + "</span>")
        elif k == "w" and t in KW:
            out.append('<span class="ca-kw">' + t + "</span>")
        else:
            out.append(esc(t))
    return "".join(out)


def read_out(name):
    p = (HERE / (name + ".txt")) if "/" in name else (OUT / (name + ".txt"))
    if not p.exists():
        sys.exit("missing output " + name)
    return p.read_text()


def code(spec):
    parts = spec.split(":")
    path, rng = parts[0], parts[1] if len(parts) > 1 else None
    lines = (CODE / path).read_text().rstrip("\n").split("\n")
    first = 1
    if rng:
        a, b = map(int, rng.split("-"))
        lines, first = lines[a - 1:b], a
    body = hl("\n".join(lines))
    fn = Path(path).name + (f" (lines {first} to {first + len(lines) - 1})" if rng else "")
    return f'<div class="ca-src"><div class="ca-fn">{esc(fn)}</div><pre class="ca-code">{body}</pre></div>'


def out(name, fold=22):
    t = read_out(name).rstrip("\n")
    lines = t.split("\n")
    head = lines[0]
    cmd = ""
    if head.startswith("$ "):
        cmd, lines = head, lines[1:]
    cls = ' ca-bad' if any(l.startswith("[exit code") for l in lines) else ''
    cmd_html = f'<span class="ca-cmd">{esc(cmd)}</span>\n' if cmd else ""
    if len(lines) > fold:
        a, b = lines[:fold - 4], lines[fold - 4:]
        return (f'<pre class="ca-out{cls}" data-ca-out="{name}">{cmd_html}{esc(chr(10).join(a))}</pre>'
                f'<details class="ca-more"><summary>show the remaining {len(b)} lines</summary>'
                f'<pre class="ca-out{cls}" data-ca-rest="{name}">{esc(chr(10).join(b))}</pre></details>')
    return f'<pre class="ca-out{cls}" data-ca-out="{name}">{cmd_html}{esc(chr(10).join(lines))}</pre>'


def pr(arg):
    name, q = arg.split("|", 1)
    return (f'<details class="ca-pr"><summary><b>Predict, then reveal:</b> {q}</summary>{out(name)}</details>')


def grab(arg):
    name, rx = arg.split("|", 1)
    m = re.search(rx, read_out(name), re.M)
    if not m:
        sys.exit(f"no match for {rx} in {name}")
    return esc(m.group(1))


DIRECT = re.compile(r"\[\[(code|out|pr|g|m):(.+?)\]\]", re.S)


def render(text):
    def rep(m):
        k, a = m.group(1), m.group(2)
        return {"code": code, "out": out, "pr": pr, "g": grab, "m": lambda key: SUMMARY[key]}[k](a)
    return DIRECT.sub(rep, text)


def med(xs):
    xs = sorted(xs)
    return xs[len(xs) // 2]


def dispatch_data():
    """t_dispatch: three runs of dispatch.cpp. Per row: label, [order runs], [scattered runs] (None for flat rows)."""
    rows, loads = {}, []
    for l in read_out("t_dispatch").split("\n"):
        m = re.match(r"run \d, load average \{ ([0-9.]+)", l)
        if m:
            loads.append(float(m.group(1)))
        m = re.match(r"  (\S.*?)\s{2,}([0-9.]+)\s+([0-9.]+|\(flat\))$", l)
        if m:
            r = rows.setdefault(m.group(1), {"label": m.group(1), "order": [], "scat": []})
            r["order"].append(float(m.group(2)))
            if m.group(3) != "(flat)":
                r["scat"].append(float(m.group(3)))
    out = []
    for r in rows.values():
        assert len(r["order"]) == 3, r
        out.append({"label": r["label"], "order": r["order"], "scat": r["scat"] or None,
                    "o": med(r["order"]), "s": med(r["scat"]) if r["scat"] else None})
    return {"rows": out, "loads": loads}


def exc_data():
    """t_exc: three runs of exc_cost.cpp. rate: [p, [exceptions], [expected]]; depth: [d, [ok_t], [ok_e], [bad_t], [bad_e]]."""
    rate, depth, loads = {}, {}, []
    sec = 0
    for l in read_out("t_exc").split("\n"):
        m = re.match(r"run \d, load average \{ ([0-9.]+)", l)
        if m:
            loads.append(float(m.group(1)))
        if l.startswith("1. "):
            sec = 1
        elif l.startswith("2. "):
            sec = 2
        nums = re.findall(r"[0-9.e-]+", l.strip())
        if not re.match(r"\s+[0-9]", l):
            continue
        v = [float(x) for x in nums]
        if sec == 1 and len(v) == 3:
            r = rate.setdefault(v[0], [v[0], [], []])
            r[1].append(v[1]); r[2].append(v[2])
        elif sec == 2 and len(v) == 5:
            r = depth.setdefault(int(v[0]), [int(v[0]), [], [], [], []])
            for i in range(4):
                r[i + 1].append(v[i + 1])
    return {"rate": list(rate.values()), "depth": list(depth.values()), "loads": loads}


def growth_data():
    return [[int(a), int(b)] for a, b in re.findall(r"size (\d+) capacity (\d+)", read_out("l_vector_growth"))]


def sizes_data():
    return [[m.group(1).strip(), int(m.group(2))] for m in re.finditer(r"^(\S.*?)\s{2,}(\d+)$", read_out("l_sizes"), re.M)]


def summary(D, E):
    """Numbers the prose quotes, all medians of three runs (formatted as printed)."""
    S = {}
    for r in D["rows"]:
        k = r["label"].split(",")[0].split(" ")[0].lower()
        S["d." + r["label"] + ".o"] = f'{r["o"]:.2f}'
        if r["s"] is not None:
            S["d." + r["label"] + ".s"] = f'{r["s"]:.2f}'
    for p, t, e in E["rate"]:
        S[f"r.{p:g}.t"] = f"{med(t):.2f}"
        S[f"r.{p:g}.e"] = f"{med(e):.2f}"
    for d, ot, oe, bt, be in E["depth"]:
        S[f"x.{d}.ot"], S[f"x.{d}.oe"] = f"{med(ot):.2f}", f"{med(oe):.2f}"
        S[f"x.{d}.bt"], S[f"x.{d}.be"] = f"{med(bt):,.0f}", f"{med(be):.2f}"
    rows = {r["label"]: r for r in D["rows"]}
    S["d.misp"] = f'{(rows["virtual, 3 classes mixed"]["o"] - rows["virtual, 3 classes sorted"]["o"]) / (2 / 3):.1f}'
    r0 = next(r for r in E["rate"] if r[0] == 0)
    r5 = next(r for r in E["rate"] if r[0] == 0.5)
    S["r.throw"] = f'{(med(r5[1]) - med(r0[1])) / 0.5:,.0f}'
    b1 = med(E["depth"][0][3]); b64 = med(E["depth"][-1][3])
    S["x.perframe"] = f"{(b64 - b1) / 63:.0f}"
    S["x.us1"] = f"{b1 / 1000:.1f}"
    S["x.us64"] = f"{b64 / 1000:.0f}"
    S["load.min"] = f'{min(D["loads"] + E["loads"]):.1f}'
    S["load.max"] = f'{max(D["loads"] + E["loads"]):.1f}'
    return S


D, E = dispatch_data(), exc_data()
SUMMARY = summary(D, E)


def main():
    for t in sorted(TPL.glob("*.html")):
        (PARTS / t.name).write_text(render(t.read_text()))
        print("wrote", t.name)
    js = ("// generated by src/ca/gen.py from src/ca/out: do not edit\n"
          "window.CT_DATA={dispatch:" + json.dumps(D) + ",exc:" + json.dumps(E) + ",growth:" + json.dumps(growth_data()) +
          ",sizes:" + json.dumps(sizes_data()) + ",ranges:" + json.dumps(read_out("l_ranges").rstrip("\n").split("\n")[1:]) + "};\n")
    js = js.replace("{{", "{\\u007b").replace("</", "<\\/")
    (PARTS / "22_js_ct_data.js").write_text(js)
    print("wrote 22_js_ct_data.js", len(js), "bytes")
    (HERE / "summary.json").write_text(json.dumps(SUMMARY, indent=1) + "\n")


if __name__ == "__main__":
    main()
