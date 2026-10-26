"""Collect the recorded outputs this page shows (free-threading, subinterpreters, the C-extension and orjson transcripts,
the wheel survey) from out/ into ../parts/22_js_cg_0pb.js as window.PB.
Copied from the language page's src/pb/build_data.py (2026-10-26) and trimmed to this page; outputs are copied verbatim."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
O = lambda *p: os.path.join(HERE, "out", *p)


def transcript(path):
    """Split a rec.sh transcript into blocks: {"note"} or {"cmd", "out", "rc"}."""
    blocks, cur = [], None
    for line in open(path).read().split("\n"):
        if line.startswith("$ "):
            cur = {"cmd": line[2:], "out": [], "rc": None}; blocks.append(cur)
        elif line.startswith("[exit ") and cur is not None and cur["rc"] is None:
            cur["rc"] = int(line[6:-1]); cur["out"] = "\n".join(cur["out"]).rstrip("\n"); cur = None
        elif line.startswith("## ") and cur is None:
            blocks.append({"note": line[3:]})
        elif cur is not None:
            cur["out"].append(line)
        elif blocks and "note" in blocks[-1] and line.strip():
            blocks[-1].setdefault("text", []).append(line)
    for b in blocks:
        if "text" in b: b["text"] = "\n".join(b["text"])
    return blocks


def src(path):
    return open(path).read().rstrip("\n")


PB = {}
for name in ("cext", "interp_mistake", "interp_numpy"):
    PB[name] = transcript(O(name + ".txt"))
PB["ft"] = {}
for k in ("PY314", "PY314T", "PY315", "PY315T"):
    d = json.load(open(O(f"ft_{k}.json")))
    PB["ft"][k] = {x: d[x] for x in ("python", "free_threaded", "gil_enabled", "lines", "expected_tokens", "switch_interval_s",
                                     "loadavg_start", "loadavg_end", "scale", "trace4", "race_nolock", "race_lock")}
PB["interp"] = {k: json.load(open(O(f"interp_{k}.json"))) for k in ("PY314", "PY315")}
PB["wheels"] = json.load(open(O("wheels.json")))
orj = open(O("orjson_ft.txt")).read().split("\n")
PB["orjson"] = [re.sub(r"\(/[^)]*\)|\(~/pl[^)]*\)", "(...)", l) for l in orj if re.search(r"Failed to build|does not support free-threaded|^\s*cause: The build backend", l)]
js = "// written by src/pb/build_data.py from src/pb/out; do not edit by hand\nwindow.PB=" + json.dumps(PB, ensure_ascii=False, separators=(",", ":")) + ";\n"
js = js.replace("</", "<\\/").replace("{{", "{\\u007b")  # keep build.sh from reading C braces as links
open(os.path.join(HERE, "..", "parts", "22_js_cg_0pb.js"), "w").write(js)
print("22_js_cg_0pb.js", len(js.encode()), "bytes")
