#!/usr/bin/env python3
"""Generate Part 1's parts/ files from tpl/ templates, code/ sources and out/ recordings.

Template directives (all replaced by HTML):
  [[code:PATH]] or [[code:PATH:A-B]]   source file under code/ (lines A..B), highlighted
  [[out:NAME]]                          recorded output out/NAME.txt (long ones folded after 22 lines)
  [[pr:NAME|QUESTION]]                  predict, then reveal: the output hidden in a <details>
  [[g:NAME|REGEX]]                      the first regex group found in out/NAME.txt (inline number)
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
    p = OUT / (name + ".txt")
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


DIRECT = re.compile(r"\[\[(code|out|pr|g):(.+?)\]\]", re.S)


def render(text):
    def rep(m):
        k, a = m.group(1), m.group(2)
        return {"code": code, "out": out, "pr": pr, "g": grab}[k](a)
    return DIRECT.sub(rep, text)


def lifetime_data():
    """Scenarios for the lifetime animation: source excerpt, its first line number, and the recorded event log."""
    src = (CODE / "lang/lifetime.cpp").read_text().split("\n")
    def block(tag):
        a = next(i for i, l in enumerate(src) if l.strip() == f"// <{tag}>")
        b = next(i for i, l in enumerate(src) if l.strip() == f"// </{tag}>")
        return a + 2, src[a + 1:b]  # first line number (1-based), lines
    data = {}
    names = {"scope": "scope", "copymove": "copymove", "calls": "calls", "growth": "growth", "growth_nx": "growth",
             "reserve": "reserve", "unique": "unique", "shared": "shared", "unwind": "unwind"}
    for s, tag in names.items():
        first, lines = block(tag)
        if s == "growth_nx":
            pass
        ev = read_out("lt_" + s).rstrip("\n").split("\n")
        hf, hl_ = block("helpers")
        data[s] = {"first": first, "lines": lines, "helpers": {"first": hf, "lines": hl_} if s == "calls" else None,
                   "cmd": ev[0][2:], "log": ev[1:]}
    tr = (CODE / "lang/tracer.h").read_text()
    return data, tr


def ub_data():
    cases = ["overflow", "uninit", "index_oob", "table", "dangling_vec", "string_view_temp", "lambda_dangle",
             "double_free", "no_return", "race"]
    d = {}
    for c in cases:
        e = {"src": (CODE / f"ub/{c}.cpp").read_text().rstrip("\n"), "O0": read_out(f"ub_{c}_O0"), "O2": read_out(f"ub_{c}_O2")}
        for k in ["san", "warn", "hard", "hard_dbg", "init"]:
            p = OUT / f"ub_{c}_{k}.txt"
            if p.exists():
                e[k] = p.read_text()
        d[c] = e
    return d


def build_data():
    names = ["b_pp_count", "b_pp_tokens", "b_pp_head", "b_compile", "b_nm", "b_link_missing", "b_link_ok", "b_odr", "b_odr_nm", "b_odr_fix",
             "b_sizes", "b_otool", "b_incr", "b_cmake2"]
    files = {p: (CODE / p).read_text().rstrip("\n") for p in
             ["build1/main.cpp", "build1/tokens.h", "build1/tokens.cpp", "odr/util.h", "odr/a.cpp", "odr/b.cpp", "odr/util_inline.h"]}
    return {"out": {n: read_out(n) for n in names}, "files": files}


def main():
    for t in sorted(TPL.glob("*.html")):
        (PARTS / t.name).write_text(render(t.read_text()))
        print("wrote", t.name)
    lt, tr = lifetime_data()
    js = ("// generated by src/ca/gen.py from src/ca/out and src/ca/code: do not edit\n"
          "window.CA_DATA={lifetime:" + json.dumps(lt) + ",tracer:" + json.dumps(tr) +
          ",ub:" + json.dumps(ub_data()) + ",build:" + json.dumps(build_data()) + "};\n")
    # keep {{ out of the built page (build.sh expands {{text|url}})
    js = js.replace("{{", "{\\u007b").replace("</", "<\\/")
    (PARTS / "32_js_ca_data.js").write_text(js)
    print("wrote 32_js_ca_data.js", len(js), "bytes")


main()
