#!/usr/bin/env python3
"""Generate Part 1's parts/ files from tpl/ templates, code/ sources and out/ recordings.

Template directives (all replaced by HTML):
  [[code:PATH]] or [[code:PATH:A-B]]   source file under code/ (lines A..B), highlighted
  [[out:NAME]]                          recorded output out/NAME.txt (long ones folded after 22 lines)
  [[pr:NAME|QUESTION]]                  predict, then reveal: the output hidden in a <details>
  [[g:NAME|REGEX]]                      the first regex group found in out/NAME.txt (inline value)
Also writes parts/34_js_ra_data.js (ownership logs, borrow-checker lab, drill) from content.py.
Run: python3 src/ra/gen.py  (then sh src/build.sh)
"""
import html, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import content  # noqa: E402

PARTS = HERE.parent / "parts"
OUT, CODE, TPL = HERE / "out", HERE / "code", HERE / "tpl"

KW = set("""as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod
move mut pub ref return self Self static struct super trait true type unsafe use where while def import from print
lambda None True False try except return yield class""".split())
TOK = re.compile(r'(?P<c>//[^\n]*|#(?![\[!])[^\n]*)|(?P<a>#!?\[[^\]\n]*\])|(?P<s>"(?:\\.|[^"\\\n])*"|b\'(?:\\.|[^\'\\\n])\'|\'(?:\\.|[^\'\\\n])\'(?!\w))|(?P<l>\'[a-z_]\w*)|(?P<w>[A-Za-z_]\w*!?)|(?P<o>[\s\S])', re.M)


def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")


def hl(src, py=False):
    out = []
    for m in TOK.finditer(src):
        k, t = m.lastgroup, m.group()
        if k == "c":
            if t.startswith("#") and not py:
                out.append(esc(t)); continue
            if t.startswith("//") and py:
                out.append(esc(t)); continue
            out.append('<span class="ra-cm">' + esc(t) + "</span>")
        elif k == "a":
            out.append('<span class="ra-at">' + esc(t) + "</span>")
        elif k == "s":
            out.append('<span class="ra-st">' + esc(t) + "</span>")
        elif k == "l":
            out.append('<span class="ra-lt">' + esc(t) + "</span>")
        elif k == "w" and t in KW:
            out.append('<span class="ra-kw">' + t + "</span>")
        elif k == "w" and t.endswith("!"):
            out.append('<span class="ra-mac">' + esc(t) + "</span>")
        else:
            out.append(esc(t))
    return "".join(out)


def read_out(name):
    p = OUT / (name + ".txt")
    if not p.exists():
        sys.exit("missing output " + name)
    return p.read_text()


def src(path):
    return (CODE / path).read_text().rstrip("\n")


def code(spec):
    parts = spec.split(":")
    path, rng = parts[0], parts[1] if len(parts) > 1 else None
    lines = src(path).split("\n")
    first = 1
    if rng:
        a, b = map(int, rng.split("-"))
        lines, first = lines[a - 1:b], a
    body = hl("\n".join(lines), py=path.endswith(".py"))
    fn = Path(path).name + (f" (lines {first} to {first + len(lines) - 1})" if rng else "")
    return f'<div class="ra-src"><div class="ra-fn">{esc(fn)}</div><pre class="ra-code">{body}</pre></div>'


def out(name, fold=22):
    t = read_out(name).rstrip("\n")
    lines = t.split("\n")
    cmd = ""
    if lines[0].startswith("$ "):
        cmd, lines = lines[0], lines[1:]
    bad = any(l.startswith("[exit code") for l in lines)
    cls = ' ra-bad' if bad else ''
    cmd_html = f'<span class="ra-cmd">{esc(cmd)}</span>\n' if cmd else ""
    if len(lines) > fold:
        a, b = lines[:fold - 4], lines[fold - 4:]
        return (f'<pre class="ra-out{cls}" data-ra-out="{name}">\n{cmd_html}{esc(chr(10).join(a))}</pre>'
                f'<details class="ra-more"><summary>show the remaining {len(b)} lines</summary>'
                f'<pre class="ra-out{cls}" data-ra-rest="{name}">\n{esc(chr(10).join(b))}</pre></details>')
    return f'<pre class="ra-out{cls}" data-ra-out="{name}">\n{cmd_html}{esc(chr(10).join(lines))}</pre>'


def pr(arg):
    name, q = arg.split("|", 1)
    return f'<details class="ra-pr"><summary><b>Predict, then reveal:</b> {q}</summary>{out(name)}</details>'


def grab(arg):
    name, rx = arg.split("|", 1)
    m = re.search(rx, read_out(name), re.M)
    if not m:
        sys.exit(f"no match for {rx} in {name}")
    return esc(m.group(1))


DIRECT = re.compile(r"\[\[(code|out|pr|g):(.+?)\]\]", re.S)


def render(text):
    return DIRECT.sub(lambda m: {"code": code, "out": out, "pr": pr, "g": grab}[m.group(1)](m.group(2)), text)


def data():
    d = {"own": {"rs_src": src("lang/own_anim.rs"), "py_src": src("lang/own_anim.py"),
                 "rs_log": read_out("l_own_anim"), "py_log": read_out("l_own_anim_py")},
         "gate": {k: {"src": src(f"lang/{f}.rs"), "out": read_out(o)} for k, f, o in
                  [("err", "gate_err", "l_gate_err"), ("fix", "gate_fix", "l_gate_fix"), ("reorder", "gate_reorder", "l_gate_reorder")]}}
    d["bench"] = {"rs": read_out("t_iterbench"), "py": read_out("t_iterbench_py")}
    bc = []
    for s in content.BC:
        k = s["id"]
        e = dict(s)
        e["err_src"] = src(f"bc/{k}_err.rs")
        e["err_out"] = read_out(f"bc_{k}_err")
        e["fix_src"] = src(f"bc/{k}_fix.rs")
        e["fix_out"] = read_out(f"bc_{k}_fix")
        for extra in s.get("extra", []):
            e.setdefault("extras", []).append({"label": extra[1], "out": read_out(extra[0])})
        bc.append(e)
    d["bc"] = bc
    dr = []
    for it in content.DRILL:
        k = it["id"]
        e = dict(it)
        e["py_src"] = src(f"drill/{k}.py")
        e["py_out"] = read_out(f"dr_{k}_py")
        e["cands"] = [{"src": src(f"drill/{k}_{c}.rs"), "out": read_out(f"dr_{k}_{c}")} for c in "abc"]
        for extra in it.get("extra", []):
            e.setdefault("extras", []).append({"label": extra[1], "out": read_out(extra[0])})
        dr.append(e)
    d["drill"] = dr
    return d


def main():
    for t in sorted(TPL.glob("*.html")):
        (PARTS / t.name).write_text(render(t.read_text()))
        print("wrote", t.name)
    js = ("// generated by src/ra/gen.py from src/ra/out, src/ra/code and src/ra/content.py: do not edit\n"
          "window.RA_DATA=" + json.dumps(data()) + ";\n")
    js = js.replace("{{", "{\\u007b").replace("</", "<\\/")
    (PARTS / "34_js_ra_data.js").write_text(js)
    print("wrote 34_js_ra_data.js", len(js), "bytes")


main()
