#!/usr/bin/env python3
"""Generate this page's parts/ files from tpl/ templates, code/ sources and out/ recordings.

Template directives (all replaced by HTML):
  [[code:PATH]] or [[code:PATH:A-B]]   source file under code/ (lines A..B), highlighted
  [[out:NAME]]                          recorded output out/NAME.txt (long ones folded after 22 lines)
  [[pr:NAME|QUESTION]]                  predict, then reveal: the output hidden in a <details>
  [[g:NAME|REGEX]]                      the first regex group found in out/NAME.txt (inline value)
  [[drill:ID]]                          a Python-to-Rust prediction prompt: the Python, three Rust candidates,
                                        and their recorded results in a closed block (notes from content.py)
Also writes parts/34_js_ra_data.js (the iterator benchmark, errors.rs for the ? stepper, the strings run) from the recordings.
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


VERB = {"compile": "refused by the compiler", "panic": "compiles, panics at run time",
        "warn": "compiles (with a warning) and runs", "ok": "compiles and runs"}


def verdict(t):
    if re.search(r"^error(\[E\d+\])?:", t, re.M):
        return "compile"
    if "panicked at" in t:
        return "panic"
    if re.search(r"^warning", t, re.M):
        return "warn"
    return "ok"


DRILL = {d["id"]: d for d in content.DRILL}


def drill(k):
    d = DRILL[k]
    h = [f'<div class="ra-dq" id="ra-dq-{k}" data-ans="{d["answer"]}">',
         f'<div class="ra-dqh"><b>Predict:</b> {esc(d["title"])}. Which Rust version prints what the Python prints?</div>',
         f'<div class="ra-two"><div>{code("drill/" + k + ".py")}</div><div>{out("dr_" + k + "_py")}</div></div>',
         '<div class="ra-dc">']
    for c in "abc":
        h.append(f'<div class="ra-cand" data-c="{c}"><div class="h"><span>{c.upper()}</span>'
                 f'<button type="button" data-pick="{c}">This one</button></div>{code("drill/" + k + "_" + c + ".rs")}</div>')
    h.append('</div><details class="ra-drv"><summary>What the three really did (rustc 1.99.0, debug builds)</summary>')
    for c in "abc":
        t = read_out(f"dr_{k}_{c}")
        mark = "matches Python" if c == d["answer"] else "differs"
        h.append(f'<div class="ra-res"><b>{c.upper()}: {VERB[verdict(t)]}, {mark}.</b> {d["notes"][c]}</div>{out("dr_" + k + "_" + c)}')
    for name, label in d.get("extra", []):
        h.append(f'<div class="ra-res"><b>{esc(label)}</b></div>{out(name)}')
    h.append("</details></div>")
    return "".join(h)


DIRECT = re.compile(r"\[\[(code|out|pr|g|drill):(.+?)\]\]", re.S)


def render(text):
    return DIRECT.sub(lambda m: {"code": code, "out": out, "pr": pr, "g": grab, "drill": drill}[m.group(1)](m.group(2)), text)


def data():
    return {"bench": {"rs": read_out("t_iterbench"), "py": read_out("t_iterbench_py")},
            "errors": {"src": src("lang/errors.rs"), "out": read_out("l_errors")},
            "strings": {"out": read_out("l_strings")}}


def main():
    for t in sorted(TPL.glob("*.html")):
        (PARTS / t.name).write_text(render(t.read_text()))
        print("wrote", t.name)
    js = ("// generated by src/ra/gen.py from src/ra/out: do not edit\n"
          "window.RA_DATA=" + json.dumps(data()) + ";\n")
    js = js.replace("{{", "{\\u007b").replace("</", "<\\/")
    (PARTS / "34_js_ra_data.js").write_text(js)
    print("wrote 34_js_ra_data.js", len(js), "bytes")


main()
