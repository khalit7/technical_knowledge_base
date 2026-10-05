"""Expand the Part 1 templates (tpl/*.html, tpl/*.js) into ../parts/, inlining the real code and
recorded outputs. Markers in templates:
  [[run:NAME]]        code/NAME.py plus outputs/NAME.txt
  [[code:NAME]]       code only (NAME may carry a line range: NAME@12-30)
  [[out:FILE]]        outputs/FILE (a .txt name without extension), with a caption line above
  [[predict:NAME]]    code, then the output hidden behind "Predict, then reveal"
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
        if kind == "json":
            return json.dumps(DATA[arg], separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
        raise ValueError(kind)
    return re.sub(r"\[\[(run|code|out|predict|json):([^\]]+)\]\]", rep, text)

def parse_g2():
    txt = (OUT / "g2_order.txt").read_text().splitlines()
    res, cur = {}, None
    for line in txt:
        if line.startswith("eager"): cur = res.setdefault("eager", [])
        elif line.startswith("lazy"): cur = res.setdefault("lazy", [])
        elif line.startswith("  "):
            parts = line.split()
            cur.append([parts[0], " ".join(parts[1:])])
        elif line.startswith("total"): pass
    return res

def parse_dis():
    blocks, cur = [], None
    for line in (OUT / "i1_dis.txt").read_text().splitlines():
        if line.startswith("---"):
            cur = {"title": line.strip("- "), "ins": []}; blocks.append(cur)
        elif line.strip():
            m = re.match(r"^\s*(\d+)?\s*(L\d+:)?\s+([A-Z_]+)\s*(.*)$", line)
            if m: cur["ins"].append([m.group(1) or "", m.group(2) or "", m.group(3), m.group(4).strip()])
    return blocks

def parse_k1(name):
    rows = []
    for line in (OUT / f"{name}.txt").read_text().splitlines():
        m = re.match(r"^(CPU|I/O) (.+?)\s+([\d.]+) s$", line)
        if m: rows.append([m.group(1), m.group(2), float(m.group(3))])
    return rows

def parse_np():
    rows = []
    for line in (OUT / "p2_numpy.txt").read_text().splitlines():
        m = re.match(r"^\s*([\d,]+)\s+([\d.]+)us\s+([\d.]+)us\s+([\d.]+)us\s+([\d.]+)us", line)
        if m: rows.append([int(m.group(1).replace(",", ""))] + [float(m.group(i)) for i in range(2, 6)])
    return rows

DATA = {
    "k1": {"gil": parse_k1("k1_gil"), "ft": parse_k1("k1_gil_314t")},
    "np": parse_np(),
    "n7_graph": json.loads((OUT / "n7_graph.json").read_text()),
    "d2_dispatch": json.loads((OUT / "d2_dispatch.json").read_text()),
    "a2_trace": json.loads((OUT / "a2_trace.json").read_text()),
    "q_drills": json.loads((OUT / "q_drills.json").read_text()),
    "g2_order": parse_g2(),
    "i1_dis": parse_dis(),
}

written = []
for f in sorted(TPL.iterdir()):
    if f.suffix not in (".html", ".js"): continue
    (PARTS / f.name).write_text(expand(f.read_text()))
    written.append(f.name)
print("wrote", len(written), "parts:", " ".join(written))
