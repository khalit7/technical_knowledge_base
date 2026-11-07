"""Copied from the Python essentials page's src/pa/gen.py and trimmed (no json datasets). Expands this page's
templates (tpl/*.html) into ../parts/, inlining the real code and recorded outputs. Markers in templates:
  [[run:NAME]]        code/NAME.py plus outputs/NAME.txt
  [[code:NAME]]       code only (NAME may carry a line range: NAME@12-30)
  [[out:FILE]]        outputs/FILE (a .txt name without extension), with a caption line above
  [[predict:NAME]]    code, then the output hidden behind "Predict, then reveal"
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
    return f'<div class="pa-file">{esc(name)}.py</div><pre class="pa-code">{highlight(src)}</pre>'

def out_block(name, label="output"):
    txt = (OUT / f"{name}.txt").read_text().rstrip("\n")
    return f'<div class="pa-olab">{esc(label)}</div><pre class="pa-out" data-src="{esc(name)}.txt">{esc(txt)}</pre>'

def expand(text):
    def rep(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "run":
            return f'<div class="pa-snip">{code_block(arg)}{out_block(arg.split("@")[0], "real output, Python 3.14.8")}</div>'
        if kind == "code":
            return f'<div class="pa-snip">{code_block(arg)}</div>'
        if kind == "out":
            name, _, label = arg.partition("|")
            return f'<div class="pa-snip">{out_block(name, label or "real output")}</div>'
        if kind == "predict":
            name = arg.split("@")[0]
            return (f'<div class="pa-snip pa-pred">{code_block(arg)}<details><summary>Predict the output, then reveal</summary>'
                    f'{out_block(name, "real output, Python 3.14.8")}</details></div>')
        raise ValueError(kind)
    return re.sub(r"\[\[(run|code|out|predict):([^\]]+)\]\]", rep, text)

written = []
for f in sorted(TPL.iterdir()):
    if f.suffix not in (".html", ".js"): continue
    (PARTS / f.name).write_text(expand(f.read_text()))
    written.append(f.name)
print("wrote", len(written), "parts:", " ".join(written))

# window.T1 for the hero scene (Fig. 1): the five deliberate mistakes (lines 43 to 47 of t1_types.py, each numbered in its comment)
# and what each of the three recorded runs said about each line. Parsed from the outputs, never typed in.
def t1_data():
    src = (CODE / "t1_types.py").read_text().split("\n")
    rows = []
    for i, l in enumerate(src, 1):
        m = re.search(r"#\s*(\d)\.\s*(.+)$", l)
        if m: rows.append({"n": int(m.group(1)), "line": i, "code": l[:l.index("#")].rstrip(), "note": m.group(2).strip()})
    my = {int(m.group(1)): m.group(2) for m in re.finditer(r"^t1_types\.py:(\d+): error: .*?\s\s(\[[\w-]+\])$", (OUT / "t1_mypy.txt").read_text(), re.M)}
    ty = {int(m.group(1)): m.group(2) for m in re.finditer(r"^t1_types\.py:(\d+):\d+: (error\[[\w-]+\])", (OUT / "t1_ty.txt").read_text(), re.M)}
    py = (OUT / "t1_types.txt").read_text()
    crash = int(re.search(r'File "t1_types\.py", line (\d+), in <module>', py).group(1))
    err = [l for l in py.strip().split("\n") if re.match(r"^\w+Error:", l)][-1]
    printed = py.split("Traceback")[0].strip().split("\n")
    summ = {"mypy": (OUT / "t1_mypy.txt").read_text().strip().split("\n")[-1], "ty": (OUT / "t1_ty.txt").read_text().strip().split("\n")[-1]}
    return {"rows": rows, "mypy": my, "ty": ty, "crash": crash, "err": err, "printed": printed, "summary": summ}

(PARTS / "22_js_rd_0t1.js").write_text("// written by src/pa/gen.py from pa/code/t1_types.py and pa/outputs/t1_*.txt; do not edit by hand\nwindow.T1="
    + json.dumps(t1_data(), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("{{", "{\\u007b") + ";\n")
print("wrote 22_js_rd_0t1.js")
