"""Expand this page's templates (tpl/*.html, tpl/*.js) into ../parts/, inlining the real code and
recorded outputs. Copied from the language page's src/pa/gen.py (2026-10-26): class names carry this page's prefix (ci-),
the datasets are trimmed to this page (the bytecode listings, the NumPy timings, the profile totals), and [[drill:TITLE]] shows one recorded drill behind a reveal. Markers in templates:
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
    return f'<div class="ci-file">{esc(name)}.py</div><pre class="ci-code">{highlight(src)}</pre>'

def out_block(name, label="output"):
    txt = (OUT / f"{name}.txt").read_text().rstrip("\n")
    return f'<div class="ci-olab">{esc(label)}</div><pre class="ci-out" data-src="{esc(name)}.txt">{esc(txt)}</pre>'

def expand(text):
    def rep(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "run":
            return f'<div class="ci-snip">{code_block(arg)}{out_block(arg.split("@")[0], "real output, Python 3.14.8")}</div>'
        if kind == "code":
            return f'<div class="ci-snip">{code_block(arg)}</div>'
        if kind == "out":
            name, _, label = arg.partition("|")
            return f'<div class="ci-snip">{out_block(name, label or "real output")}</div>'
        if kind == "predict":
            name = arg.split("@")[0]
            return (f'<div class="ci-snip ci-pred">{code_block(arg)}<details><summary>Predict the output, then reveal</summary>'
                    f'{out_block(name, "real output, Python 3.14.8")}</details></div>')
        if kind == "drill":
            d = next(x for x in json.loads((OUT / "q_drills.json").read_text()) if x["title"] == arg)
            return (f'<div class="ci-snip ci-pred"><div class="ci-file">{esc(d["title"])}</div><pre class="ci-code">{highlight(d["code"])}</pre>'
                    f'<details><summary>Predict the output, then reveal</summary><div class="ci-olab">real output, Python 3.14.8 (outputs/q_drills.json)</div>'
                    f'<pre class="ci-out">{esc(d["out"])}</pre></details></div>')
        if kind == "listings":
            return listings_table()
        if kind == "json":
            return json.dumps(DATA[arg], separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
        raise ValueError(kind)
    text = text.replace("[[listings]]", "[[listings:i1_dis]]")
    return re.sub(r"\[\[(run|code|out|predict|drill|json|listings):([^\]]+)\]\]", rep, text)

def listings_table():
    """The three dis listings of i1_dis.txt side by side; a cell that changed since the previous listing is marked, the loop rows too."""
    B = parse_dis()
    heads = ["before running", "after 1,000 ints", "after floats arrive"]
    h = ['<div class="tw"><table class="ci-lst"><thead><tr><th>line</th><th></th>' + "".join(f"<th>{esc(t)}</th>" for t in heads) + "<th>argument</th></tr></thead><tbody>"]
    loop = False
    for k, r in enumerate(B[0]["ins"]):
        if r[1] == "L1:": loop = True
        if r[1] == "L2:": loop = False
        cells = []
        for j, b in enumerate(B):
            ch = j > 0 and b["ins"][k][2] != B[j - 1]["ins"][k][2]
            cells.append(("<td class='ch'>" if ch else "<td>") + esc(b["ins"][k][2]) + "</td>")
        h.append(("<tr class='lp'>" if loop else "<tr>") + f"<td>{esc(r[0])}</td><td>{esc(r[1])}</td>" + "".join(cells) + f"<td>{esc(r[3])}</td></tr>")
    h.append('</tbody></table></div><p class="ci-src">Real output of <code>code/i1_dis.py</code>, <code>dis.dis(total, adaptive=True)</code> on Python 3.14.8; the argument column is the same in all three.</p>')
    return "".join(h)

def parse_dis():
    blocks, cur = [], None
    for line in (OUT / "i1_dis.txt").read_text().splitlines():
        if line.startswith("---"):
            cur = {"title": line.strip("- "), "ins": []}; blocks.append(cur)
        elif line.strip():
            m = re.match(r"^\s*(\d+)?\s*(L\d+:)?\s+([A-Z_]+)\s*(.*)$", line)
            if m: cur["ins"].append([m.group(1) or "", m.group(2) or "", m.group(3), m.group(4).strip()])
    return blocks

def parse_np():
    rows = []
    for line in (OUT / "p2_numpy.txt").read_text().splitlines():
        m = re.match(r"^\s*([\d,]+)\s+([\d.]+)us\s+([\d.]+)us\s+([\d.]+)us\s+([\d.]+)us", line)
        if m: rows.append([int(m.group(1).replace(",", ""))] + [float(m.group(i)) for i in range(2, 6)])
    return rows

def parse_prof():
    t = (OUT / "p1_profile.txt").read_text()
    return {"profiled_s": float(re.search(r"function calls in ([\d.]+) seconds", t).group(1)),
            "slow_ms": int(re.search(r"p1_slow: (\d+) ms", t).group(1)), "fast_ms": int(re.search(r"p1_fast: (\d+) ms", t).group(1))}

def parse_sizes():
    """i3_sizes.txt: [[repr, type, bytes], ...] and the list growth [(length, bytes), ...]"""
    rows, growth = [], []
    for line in (OUT / "i3_sizes.txt").read_text().splitlines():
        m = re.match(r"^\s*(.+?)\s+(int|float|str|bytes|tuple|list|dict|set)\s+(\d+) bytes$", line)
        if m: rows.append([m.group(1), m.group(2), int(m.group(3))])
        if line.startswith("list size jumps"):
            growth = [[int(a), int(b)] for a, b in re.findall(r"\((\d+), (\d+)\)", line)]
    return {"rows": rows, "growth": growth}

def parse_rc():
    """i2_refcount.txt: the lines as printed, in order"""
    return [l for l in (OUT / "i2_refcount.txt").read_text().splitlines() if l.strip()]

DATA = {
    "sizes": parse_sizes(),
    "rc": parse_rc(),
    "i1_dis": parse_dis(),
    "np": parse_np(),
    "prof": parse_prof(),
}

written = []
for f in sorted(TPL.iterdir()):
    if f.suffix not in (".html", ".js"): continue
    (PARTS / f.name).write_text(expand(f.read_text()))
    written.append(f.name)
print("wrote", len(written), "parts:", " ".join(written))
