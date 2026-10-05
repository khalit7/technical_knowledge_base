"""Turn code/, outputs/ and the content_*.py notes into ../parts/31_js_data.js (window.RO_DATA).
Checks every note anchor, every referenced file and every output exist."""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from content_program import PROGRAM  # noqa: E402
from content_tasks import TASKS  # noqa: E402
from content_mistakes import MISTAKES, VERDICTS  # noqa: E402

LANGS = ["python", "cpp", "rust", "ts"]
sources, outputs = {}, {}


def link(html: str) -> str:
    return re.sub(r"\[\[([^|\]]+)\|(t-[\w-]+)\]\]", r'<a href="#" data-tab="\2">\1</a>', html)


def src(path: str) -> str:
    if path not in sources:
        sources[path] = open(os.path.join(HERE, "code", path), encoding="utf-8").read()
    return sources[path]


def out(lang: str, name: str) -> str:
    key = f"{lang}/{name}"
    if key not in outputs:
        outputs[key] = open(os.path.join(HERE, "outputs", lang, name + ".txt"), encoding="utf-8").read()
    return key


def chunks(path: str, notes):
    lines = src(path).rstrip("\n").split("\n")
    starts, i = [], 0
    for anchor, _ in notes:
        while i < len(lines) and anchor not in lines[i]:
            i += 1
        if i == len(lines):
            sys.exit(f"anchor not found in order: {path}: {anchor!r}")
        starts.append(i)
        i += 1
    starts[0] = 0
    res = []
    for k, (anchor, note) in enumerate(notes):
        end = starts[k + 1] if k + 1 < len(notes) else len(lines)
        res.append([starts[k], end, link(note)])
    return res


def task(t):
    d = {k: t[k] for k in ("id", "title", "axes", "q")}
    d["habit"] = link(t["habit"])
    d["langs"] = {}
    for lang in LANGS:
        L = t["langs"][lang]
        src(L["file"])
        e = {"file": L["file"], "chunks": chunks(L["file"], L["notes"]), "outs": [out(lang, o) for o in L["outs"]]}
        if L.get("extra"):
            src(L["extra"])
            e["extra"] = L["extra"]
        d["langs"][lang] = e
    return d


data = {
    "program": task(PROGRAM),
    "tasks": [task(t) for t in TASKS],
    "verdicts": VERDICTS,
    "mistakes": [],
}
for m in MISTAKES:
    d = {k: m[k] for k in ("id", "title", "axes", "q")}
    d["habit"] = link(m["habit"])
    d["cells"] = {}
    for lang in LANGS:
        c = m["cells"][lang]
        if c["file"]:
            src(c["file"])
        d["cells"][lang] = {"file": c["file"], "verdict": c["verdict"], "also": c.get("also"),
                            "note": link(c["note"]), "outs": [out(lang, o) for o in c["outs"]]}
    data["mistakes"].append(d)
data["sources"] = sources
data["outputs"] = outputs
data["versions"] = open(os.path.join(HERE, "outputs", "versions.txt")).read()
data["input"] = {"lines": 2000, "bytes": os.path.getsize(os.path.join(HERE, "data", "chat.jsonl")),
                 "sample": open(os.path.join(HERE, "data", "chat.jsonl"), encoding="utf-8").read().split("\n")[:3]}
js = "window.RO_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("{{", "{\\u007b") + ";\n"
assert "—" not in js, "em dash in rosetta data"
dst = os.path.join(HERE, "..", "parts", "31_js_data.js")
open(dst, "w", encoding="utf-8").write(js)
print(f"wrote {dst}: {len(js.encode())} bytes, {len(sources)} sources, {len(outputs)} outputs")
