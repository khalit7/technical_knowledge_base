"""Expand the templates of "TypeScript: LLM apps and agents" (tpl/*.html, tpl/*.js) into ../parts/, inlining the real
code and the recorded outputs (outputs/, written by run_all.sh). Markers in templates:
  [[run:NAME]]            code/NAME(.ts|.sh) plus outputs/NAME.txt
  [[code:NAME]]           code only (NAME may carry a line range: NAME@12-30)
  [[out:NAME|label]]      outputs/NAME.txt with a caption
  [[predict:NAME|q]]      code, the question q, then the output hidden behind "Predict, then reveal"
  [[outpredict:NAME|q]]   the question q, then outputs/NAME.txt hidden (for code shown just above)
  [[outc:NAME]]           the output in the core, the code beside it in a closed block
  [[predictc:NAME|q]]     the question q, the output behind "Reveal", the code in a closed block
  [[outd:NAME|summary]]   the output in a closed block titled summary
  [[coded:SPEC|summary]]  code only, in a closed block titled summary
  [[gen:NAME]]            a static figure or table built from outputs/ by the function FIG[NAME] below
  [[json:KEY]]            (in .js templates) a dataset from DATA below
Run with any Python 3.10+: python3 gen.py"""
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CODE, OUT, TPL, PARTS = HERE / "code", HERE / "outputs", HERE / "tpl", HERE.parent / "parts"
RUNTIME = "Node 24.21.0, model answers from the local mock (synthetic)"

def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")

KW = set("""async await break case catch class const continue default delete do else export extends finally for
from function if import in instanceof let new of return static super switch this throw try typeof var void while
yield true false null undefined type interface as satisfies keyof readonly""".split())
TOK = re.compile(r"""(?P<cm>//[^\n]*|/\*.*?\*/)|(?P<st>"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(?P<id>[A-Za-z_$][\w$]*)""", re.S)
SHTOK = re.compile(r"""(?P<cm>(?:^|(?<=\s))#[^\n]*)|(?P<st>"(?:\\.|[^"\\])*"|'[^']*')""", re.M)

def highlight(src, lang):
    out, pos = [], 0
    rx = SHTOK if lang == "sh" else TOK
    for m in rx.finditer(src):
        kind = m.lastgroup
        if kind == "id" and m.group() not in KW:
            continue
        out.append(esc(src[pos:m.start()]))
        cls = {"cm": "cm", "st": "st", "id": "kw"}[kind]
        out.append("\n".join(f'<span class="tl-{cls}">{esc(p)}</span>' if p else "" for p in m.group().split("\n")))
        pos = m.end()
    out.append(esc(src[pos:]))
    return "".join(out)

def find(name):
    for ext in ("", ".ts", ".sh"):
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
    return p, src, rng

def code_block(spec):
    p, src, rng = code_of(spec)
    lang = "sh" if p.suffix == ".sh" else "ts"
    lab = p.name + (f", lines {rng}" if rng else "")
    return f'<div class="tl-file">{esc(lab)}</div><pre class="tl-code">{highlight(src, lang)}</pre>'

def out_block(name, label):
    txt = (OUT / f"{name}.txt").read_text().rstrip("\n")
    return f'<div class="tl-olab">{esc(label)}</div><pre class="tl-out" data-tl-src="{esc(name)}.txt">{esc(txt)}</pre>'

def expand(text):
    def rep(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "run":
            return f'<div class="tl-snip">{code_block(arg)}{out_block(arg.split("@")[0], "real output, " + RUNTIME)}</div>'
        if kind == "code":
            return f'<div class="tl-snip">{code_block(arg)}</div>'
        if kind == "out":
            name, _, label = arg.partition("|")
            return f'<div class="tl-snip">{out_block(name, label or "real output, " + RUNTIME)}</div>'
        if kind in ("predict", "outpredict"):
            name, _, q = arg.partition("|")
            code = code_block(name) if kind == "predict" else ""
            return (f'<div class="tl-snip tl-pred">{code}<div class="tl-q"><b>Predict:</b> {q}</div><details><summary>Reveal the real output</summary>'
                    f'{out_block(name.split("@")[0], "real output, " + RUNTIME)}</details></div>')
        if kind == "outc":
            p, _, _ = code_of(arg)
            return (f'<div class="tl-snip">{out_block(arg.split("@")[0], "real output of " + p.name + ", " + RUNTIME)}'
                    f'<details class="dp"><summary>The code: {esc(p.name)}</summary><div class="b">{code_block(arg)}</div></details></div>')
        if kind == "predictc":
            name, _, q = arg.partition("|")
            p, _, _ = code_of(name)
            return (f'<div class="tl-snip tl-pred"><div class="tl-q"><b>Predict:</b> {q}</div><details><summary>Reveal the real output</summary>'
                    f'{out_block(name.split("@")[0], "real output of " + p.name + ", " + RUNTIME)}</details>'
                    f'<details class="dp"><summary>The code: {esc(p.name)}</summary><div class="b">{code_block(name)}</div></details></div>')
        if kind == "outd":
            name, _, summ = arg.partition("|")
            return (f'<details class="dp"><summary>{summ}</summary><div class="b">'
                    f'{out_block(name, "real output of " + find(name).name + ", " + RUNTIME)}</div></details>')
        if kind == "coded":
            spec, _, summ = arg.partition("|")
            return f'<details class="dp"><summary>{summ}</summary><div class="b">{code_block(spec)}</div></details>'
        if kind == "gen":
            return FIG[arg]()
        if kind == "json":
            return json.dumps(DATA[arg], separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
        raise ValueError(kind)
    return re.sub(r"\[\[(run|code|out|predict|outpredict|outc|predictc|outd|coded|gen|json):([^\]]+)\]\]", rep, text)

def frames(sse):
    res = []
    for f in sse.split("\n\n"):
        if not f.strip(): continue
        ev = re.search(r"^event: (.*)$", f, re.M).group(1)
        res.append({"raw": f, "ev": ev, "data": json.loads(re.search(r"^data: (.*)$", f, re.M).group(1))})
    return res

def agent():
    d = json.loads((OUT / "c1_agent_loop.json").read_text())
    runs = []
    for r in d["runs"]:
        runs.append({"scenario": r["scenario"], "outcome": r["outcome"], "answer": r["answer"], "tot": r["tot"],
                     "steps": [{k: s[k] for k in ("step", "sent", "content", "stop", "results", "wall", "tot")} | {"usage": {"in": s["usage"]["input_tokens"], "out": s["usage"]["output_tokens"]}} for s in r["steps"]]})
    return {"task": d["task"], "price": d["price"], "tools": [t["name"] for t in d["tools"]], "runs": runs}

def cancel():
    txt = (OUT / "h1_serve.txt").read_text()
    res = {}
    for part in txt.split("--- ")[1:]:
        key = "with" if part.startswith("with") else "without"
        lines = [l.strip() for l in part.splitlines()[1:] if l.strip()]
        ev = [{"ms": int(re.match(r"(\d+) ms", l).group(1)), "who": l.split("  ", 1)[1].split(":")[0], "text": l.split("  ", 1)[1]} for l in lines]
        t0 = ev[0]["ms"]
        for e in ev: e["ms"] -= t0
        m = re.search(r"after (\d+) of (\d+) events", part) or re.search(r"sent all (\d+) events", part)
        sent = int(m.group(1)); total = int(m.group(2)) if m.lastindex == 2 else sent
        res[key] = {"events": ev, "sent": sent, "total": total}
    return res

def backpressure():
    rows = []
    for l in (OUT / "h2_backpressure.txt").read_text().splitlines()[1:]:
        m = re.match(r"(.+?)\s*: write\(\) returned false\s+(\d+) times, peak queued in the server\s+(\d+) KiB, (\d+) ms", l)
        rows.append({"mode": m.group(1).strip(), "falses": int(m.group(2)), "peak": int(m.group(3)), "ms": int(m.group(4))})
    return rows

def mcp():
    stdio = json.loads((OUT / "g2_mcp_client.json").read_text())
    http = json.loads((OUT / "g3_mcp_http.json").read_text())
    return {"stdio": stdio, "http": http["http"], "httpLog": http["log"]}

DATA = {
    "stream": {"anthropic": frames(json.loads((OUT / "b1_stream.json").read_text())["anthropic"]),
               "tool": frames(json.loads((OUT / "b1_stream.json").read_text())["tool"]),
               "openai": frames(json.loads((OUT / "b2_stream_openai.json").read_text())["openai"])},
    "cancel": cancel(),
}
# agent() and mcp() above shaped the data of the language page's Agent loop stepper and MCP message flow tabs, which this
# page dropped (the harness root's Loop lab and the MCP page own those); they are kept for the static figures below.

def bar(name, value, vmax, label, colour="var(--acc)", hl=False):
    pct = max(0.5, 100 * value / vmax)
    return (f'<div class="row{" hl" if hl else ""}"><span class="nm">{esc(name)}</span><span class="track">'
            f'<span class="fill" style="width:{pct:.1f}%;background:{colour}"></span></span><span class="val">{esc(label)}</span></div>')

def fig_agent_table():
    a = agent()
    teach = {"happy": "two lookups in one turn run together; both results go back in one message",
             "typo": "the tool error is a result (<code>is_error</code>); the model fixes its own file name",
             "timeout": "<code>AbortSignal.timeout(500)</code> turns a hung lookup into an error the model explains",
             "runaway": "<code>maxSteps</code> stops a model that never answers; the meter shows what nothing cost"}
    rows = []
    for r in a["runs"]:
        slow = max(s["wall"] for s in r["steps"])
        msgs = r["steps"][-1]["sent"] + (1 if r["outcome"] == "answered" else 2)
        rows.append(f'<tr><td><b>{r["scenario"]}</b></td><td>{esc(r["outcome"])}</td><td>{len(r["steps"])}</td><td>{msgs}</td>'
                    f'<td>{r["tot"]["in"]:,} / {r["tot"]["out"]:,}</td><td>{r["tot"]["usd"]:.5f}</td><td>{slow} ms</td><td>{teach[r["scenario"]]}</td></tr>')
    return ('<div class="tw"><table class="tl-t tl-runs"><thead><tr><th>Run</th><th>Outcome</th><th>Model calls</th><th>Messages</th>'
            '<th>Mock tokens in / out</th><th>US$ at list price</th><th>Slowest tool step</th><th>What it shows</th></tr></thead><tbody>'
            + "".join(rows) + '</tbody></table></div>')

def fig_retries():
    txt = (OUT / "a3_errors.txt").read_text()
    cases = []
    for part in txt.split("--- server answers ")[1:]:
        head, *lines = part.strip("\n").split("\n")
        ev = [(int(m.group(1)), m.group(2)) for l in lines if (m := re.match(r"\s*(\d+) ms\s+(.*)", l))]
        cases.append((head, ev))
    span = 1100
    out = ['<div class="tl-tl">']
    for head, ev in cases:
        t0 = ev[0][0]
        marks = []
        for t, what in ev:
            x = 100 * (t - t0) / span
            if what.startswith("server: attempt"):
                n = re.search(r"attempt (\d+)", what).group(1)
                marks.append(f'<span class="tl-mk" style="left:{x:.1f}%" title="{esc(what)}">{n}</span>')
            else:
                ok = "success" in what
                marks.append(f'<span class="tl-mk {"ok" if ok else "err"}" style="left:{x:.1f}%" title="{esc(what)}">{"ok" if ok else "err"}</span>')
        last = ev[-1]
        desc = esc(re.sub(r":.*", "", last[1].replace("client: ", "")))
        nreq = len([e for e in ev if e[1].startswith("server:")])
        out.append(f'<div class="tl-tlrow"><div class="tl-tlh">Server answers {esc(head.split(" (")[0])}{" (timeout 300 ms, maxRetries 1)" if "(" in head else ""}: '
                   f'{nreq} request{"s" if nreq > 1 else ""}; {desc}, {last[0] - t0} ms after the first</div>'
                   f'<div class="tl-track">{"".join(marks)}</div></div>')
    out.append(f'<div class="tl-axis"><span>0 ms</span><span>{span // 2} ms</span><span>{span} ms</span></div></div>')
    return "".join(out)

def fig_state():
    rows, tot = [], None
    for l in (OUT / "e1_state.txt").read_text().splitlines():
        m = re.match(r"turn (\d+): sent (\d+) messages, input\s+(\d+)", l)
        if m: rows.append((int(m.group(1)), int(m.group(2)), int(m.group(3))))
        m = re.search(r"billed over the 6 turns: (\d+)", l)
        if m: tot = int(m.group(1))
    vmax = max(r[2] for r in rows)
    return ('<div class="bars">' + "".join(bar(f"turn {t}: {n} messages", v, vmax, f"{v}") for t, n, v in rows)
            + f'</div><p class="small mute">Input tokens per request (the mock\'s estimate, characters / 4); the six requests together billed <b>{tot}</b>.</p>')

def fig_bp():
    rows = backpressure()
    vmax = max(r["peak"] for r in rows)
    return '<div class="bars">' + "".join(bar(r["mode"], r["peak"], vmax, f'{r["peak"]:,} KiB', "var(--bad)" if "ignores" in r["mode"] else "var(--good)") for r in rows) + '</div>'

FIG = {"agent_table": fig_agent_table, "retries": fig_retries, "state": fig_state, "bp": fig_bp}

if __name__ == "__main__":
    written = []
    for f in sorted(TPL.iterdir()):
        if f.suffix not in (".html", ".js"): continue
        (PARTS / f.name).write_text(expand(f.read_text()))
        written.append(f.name)
    print("wrote", len(written), "parts:", " ".join(written))
