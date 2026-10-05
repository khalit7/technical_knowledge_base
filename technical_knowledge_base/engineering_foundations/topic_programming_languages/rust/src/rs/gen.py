#!/usr/bin/env python3
"""Generate Part 3's parts/ files from tpl/ templates, code/ sources and out/ recordings.

Template directives (replaced by HTML):
  [[code:PATH]] or [[code:PATH:A-B]]   source file under code/ (lines A..B), highlighted
  [[out:NAME]]                          recorded output out/NAME.txt (long ones folded)
  [[pr:NAME|QUESTION]]                  predict, then reveal: the output hidden in a <details>
  [[g:NAME|REGEX]]                      first regex group found in out/NAME.txt (inline value)
  [[b:KEY]]                             a number from the benchmark summary (see bench_value)
Also writes parts/54_js_rs_data.js (async traces, benchmark summary, CLI sessions).
Run: python3 src/rs/gen.py   (then sh src/build.sh)
"""
import html, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PARTS = HERE.parent / "parts"
OUT, CODE, TPL, BENCH = HERE / "out", HERE / "code", HERE / "tpl", HERE / "bench" / "results"
PYPA = HERE.parent.parent.parent / "python" / "src" / "pa" / "outputs"

KW = set("""as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod
move mut pub ref return self Self static struct super trait true type unsafe use where while def import from
lambda None True False try except yield class with raise finally FROM AS COPY RUN ENV EXPOSE ENTRYPOINT USER WORKDIR""".split())
TOK = re.compile(r'(?P<c>//[^\n]*|#(?![\[!])[^\n]*)|(?P<a>#!?\[[^\]\n]*\])|(?P<s>"(?:\\.|[^"\\\n])*"|b\'(?:\\.|[^\'\\\n])\'|\'(?:\\.|[^\'\\\n])\'(?!\w))|(?P<l>\'[a-z_]\w*)|(?P<w>[A-Za-z_]\w*!?)|(?P<o>[\s\S])', re.M)


def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")


def hl(src, lang="rs"):
    out = []
    py = lang in ("py", "docker", "toml", "sh")
    for m in TOK.finditer(src):
        k, t = m.lastgroup, m.group()
        if k == "c":
            if (t.startswith("#") and not py) or (t.startswith("//") and py):
                out.append(esc(t))
            else:
                out.append('<span class="rs-cm">' + esc(t) + "</span>")
        elif k == "a" and lang == "rs":
            out.append('<span class="rs-at">' + esc(t) + "</span>")
        elif k == "s":
            out.append('<span class="rs-st">' + esc(t) + "</span>")
        elif k == "l" and lang == "rs":
            out.append('<span class="rs-lt">' + esc(t) + "</span>")
        elif k == "w" and t in KW and (lang != "docker" or t.isupper()):
            out.append('<span class="rs-kw">' + t + "</span>")
        elif k == "w" and t.endswith("!") and lang == "rs":
            out.append('<span class="rs-mac">' + esc(t) + "</span>")
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


def lang_of(path):
    if path.endswith(".py"):
        return "py"
    if "Dockerfile" in path:
        return "docker"
    if path.endswith(".toml"):
        return "toml"
    if path.endswith(".mjs"):
        return "js"
    return "rs"


def code(spec):
    parts = spec.split(":")
    path, rng = parts[0], parts[1] if len(parts) > 1 else None
    lines = src(path).split("\n")
    first = 1
    if rng:
        a, b = map(int, rng.split("-"))
        lines, first = lines[a - 1:b], a
    body = hl("\n".join(lines), lang_of(path))
    fn = path + (f" (lines {first} to {first + len(lines) - 1})" if rng else "")
    return f'<div class="rs-src"><div class="rs-fn">{esc(fn)}</div><pre class="rs-code">{body}</pre></div>'


def out(name, fold=24):
    t = read_out(name).rstrip("\n")
    lines = t.split("\n")
    cmd = ""
    if lines[0].startswith("$ "):
        cmd, lines = lines[0], lines[1:]
    bad = any(re.match(r"\[exit [1-9]", l) for l in lines) or any(l.startswith("error") for l in lines)
    cls = " rs-bad" if bad else ""
    cmd_html = f'<span class="rs-cmd">{esc(cmd)}</span>\n' if cmd else ""
    if len(lines) > fold:
        a, b = lines[:fold - 4], lines[fold - 4:]
        return (f'<pre class="rs-out{cls}" data-rs-out="{name}">\n{cmd_html}{esc(chr(10).join(a))}</pre>'
                f'<details class="rs-more"><summary>show the remaining {len(b)} lines</summary>'
                f'<pre class="rs-out{cls}" data-rs-rest="{name}">\n{esc(chr(10).join(b))}</pre></details>')
    return f'<pre class="rs-out{cls}" data-rs-out="{name}">\n{cmd_html}{esc(chr(10).join(lines))}</pre>'


def pr(arg):
    name, q = arg.split("|", 1)
    return f'<details class="rs-pr"><summary><b>Predict, then reveal:</b> {q}</summary>{out(name)}</details>'


def grab(arg):
    name, rx = arg.split("|", 1)
    m = re.search(rx, read_out(name), re.M)
    if not m:
        sys.exit(f"no match for {rx} in {name}")
    return esc(m.group(1))


def bench_summary():
    a = json.loads((BENCH / "bench_run1.json").read_text())
    b = json.loads((BENCH / "bench_run2_B.json").read_text())
    return a, b


def bench_value(key):
    """cfg|load|field|fmt, e.g. [[b:axum-4|health|rps|,.0f]] ; for experiment B: B|inline|p50_ms|.2f"""
    a, b = bench_summary()
    cfg, load, field, fmt = key.split("|")
    if cfg == "B":
        rows = [r for r in b["summary"] if r["mode"] == load]
    else:
        rows = [r for r in a["summary"] if r["cfg"] == cfg and r["load"] == load]
    if not rows:
        sys.exit("no bench row " + key)
    return format(rows[0][field], fmt)


DIRECT = re.compile(r"\[\[(code|out|pr|g|b):(.+?)\]\]", re.S)


def render(text):
    return DIRECT.sub(lambda m: {"code": code, "out": out, "pr": pr, "g": grab, "b": bench_value}[m.group(1)](m.group(2)), text)


def data():
    d = {}
    # Async traces: tokio (this part), Python (the Python page's Part 1 recording), Node (this part).
    d["trace_rs"] = json.loads((OUT / "a2_trace.json").read_text())
    d["trace_py"] = json.loads((OUT / "cmp_trace_py.json").read_text())
    d["trace_js"] = json.loads((OUT / "cmp_trace_js.json").read_text())
    a, b = bench_summary()
    d["bench"] = {"env": a["env"], "summary": a["summary"], "runs": a["runs"]}
    d["benchB"] = {"env": b["env"], "summary": b["summary"], "runs": b["runs"]}
    import cli_sessions
    d["cli"] = cli_sessions.sessions(read_out)
    return d


def slim(x):
    """Round floats and drop fields the page does not use, to keep the page small."""
    if isinstance(x, float):
        return round(x, 2)
    if isinstance(x, list):
        return [slim(v) for v in x]
    if isinstance(x, dict):
        return {k: slim(v) for k, v in x.items() if k not in ("codes", "p90_ms", "bg_codes", "result", "ok_frac", "processes")}
    return x


def main():
    for f in sorted(TPL.glob("*.html")):
        (PARTS / f.name).write_text(render(f.read_text()))
    (PARTS / "54_js_rs_data.js").write_text(
        "// ---- Part 3 (rs) data: generated by src/rs/gen.py from src/rs/out and src/rs/bench/results ----\n"
        "window.RS_DATA=" + json.dumps(slim(data()), separators=(",", ":"), ensure_ascii=False) + ";\n")
    old = PARTS / "50_tab_rs_read.html"
    if old.exists():
        old.unlink()
    print("gen.py: wrote", len(list(TPL.glob('*.html'))), "templates and 54_js_rs_data.js")


if __name__ == "__main__":
    sys.path.insert(0, str(HERE))
    main()
