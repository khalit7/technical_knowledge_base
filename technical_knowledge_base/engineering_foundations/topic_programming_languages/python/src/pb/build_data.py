"""Collect every recorded output in out/ (and the snippet sources) into ../parts/40_js_pb_data.js as window.PB.
Nothing here is typed by hand except features.py (descriptions with sources); outputs are copied verbatim."""
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from features import FEATURES
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
        elif blocks and "note" in blocks[-1] and line.strip():  # text printed after a note (a file listing)
            blocks[-1].setdefault("text", []).append(line)
    for b in blocks:
        if "text" in b: b["text"] = "\n".join(b["text"])
    return blocks


def src(path):
    return open(path).read().rstrip("\n")


PB = {}
v = json.load(open(O("versions.json")))
PB["ver"] = {"interpreters": v["interpreters"], "features": [
    {"id": f[0], "v": f[1], "kind": f[2], "title": f[3], "pep": f[4], "url": f[5], "note": f[6],
     "src": src(os.path.join(HERE, "versions", f[0] + ".py")), "runs": v["runs"][f[0]]} for f in FEATURES]}
t = json.load(open(O("types.json")))
PB["types"] = {"versions": t["versions"], "cases": [
    {"id": k, "src": src(os.path.join(HERE, "types", k + ".py")), "runs": r} for k, r in t["runs"].items()]}
for name in ("uv", "ruff", "pytest", "cext", "interp_mistake", "interp_numpy"):
    PB[name] = transcript(O(name + ".txt"))
PB["ruff_src"] = src(os.path.join(HERE, "ruff", "chatlog.py"))
PB["pytest_src"] = {p: src(os.path.join(HERE, "pytest", "proj", p)) for p in ("tests/test_tokens.py", "tests/conftest.py", "tests/test_fails.py")}
PB["pytest_cfg"] = src(os.path.join(HERE, "pytest", "proj", "pyproject.toml"))
PB["cext_src"] = {"oldext.c": src(os.path.join(HERE, "ft", "cext", "oldext.c")), "check.py": src(os.path.join(HERE, "ft", "cext", "check.py"))}
PB["ft"] = {}
for k in ("PY314", "PY314T", "PY315", "PY315T"):
    d = json.load(open(O(f"ft_{k}.json")))
    PB["ft"][k] = {x: d[x] for x in ("python", "free_threaded", "gil_enabled", "lines", "expected_tokens", "switch_interval_s",
                                     "loadavg_start", "loadavg_end", "scale", "trace4", "race_nolock", "race_lock")}
PB["jit"] = json.load(open(O("jit.json")))
PB["interp"] = {k: json.load(open(O(f"interp_{k}.json"))) for k in ("PY314", "PY315")}
lz = json.load(open(O("lazy.json")))
PB["lazy"] = lz
PB["lazy_src"] = {"eager": src(os.path.join(HERE, "lazy", "cli_eager.py"))}
PB["wheels"] = json.load(open(O("wheels.json")))
for k in ("typespeed", "install_speed"):
    if os.path.exists(O(k + ".json")):
        PB[k] = json.load(open(O(k + ".json")))
orj = open(O("orjson_ft.txt")).read().split("\n")
PB["orjson"] = [re.sub(r"\(/[^)]*\)|\(~/pl[^)]*\)", "(...)", l) for l in orj if re.search(r"Failed to build|does not support free-threaded|^\s*cause: The build backend", l)]
PB["ft_src"] = src(os.path.join(HERE, "ft", "tokwork.py"))
js = "window.PB=" + json.dumps(PB, ensure_ascii=False, separators=(",", ":")) + ";\n"
js = js.replace("</", "<\\/").replace("{{", "{\\u007b")  # keep build.sh from reading C braces as links
open(os.path.join(HERE, "..", "parts", "40_js_pb_data.js"), "w").write(js)
print("40_js_pb_data.js", len(js.encode()), "bytes")
