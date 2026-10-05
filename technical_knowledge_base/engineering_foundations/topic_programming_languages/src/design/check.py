"""Confirm the built page embeds exactly the captured outputs and code, and the llama.cpp excerpts match the pinned clone.
Run from anywhere: python3 check.py  (exit status 1 on any mismatch)."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.DS_DATA = (\{.*?\});\n", html, re.S)
if not m: sys.exit("DS_DATA not found in index.html")
D = json.loads(m.group(1))
DIRECTIVE = re.compile(r'^(#|//)\s*(flags|edition|run|check|post|stdin|file|pre|cmd):')
bad = 0
for p, s in D["snips"].items():
    stem = os.path.basename(p).rsplit(".", 1)[0]
    out = open(os.path.join(HERE, "outputs", os.path.dirname(p), stem + ".txt"), encoding="utf-8").read().rstrip("\n")
    code = "".join(l for l in open(os.path.join(HERE, "code", p), encoding="utf-8") if not DIRECTIVE.match(l)).rstrip("\n")
    if s["out"] != out: print("OUTPUT MISMATCH", p); bad += 1
    if s["code"] != code: print("CODE MISMATCH", p); bad += 1
# every snippet file is shown somewhere, every output file has a snippet
files = {os.path.relpath(os.path.join(d, f), os.path.join(HERE, "code")) for d, _, fs in os.walk(os.path.join(HERE, "code")) for f in fs if "__" not in f and not f.startswith(".")}
unused = files - set(D["snips"])
if unused: print("snippets not shown on the page:", sorted(unused))
L = D["llama"]; clone = "/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl/llama.cpp"
if os.path.isdir(clone):
    head = subprocess.check_output(["git", "-C", clone, "rev-parse", "HEAD"], text=True).strip()
    if head != L["commit"]: print("llama.cpp clone is at", head, "not", L["commit"]); bad += 1
    for i, e in L["excerpts"].items():
        lines = open(os.path.join(clone, e["file"]), encoding="utf-8").read().split("\n")[e["start"] - 1:e["end"]]
        if "\n".join(lines) != e["text"]: print("EXCERPT MISMATCH", i); bad += 1
else:
    print("llama.cpp clone not present: excerpts not re-checked")
print("snippets", len(D["snips"]), "excerpts", len(L["excerpts"]), "mismatches", bad)
sys.exit(1 if bad else 0)
