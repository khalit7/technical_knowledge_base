"""Collect the recorded toolchain outputs in out/ (and the snippet sources) into ../parts/22_js_rd_0data.js as window.PB.
Copied from the Python essentials page's src/pb/build_data.py and trimmed to this page's data: the uv, ruff and pytest
transcripts, the type-checker cases and speed, the wheel survey and the install timing. Outputs are copied verbatim."""
import json, os
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
        elif blocks and "note" in blocks[-1] and line.strip():  # text printed after a note (a file listing)
            blocks[-1].setdefault("text", []).append(line)
    for b in blocks:
        if "text" in b: b["text"] = "\n".join(b["text"])
    return blocks


def src(path):
    return open(path).read().rstrip("\n")


def build():
    PB = {}
    t = json.load(open(O("types.json")))
    PB["types"] = {"versions": t["versions"], "cases": [
        {"id": k, "src": src(os.path.join(HERE, "types", k + ".py")), "runs": r} for k, r in t["runs"].items()]}
    for name in ("uv", "ruff", "pytest"):
        PB[name] = transcript(O(name + ".txt"))
    PB["ruff_src"] = src(os.path.join(HERE, "ruff", "chatlog.py"))
    PB["pytest_src"] = {p: src(os.path.join(HERE, "pytest", "proj", p)) for p in ("tests/test_tokens.py", "tests/conftest.py", "tests/test_fails.py")}
    PB["pytest_cfg"] = src(os.path.join(HERE, "pytest", "proj", "pyproject.toml"))
    PB["wheels"] = json.load(open(O("wheels.json")))
    for k in ("typespeed", "install_speed"):
        PB[k] = json.load(open(O(k + ".json")))
    js = "// written by src/pb/build_data.py from src/pb/out; do not edit by hand\nwindow.PB=" + json.dumps(PB, ensure_ascii=False, separators=(",", ":")) + ";\n"
    return js.replace("</", "<\\/").replace("{{", "{\\u007b")  # keep build.sh from reading braces as links


if __name__ == "__main__":
    js = build()
    open(os.path.join(HERE, "..", "parts", "22_js_rd_0data.js"), "w").write(js)
    print("22_js_rd_0data.js", len(js.encode()), "bytes")
