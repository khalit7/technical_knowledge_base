"""Expand this page's templates (tpl/*.html, tpl/*.js) into ../parts/, inlining the real code and the
recorded outputs. Copied from the language page's src/ja/gen.py (2026-10-26) and trimmed: class names carry the jl- prefix,
the stepper, timeline, SSE and start-up data went with their sections; [[outc:]] and [[units:]] added. Markers in templates:
  [[run:NAME]]        code/NAME(.mjs|.cjs|.sh) plus outputs/NAME.txt
  [[code:NAME]]       code only (NAME may carry a line range: NAME@12-30)
  [[out:FILE|label]]  outputs/FILE.txt with a caption line above
  [[predict:NAME]]    code, then the output hidden behind "Predict, then reveal"
  [[outc:NAME]]       the output in the core, the code beside it in a closed block
  [[units:TEXT]]      a static figure of TEXT's UTF-16 code units, code points and UTF-8 bytes (computed here)
  [[json:KEY]]        (in .js templates) a dataset from DATA below
Run with any Python 3.10+: python3 gen.py"""
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CODE, OUT, TPL, PARTS = HERE / "code", HERE / "outputs", HERE / "tpl", HERE.parent / "parts"
RUNTIME = "Node 24.21.0"
OPEN_BOX = "\u2423"  # shows a space in the string figure

def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")

KW = set("""async await break case catch class const continue default delete do else export extends finally for
from function if import in instanceof let new of return static super switch this throw try typeof var void while
yield true false null undefined""".split())
TOK = re.compile(r"""(?P<cm>//[^\n]*|/\*.*?\*/)|(?P<st>"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(?P<id>[A-Za-z_$][\w$]*)""", re.S)
SHTOK = re.compile(r"""(?P<cm>(?:^|(?<=\s))#[^\n]*)|(?P<st>"(?:\\.|[^"\\])*"|'[^']*')|(?P<pr>^\$ [^\n]*)""", re.M)

def highlight(src, lang):
    out, pos = [], 0
    rx = SHTOK if lang == "sh" else TOK
    for m in rx.finditer(src):
        kind = m.lastgroup
        if kind == "id" and m.group() not in KW:
            continue
        out.append(esc(src[pos:m.start()]))
        cls = {"cm": "cm", "st": "st", "id": "kw", "pr": "kw"}[kind]
        # a comment or string may span lines: wrap each line separately so <pre> lines stay intact
        out.append("\n".join(f'<span class="{cls}">{esc(p)}</span>' if p else "" for p in m.group().split("\n")))
        pos = m.end()
    out.append(esc(src[pos:]))
    return "".join(out)

def find(name):
    for ext in ("", ".mjs", ".cjs", ".sh", ".js"):
        p = CODE / f"{name}{ext}"
        if p.is_file():
            return p
    raise FileNotFoundError(name)

def code_of(spec):
    name, _, rng = spec.partition("@")
    p = find(name)
    src = p.read_text().rstrip("\n")
    if rng:
        a, b = map(int, rng.split("-"))
        src = "\n".join(src.split("\n")[a - 1:b])
    return p, src

def code_block(spec):
    p, src = code_of(spec)
    lang = "sh" if p.suffix == ".sh" else "js"
    return f'<div class="jl-file">{esc(str(p.relative_to(CODE)))}</div><pre class="jl-code">{highlight(src, lang)}</pre>'

def out_name(name):
    name = name.split("@")[0]
    if name.startswith("loop/"):
        return "loop_" + name[5:]
    if name.startswith("q/"):
        return "q_" + name[2:]
    return name

def out_block(name, label):
    txt = (OUT / f"{name}.txt").read_text().rstrip("\n")
    return f'<div class="jl-olab">{esc(label)}</div><pre class="jl-out" data-jl-src="{esc(name)}.txt">{esc(txt)}</pre>'

def expand(text):
    def rep(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "run":
            return f'<div class="jl-snip">{code_block(arg)}{out_block(out_name(arg), "real output, " + RUNTIME)}</div>'
        if kind == "code":
            return f'<div class="jl-snip">{code_block(arg)}</div>'
        if kind == "out":
            name, _, label = arg.partition("|")
            return f'<div class="jl-snip">{out_block(name, label or "real output, " + RUNTIME)}</div>'
        if kind == "outc":
            p, _ = code_of(arg)
            return (f'<div class="jl-snip">{out_block(out_name(arg), "real output of " + p.name + ", " + RUNTIME)}'
                    f'<details class="mist"><summary>The code: {esc(p.name)}</summary><div class="b">{code_block(arg)}</div></details></div>')
        if kind == "units":
            return units(arg)
        if kind == "predict":
            return (f'<div class="jl-snip jl-pred">{code_block(arg)}<details><summary>Predict the output, then reveal</summary>'
                    f'{out_block(out_name(arg), "real output, " + RUNTIME)}</details></div>')
        if kind == "json":
            return json.dumps(DATA[arg], separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
        raise ValueError(kind)
    return re.sub(r"\[\[(run|code|out|predict|outc|units|json):([^\]]+)\]\]", rep, text)

def drills():
    res = []
    for p in sorted((CODE / "q").glob("q*.mjs")):
        src = p.read_text().rstrip("\n").split("\n")
        res.append({"id": p.stem, "title": src[0].lstrip("/ ").strip(), "code": "\n".join(src[1:]),
                    "out": (OUT / f"q_{p.stem}.txt").read_text().rstrip("\n")})
    return res

def units(text):
    """One row of boxes per UTF-16 code unit, a bracket per code point, the UTF-8 byte count: the string figure of section 1."""
    cells, cps = [], []
    for ch in text:
        b = ch.encode("utf-16-be")
        us = [b[i:i + 2].hex().upper() for i in range(0, len(b), 2)]
        pair = len(us) == 2
        cps.append(f'<div class="jl-cp{" jl-pair" if pair else ""}"><div class="jl-us">'
                   + "".join(f'<span class="jl-u"><b>{esc((OPEN_BOX if ch == " " else ch) if not pair else ("hi" if k == 0 else "lo"))}</b><i>{u}</i></span>' for k, u in enumerate(us))
                   + f'</div><div class="jl-cpl">{"U+%04X" % ord(ch)}{" (2 units)" if pair else ""}</div></div>')
    n_units = len(text.encode("utf-16-be")) // 2
    return (f'<div class="jl-units" role="img" aria-label="{esc(text)}: {n_units} UTF-16 units, {len(text)} code points, {len(text.encode())} UTF-8 bytes">'
            + "".join(cps) + f'</div><div class="jl-unitsum"><span><b>{n_units}</b> UTF-16 units: <code>.length</code>, indexing, <code>slice</code></span>'
            f'<span><b>{len(text)}</b> code points: <code>[...s]</code>, <code>for...of</code>, Python\'s <code>len</code></span>'
            f'<span><b>{len(text.encode())}</b> UTF-8 bytes: <code>TextEncoder</code>, what APIs bill and limit</span></div>')

def deopt():
    return (OUT / "n3_deopt.txt").read_text().rstrip("\n").split("\n")

DATA = {
    "drills": drills(),
    "deopt": deopt(),
}

if __name__ == "__main__":
    written = []
    for f in sorted(TPL.iterdir()):
        if f.suffix not in (".html", ".js"): continue
        (PARTS / f.name).write_text(expand(f.read_text()))
        written.append(f.name)
    print("wrote", len(written), "parts:", " ".join(written))
