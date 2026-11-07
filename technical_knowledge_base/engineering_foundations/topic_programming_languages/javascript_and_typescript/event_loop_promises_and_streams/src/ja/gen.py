"""Expand this page's templates (tpl/*.html, tpl/*.js) into ../parts/, inlining the real code and the
recorded outputs. Copied from the language page's src/ja/gen.py (2026-10-26) and trimmed: class names carry the el- prefix,
the drills and start-up data went with their sections. Markers in templates:
  [[run:NAME]]        code/NAME(.mjs|.cjs|.sh) plus outputs/NAME.txt
  [[code:NAME]]       code only (NAME may carry a line range: NAME@12-30)
  [[out:FILE|label]]  outputs/FILE.txt with a caption line above
  [[predict:NAME]]    code, then the output hidden behind "Predict, then reveal"
  [[outc:NAME]]       the output in the core, the code beside it in a closed block
  [[json:KEY]]        (in .js templates) a dataset from DATA below
  [[sx:PROGRAM]]      the step list (ol.sx) of one event-loop program, from loop_steps.json (added 2026-11-07)
Run with any Python 3.10+: python3 gen.py"""
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CODE, OUT, TPL, PARTS = HERE / "code", HERE / "outputs", HERE / "tpl", HERE.parent / "parts"
RUNTIME = "Node 24.21.0"

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
    return f'<div class="el-file">{esc(str(p.relative_to(CODE)))}</div><pre class="el-code">{highlight(src, lang)}</pre>'

def out_name(name):
    name = name.split("@")[0]
    if name.startswith("loop/"):
        return "loop_" + name[5:]
    if name.startswith("q/"):
        return "q_" + name[2:]
    return name

def out_block(name, label):
    txt = (OUT / f"{name}.txt").read_text().rstrip("\n")
    return f'<div class="el-olab">{esc(label)}</div><pre class="el-out" data-el-src="{esc(name)}.txt">{esc(txt)}</pre>'

def expand(text):
    def rep(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "run":
            return f'<div class="el-snip">{code_block(arg)}{out_block(out_name(arg), "real output, " + RUNTIME)}</div>'
        if kind == "code":
            return f'<div class="el-snip">{code_block(arg)}</div>'
        if kind == "out":
            name, _, label = arg.partition("|")
            return f'<div class="el-snip">{out_block(name, label or "real output, " + RUNTIME)}</div>'
        if kind == "outc":
            p, _ = code_of(arg)
            return (f'<div class="el-snip">{out_block(out_name(arg), "real output of " + p.name + ", " + RUNTIME)}'
                    f'<details class="mist"><summary>The code: {esc(p.name)}</summary><div class="b">{code_block(arg)}</div></details></div>')
        if kind == "predict":
            return (f'<div class="el-snip el-pred">{code_block(arg)}<details><summary>Predict the output, then reveal</summary>'
                    f'{out_block(out_name(arg), "real output, " + RUNTIME)}</details></div>')
        if kind == "sx":
            items = "".join(f"<li><b>{st['h']}.</b> {st['cap']}</li>" for st in STEPS[arg])
            return f'<ol class="sx" id="{sx_id(arg)}" data-m="{arg}"{"" if arg == FIRST else " hidden"}>{items}</ol>'
        if kind == "json":
            return json.dumps(DATA[arg], separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
        raise ValueError(kind)
    return re.sub(r"\[\[(run|code|out|predict|outc|json|sx):([^\]]+)\]\]", rep, text)

def loops():
    res = {}
    for p in sorted((CODE / "loop").iterdir()):
        res[p.name] = {"code": p.read_text().rstrip("\n"), "out": (OUT / f"loop_{p.name}.txt").read_text().rstrip("\n").split("\n")}
    return res

# the stepper's explained steps (2026-11-07): a bold title and the explanation go to the step lists in the Reading tab,
# the rest (lines lit, call stack, each queue, the line printed) to window.EL.steps for the 3D stage
STEPS = json.loads((HERE / "loop_steps.json").read_text())
FIRST = next(iter(STEPS))
def sx_id(name):
    return "sx-lp-" + re.sub(r"[^a-z0-9]+", "-", name.lower())

DATA = {
    "steps": {k: [{x: v for x, v in st.items() if x not in ("h", "cap")} for st in v] for k, v in STEPS.items()},
    "bp": json.loads((OUT / "k1_backpressure.json").read_text()),
    "i4_trace": json.loads((OUT / "i4_trace.json").read_text()),
    "j1_sse": json.loads((OUT / "j1_sse.json").read_text()),
    "loops": loops(),
}

if __name__ == "__main__":
    written = []
    for f in sorted(TPL.iterdir()):
        if f.suffix not in (".html", ".js"): continue
        (PARTS / f.name).write_text(expand(f.read_text()))
        written.append(f.name)
    print("wrote", len(written), "parts:", " ".join(written))
