"""Expand the essentials page's templates (tpl/*.html) into ../parts/, inlining the real code and the recorded outputs,
and drawing the static bar figures from the recorded outputs. Markers in templates:
  [[run:NAME]]         code/NAME(.mjs|.sh), open, then outputs/NAME.txt
  [[outc:NAME|label]]  outputs/NAME.txt open, the script behind it in a closed block
  [[out:FILE|label]]   outputs/FILE.txt with a caption line above
  [[code:NAME]]        code only
  [[gen:KIND]]         a static figure from the outputs: startup, memory, heartbeat, install
Run with any Python 3.10+: python3 gen.py"""
import html, re
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
    for m in (SHTOK if lang == "sh" else TOK).finditer(src):
        kind = m.lastgroup
        if kind == "id" and m.group() not in KW:
            continue
        out.append(esc(src[pos:m.start()]))
        cls = {"cm": "cm", "st": "st", "id": "kw", "pr": "kw"}[kind]
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


def code_block(name):
    p = find(name)
    lang = "sh" if p.suffix == ".sh" else "js"
    return f'<div class="je-file">{esc(p.name)}</div><pre class="je-code">{highlight(p.read_text().rstrip(chr(10)), lang)}</pre>'


def out_block(name, label):
    txt = (OUT / f"{name}.txt").read_text().rstrip("\n")
    return f'<div class="je-olab">{esc(label)}</div><pre class="je-out" data-je-src="{esc(name)}.txt">{esc(txt)}</pre>'


def bars(rows, unit, note, fmt="{:.1f}"):
    """rows: (label, value, colour var, value text or None). Static horizontal bars, scaled to the largest value."""
    mx = max(r[1] for r in rows)
    body = "".join(
        f'<div class="row"><div class="nm">{esc(r[0])}</div><div class="track"><div class="fill" style="width:{100 * r[1] / mx:.1f}%;background:var({r[2]})"></div></div>'
        f'<div class="val">{esc(r[3] if r[3] else fmt.format(r[1]) + " " + unit)}</div></div>' for r in rows)
    return f'<div class="je-bars">{body}</div><div class="je-src">{note}</div>'


def gen(kind):
    if kind == "startup":
        rows = []
        for line in (OUT / "m2_startup.txt").read_text().splitlines():
            m = re.match(r"^(.+?)\s+median\s+([\d.]+) ms", line)
            if m:
                n = m.group(1).strip()
                rows.append((n, float(m.group(2)), "--c3" if n.startswith("node") else "--dim" if "python" in n else "--c1", None))
        return bars(rows, "ms", "Median wall time to start an almost empty script and exit; hyperfine, 30 runs after 3 warm-ups each. Bars drawn from the output below.")
    if kind == "memory":
        t = (OUT / "m3_memory.txt").read_text()
        rss = {f: int(re.search(rf"{f} run 1: [\d.]+ s, peak RSS (\d+) MB", t).group(1)) for f in ("k3_count_tokens", "k4_whole")}
        secs = {f: re.search(rf"{f} run 1: ([\d.]+) s", t).group(1) for f in ("k3_count_tokens", "k4_whole")}
        return bars([("streamed line by line (k3)", rss["k3_count_tokens"], "--c3", f'{rss["k3_count_tokens"]} MB, {secs["k3_count_tokens"]} s'),
                     ("whole file read first (k4)", rss["k4_whole"], "--bad", f'{rss["k4_whole"]} MB, {secs["k4_whole"]} s')], "MB",
                    "Peak resident memory, first of three runs each, on the same 38.8 MB file; the time is the wall time of that run. Drawn from the output below.")
    if kind == "heartbeat":
        rows = []
        for line in (OUT / "k6_workers.txt").read_text().splitlines():
            m = re.match(r"^(.+?):\s+result \d+\s+took (\d+) ms\s+heartbeats (\d+)\s+worst gap (\d+) ms", line)
            if m:
                rows.append((m.group(1).strip(), int(m.group(4)), "--bad" if "main" in m.group(1) else "--c3",
                             f"{m.group(4)} ms worst gap, {m.group(3)} beats"))
        return bars(rows, "ms", "The longest time the 10 ms heartbeat timer had to wait, while the same prime count (result 216816) ran. Drawn from the output below.")
    if kind == "install":
        rows = []
        for line in (OUT / "l2_pnpm.txt").read_text().splitlines():
            m = re.match(r"^(\w+): lockfile (\S+), top-level entries in node_modules (\d+), '.*' median ([\d.]+) s", line)
            if m:
                rows.append((f"{m.group(1)} ({m.group(2)})", float(m.group(4)), "--c3" if m.group(1) == "npm" else "--c1",
                             f"{m.group(4)} s, {m.group(3)} top-level"))
        return bars(rows, "s", "Reinstall from the lockfile into an empty node_modules, warm caches (what CI does): hyperfine median of 5 runs, and the folders a program can see at the top of node_modules. Drawn from the output below.")
    raise ValueError(kind)


def expand(text):
    def rep(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "run":
            return f'<div class="je-snip">{code_block(arg)}{out_block(arg, "real output, " + RUNTIME)}</div>'
        if kind == "outc":
            name, _, label = arg.partition("|")
            return (f'<div class="je-snip">{out_block(name, label or "real output, " + RUNTIME)}'
                    f'<details class="je-more"><summary>The script: {esc(find(name).name)}</summary>{code_block(name)}</details></div>')
        if kind == "out":
            name, _, label = arg.partition("|")
            return f'<div class="je-snip">{out_block(name, label or "real output, " + RUNTIME)}</div>'
        if kind == "code":
            return f'<div class="je-snip">{code_block(arg)}</div>'
        if kind == "gen":
            return gen(arg)
        raise ValueError(kind)
    return re.sub(r"\[\[(run|outc|out|code|gen):([^\]]+)\]\]", rep, text)


if __name__ == "__main__":
    written = []
    for f in sorted(TPL.iterdir()):
        if f.suffix in (".html", ".js"):
            (PARTS / f.name).write_text(expand(f.read_text()))
            written.append(f.name)
    print("wrote", len(written), "parts:", " ".join(written))
