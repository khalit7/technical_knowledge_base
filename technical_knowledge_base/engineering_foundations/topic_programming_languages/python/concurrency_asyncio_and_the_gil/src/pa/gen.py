"""Expand this page's templates (tpl/*.html, tpl/*.js) into ../parts/, inlining the real code and
recorded outputs. Copied from the language page's src/pa/gen.py (2026-10-26): class names carry this page's prefix (cg-),
the datasets are trimmed to this page, and [[drill:TITLE]] shows one recorded drill behind a reveal. Markers in templates:
  [[run:NAME]]        code/NAME.py plus outputs/NAME.txt
  [[code:NAME]]       code only (NAME may carry a line range: NAME@12-30)
  [[out:FILE]]        outputs/FILE (a .txt name without extension), with a caption line above
  [[predict:NAME]]    code, then the output hidden behind "Predict, then reveal"
  [[drill:TITLE]]     a snippet from outputs/q_drills.json, its output hidden behind "Predict, then reveal"
  [[json:FILE]]       (in .js templates) the contents of outputs/FILE.json, or a derived dataset
Run with any Python 3.10+: python3 gen.py"""
import html, io, json, keyword, re, sys, tokenize
from pathlib import Path

HERE = Path(__file__).resolve().parent
CODE, OUT, TPL, PARTS = HERE / "code", HERE / "outputs", HERE / "tpl", HERE.parent / "parts"

def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")

def highlight(src):
    """Token-level colouring with the stdlib tokenizer: comments, strings, keywords."""
    lines = src.split("\n")
    marks, fstart = [], []          # (row, col_start, col_end, cls)
    try:
        for tok in tokenize.generate_tokens(io.StringIO(src).readline):
            cls = None
            if tok.type == tokenize.COMMENT: cls = "cm"
            if tok.type == tokenize.STRING: cls = "st"
            if tok.type == getattr(tokenize, "FSTRING_START", -99):
                fstart.append(tok.start)
            if tok.type == getattr(tokenize, "FSTRING_END", -99) and fstart:
                s0 = fstart.pop()
                if not fstart and s0[0] == tok.end[0]:
                    marks.append((s0[0] - 1, s0[1], tok.end[1], "st"))
            if tok.type == tokenize.NAME and (keyword.iskeyword(tok.string) or tok.string in ("self",)): cls = "kw"
            if cls and tok.start[0] == tok.end[0]:
                marks.append((tok.start[0] - 1, tok.start[1], tok.end[1], cls))
    except (tokenize.TokenError, SyntaxError, IndentationError):
        return esc(src)
    by_row = {}
    for r, a, b, c in marks:
        by_row.setdefault(r, []).append((a, b, c))
    out = []
    for i, line in enumerate(lines):
        segs, pos = [], 0
        for a, b, c in sorted(by_row.get(i, [])):
            if a < pos: continue
            segs.append(esc(line[pos:a])); segs.append(f'<span class="{c}">{esc(line[a:b])}</span>'); pos = b
        segs.append(esc(line[pos:]))
        out.append("".join(segs))
    return "\n".join(out)

def code_of(spec):
    name, _, rng = spec.partition("@")
    src = (CODE / f"{name}.py").read_text().rstrip("\n")
    if rng:
        a, b = map(int, rng.split("-"))
        src = "\n".join(src.split("\n")[a - 1:b])
    return name, src

def code_block(spec):
    name, src = code_of(spec)
    return f'<div class="cg-file">{esc(name)}.py</div><pre class="cg-code">{highlight(src)}</pre>'

def out_block(name, label="output"):
    txt = (OUT / f"{name}.txt").read_text().rstrip("\n")
    return f'<div class="cg-olab">{esc(label)}</div><pre class="cg-out" data-src="{esc(name)}.txt">{esc(txt)}</pre>'

def expand(text):
    def rep(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "run":
            return f'<div class="cg-snip">{code_block(arg)}{out_block(arg.split("@")[0], "real output, Python 3.14.8")}</div>'
        if kind == "code":
            return f'<div class="cg-snip">{code_block(arg)}</div>'
        if kind == "out":
            name, _, label = arg.partition("|")
            return f'<div class="cg-snip">{out_block(name, label or "real output")}</div>'
        if kind == "predict":
            name = arg.split("@")[0]
            return (f'<div class="cg-snip cg-pred">{code_block(arg)}<details><summary>Predict the output, then reveal</summary>'
                    f'{out_block(name, "real output, Python 3.14.8")}</details></div>')
        if kind == "drill":
            d = next(x for x in json.loads((OUT / "q_drills.json").read_text()) if x["title"] == arg)
            return (f'<div class="cg-snip cg-pred"><div class="cg-file">{esc(d["title"])}</div><pre class="cg-code">{highlight(d["code"])}</pre>'
                    f'<details><summary>Predict the output, then reveal</summary><div class="cg-olab">real output, Python 3.14.8 (outputs/q_drills.json)</div>'
                    f'<pre class="cg-out">{esc(d["out"])}</pre></details></div>')
        if kind == "json":
            return json.dumps(DATA[arg], separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
        raise ValueError(kind)
    return re.sub(r"\[\[(run|code|out|predict|drill|json):([^\]]+)\]\]", rep, text)

def parse_k1(name):
    rows = []
    for line in (OUT / f"{name}.txt").read_text().splitlines():
        m = re.match(r"^(CPU|I/O) (.+?)\s+([\d.]+) s$", line)
        if m: rows.append([m.group(1), m.group(2), float(m.group(3))])
    return rows

def parse_a3():
    rows = []
    for line in (OUT / "a3_fanout.txt").read_text().splitlines():
        m = re.match(r"^(.+?)\s{2,}([\d.]+) s", line)
        if m: rows.append([m.group(1).strip(), float(m.group(2))])
    return rows

DATA = {
    "k1": {"gil": parse_k1("k1_gil"), "ft": parse_k1("k1_gil_314t")},
    "a2_trace": json.loads((OUT / "a2_trace.json").read_text()),
    "a3": parse_a3(),
}

written = []
for f in sorted(TPL.iterdir()):
    if f.suffix not in (".html", ".js"): continue
    (PARTS / f.name).write_text(expand(f.read_text()))
    written.append(f.name)
print("wrote", len(written), "parts:", " ".join(written))
