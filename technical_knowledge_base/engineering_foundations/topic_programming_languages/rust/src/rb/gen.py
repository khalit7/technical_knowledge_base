"""Expand the Part 2 templates (tpl/*) into ../parts/, inlining real code and recorded outputs.
Markers:
  [[rs:ANCHOR]]           the ANCHOR region of ext/src/lib.rs
  [[file:PATH]]           a whole file (PATH relative to this folder; PATH@a-b for a line range)
  [[out:NAME|label]]      outputs/NAME (whole file name), under a caption
  [[predict:PATH|NAME]]   code, then outputs/NAME hidden behind "Predict, then reveal"
  [[data]]                (in .js templates) window.RB: every JSON result plus the root's numbers
Run with any Python 3.10+: python3 gen.py"""
import html
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT, TPL, PARTS = HERE / "outputs", HERE / "tpl", HERE.parent / "parts"
ROOT = HERE.parents[2]  # topic_programming_languages/

RS_KW = r"\b(fn|let|mut|pub|use|mod|struct|impl|for|in|if|else|match|return|move|self|Self|type|where|as|const|crate|super|loop|while|true|false)\b"
PY_KW = r"\b(def|class|import|from|for|in|if|else|elif|try|except|return|with|as|lambda|None|True|False|not|and|or|raise|assert|while|print)\b"


def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")


def hl(src, lang):
    """Light highlighting: comments dimmed, strings and keywords coloured (line by line, good enough for display)."""
    if lang not in ("rs", "py", "toml", "sh", "pyi", "yml"):
        return esc(src)
    cm = "//" if lang == "rs" else "#"
    out = []
    for line in src.split("\n"):
        code, comment = line, ""
        # find a comment start outside a string
        q = None
        for i, ch in enumerate(line):
            if q:
                if ch == q and line[i - 1] != "\\":
                    q = None
            elif ch in "\"'" and not (lang == "rs" and ch == "'"):
                q = ch
            elif line.startswith(cm, i) and not (lang == "rs" and line.startswith("///", i) and False):
                code, comment = line[:i], line[i:]
                break
        parts = re.split(r'("(?:[^"\\]|\\.)*")', code)
        seg = []
        for j, p in enumerate(parts):
            if j % 2:
                seg.append(f'<span class="rb-st">{esc(p)}</span>')
            else:
                e = esc(p)
                if lang in ("rs", "py", "pyi"):
                    e = re.sub(RS_KW if lang == "rs" else PY_KW, r'<span class="rb-kw">\1</span>', e)
                    if lang == "rs":
                        e = re.sub(r"(#\[[^\]]*\])", r'<span class="rb-at">\1</span>', e)
                seg.append(e)
        out.append("".join(seg) + (f'<span class="rb-cm">{esc(comment)}</span>' if comment else ""))
    return "\n".join(out)


def lang_of(path):
    return {".rs": "rs", ".py": "py", ".pyi": "pyi", ".toml": "toml", ".sh": "sh", ".yml": "yml", ".pyx": "py"}.get(Path(path).suffix, "txt")


def anchor(name):
    src = (HERE / "ext/src/lib.rs").read_text()
    m = re.search(rf"// ANCHOR: {name}\n(.*?)// ANCHOR_END: {name}\n", src, re.S)
    if not m:
        raise SystemExit(f"missing anchor {name}")
    return m.group(1).rstrip("\n")


def read_file(spec):
    path, _, rng = spec.partition("@")
    txt = (HERE / path).read_text().rstrip("\n")
    if rng:
        a, b = map(int, rng.split("-"))
        txt = "\n".join(txt.split("\n")[a - 1:b])
    return path, txt


def code_block(label, txt, lang):
    return f'<div class="rb-file">{esc(label)}</div><pre class="rb-code">{hl(txt, lang)}</pre>'


def out_block(name, label):
    txt = (OUT / name).read_text().rstrip("\n")
    return f'<div class="rb-olab">{esc(label)}</div><pre class="rb-out" data-rb-out="{esc(name)}">{esc(txt)}</pre>'


N = [0]


def expand(text):
    def rep(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "rs":
            return f'<div class="rb-snip">{code_block("ext/src/lib.rs", anchor(arg), "rs")}</div>'
        if kind == "file":
            path, txt = read_file(arg)
            return f'<div class="rb-snip">{code_block(Path(path).name if "/" in path else path, txt, lang_of(path))}</div>'
        if kind == "out":
            name, _, label = arg.partition("|")
            return f'<div class="rb-snip">{out_block(name, label or "real output")}</div>'
        if kind == "predict":
            spec, _, name = arg.partition("|")
            path, txt = read_file(spec)
            N[0] += 1
            pid = f"rb-pr{N[0]}"
            return (f'<div class="rb-snip">{code_block(Path(path).name, txt, lang_of(path))}'
                    f'<div class="rb-pq"><b>Predict, then reveal:</b> what does it print? Decide before you click.</div>'
                    f'<button class="rb-rv" data-for="{pid}" aria-expanded="false">Reveal the real output</button>'
                    f'<div id="{pid}" hidden>{out_block(name, "real output, CPython 3.14.8")}</div></div>')
        raise SystemExit(f"unknown marker {kind}")
    return re.sub(r"\[\[(rs|file|out|predict):([^\]]+)\]\]", rep, text)


def data():
    j = lambda n: json.loads((OUT / n).read_text())
    rs = json.loads((ROOT / "src/bench/results/summary.json").read_text())
    by = {v["id"]: v for v in rs["variants"]}
    cr = json.loads((ROOT / "src/bench/results/crossing.json").read_text())
    root = {k: by[k]["t_med"] for k in ["py314_loop", "py314_re", "rust", "pyrs_percall", "pyrs_batch", "pyrs_file", "pyrs_file4",
                                         "pypb_percall", "pynb_percall", "pypb_batch", "pynb_batch", "py314t_thr8"]}
    root["noop_pyo3"] = cr["noop"]["pyo3"]["median_ns"]
    root["noop_nanobind"] = cr["noop"]["nanobind"]["median_ns"]
    root["noop_pybind11"] = cr["noop"]["pybind11"]["median_ns"]
    root["msg_pyo3_batch"] = cr["per_message"]["pyo3_batch"]["median_ns"]
    root["msg_nanobind_batch"] = cr["per_message"]["nanobind_batch"]["median_ns"]
    root["msg_pybind11_batch"] = cr["per_message"]["pybind11_batch"]["median_ns"]
    abi = [json.loads(l) for l in (OUT / "c9_abi_cost.jsonl").read_text().splitlines() if l.strip()]
    d = {"convert": j("c3_convert.json"), "gil314": j("c7_gil_314.json"), "gil314t": j("c7_gil_314t.json"),
         "ladder": j("ladder_hf.json"), "phases": j("ladder_phases.json"), "alts": j("c8_alts.json"), "abi": abi, "root": root,
         "startup": j("startup.json")}
    for r in d["ladder"]:
        r.pop("times", None)
    return "window.RB=" + json.dumps(d, separators=(",", ":")) + ";"


def main():
    for f in sorted(TPL.iterdir()):
        if f.name.startswith("."):
            continue
        t = f.read_text()
        t = t.replace("[[data]]", data()) if f.suffix == ".js" else expand(t)
        (PARTS / f.name).write_text(t)
        print("wrote", f.name, len(t))


if __name__ == "__main__":
    main()
