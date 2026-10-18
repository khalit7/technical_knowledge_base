"""fill.py: resolve the [[...]] placeholders of the built page from page_text.json, zero/out/steps.json and
zero/out/code_refs.json.
  [[f:key|fmt]]  a fact (i int, f0..f4 decimals, e scientific, pct0/pct1, s string)
  [[snip:N]]     step N of gpt_zero.py with its real line numbers; [[snip:train]] the training loop of train_zero.py
  [[out:key]]    the printed output of a step's test (steps.py)
  [[ref:key]]    <code>repo file:line</code> of a pattern located by zero/code_refs.py
  [[tbl:key]] [[err:key]] [[name]]  HTML blocks and error messages from page_text.json
Exits non-zero on any unresolved placeholder unless --allow-pending (then writes a visible PENDING marker).
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PT = json.load(open(os.path.join(HERE, "page_text.json")))
ST = {s["key"]: s for s in json.load(open(os.path.join(HERE, "zero", "out", "steps.json")))["steps"]}
CR = json.load(open(os.path.join(HERE, "zero", "out", "code_refs.json")))
F, T = PT["facts"], PT["text"]
ALLOW = "--allow-pending" in sys.argv
missing = []


def fmt(v, spec):
    if spec == "s":
        return html.escape(str(v))
    if spec == "i":
        return f"{int(round(v)):,}"
    if spec.startswith("pct"):
        return f"{100 * v:,.{int(spec[3:])}f}%"
    if spec == "e":
        m, ex = f"{v:.1e}".split("e")
        return f"{m} &times; 10<sup>{int(ex)}</sup>"
    if spec.startswith("f"):
        return f"{v:,.{int(spec[1:])}f}"
    raise ValueError(spec)


def code_block(lines, start, title):
    w = len(str(start + len(lines)))
    return f"# {title}, lines {start} to {start + len(lines) - 1}\n" + "\n".join(f"{start + n:>{w}}  {html.escape(l)}" for n, l in enumerate(lines))


def snip(k):
    if k == "train":
        src = open(os.path.join(HERE, "train", "train_zero.py")).read().split("\n")
        a = next(i for i, l in enumerate(src) if "for step in range(a.steps):" in l)
        b = next(i for i in range(a, len(src)) if "opt.step(); opt.zero_grad" in src[i])
        return code_block(src[a:b + 1], a + 1, "the_transformer_from_zero/src/train/train_zero.py")
    s = ST_BY_N[int(k)]
    return code_block(s["code"]["lines"], s["code"]["start"], "the_transformer_from_zero/src/zero/gpt_zero.py")


ST_BY_N = {i + 1: s for i, s in enumerate(ST.values())}


def rep(m):
    body = m.group(1)
    try:
        if body.startswith("f:"):
            k, spec = body[2:].split("|")
            return fmt(F[k], spec)
        if body.startswith("snip:"):
            return snip(body[5:])
        if body.startswith("out:"):
            return html.escape("\n".join(ST[body[4:]]["out"]))
        if body.startswith("ref:"):
            r = CR["refs"][body[4:]]
            f = r["file"].split("/")[-1] if r["repo"] == "transformers" and "loss" not in r["file"] else r["file"].replace("src/transformers/", "")
            ln = f"{r['line']}" if r["end"] == r["line"] else f"{r['line']} to {r['end']}"
            return f"<code>{r['repo']} {f}:{ln}</code>"
        if body.startswith("tbl:"):
            return T[body[4:]]
        if body.startswith("err:"):
            return T["err"][body[4:]]
        return T[body]
    except (KeyError, StopIteration):
        missing.append(body)
        return f'<span class="unc">PENDING {html.escape(body)}</span>'


path = sys.argv[1]
s = open(path).read()
s = re.sub(r"\[\[([^\[\]]+)\]\]", rep, s)


def link(m):  # the same {{text|url}} expansion as build.sh's perl pass, for text inserted by placeholders
    t, u = m.group(1), m.group(2)
    if re.fullmatch(r"#(t-[\w-]+)", u):
        return f'<a href="#" data-tab="{u[1:]}">{t}</a>'
    u = re.sub(r"^n:", "https://app.notion.com/p/", u)
    return f'<a href="{u}" target="_blank" rel="noopener noreferrer">{t}</a>'


s = re.sub(r"\{\{([^|{}]+)\|([^{}]+)\}\}", link, s)
open(path, "w").write(s)
if missing:
    print("unresolved:", sorted(set(missing)))
    if not ALLOW:
        sys.exit(1)
