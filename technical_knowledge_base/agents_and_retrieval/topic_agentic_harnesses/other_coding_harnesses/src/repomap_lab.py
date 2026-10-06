"""Aider 0.86.2's own RepoMap run on a real repository (mini-swe-agent v2.4.6 src/), three scenarios,
four token budgets. Captures the file graph and PageRank result by wrapping networkx.pagerank.
Output: repomap_lab.json (no absolute paths)."""
import json, os, re, sys
MSG = "Make DockerEnvironment retry when docker exec times out"
from pathlib import Path
import networkx as nx
from aider.repomap import RepoMap
from aider.io import InputOutput
from aider.models import Model

ROOT = Path(sys.argv[1]).resolve()          # repo root
SUB = "src/minisweagent"
cap = {}
_orig = nx.pagerank


def wrapped(G, **kw):
    r = _orig(G, **kw)
    cap["G"] = G; cap["ranked"] = r; cap["pers"] = kw.get("personalization")
    return r


nx.pagerank = wrapped

files = sorted(str(p) for p in (ROOT / SUB).rglob("*.py") if "__pycache__" not in p.parts and "/tests/" not in str(p))
model = Model("gpt-4o")  # only for its tokenizer (token_count); no call is made
io = InputOutput(pretty=False, yes=True, fancy_input=False)
rel = lambda f: os.path.relpath(f, ROOT)
SCEN = {
    "cold": dict(chat=[], idents=set(), label="No file in the chat, nothing mentioned"),
    "chat": dict(chat=[str(ROOT / SUB / "agents/default.py")], idents=set(), label="agents/default.py added to the chat"),
    "chat_ident": dict(chat=[str(ROOT / SUB / "agents/default.py")], idents=set(re.split(r"\W+", MSG)),
                       label="default.py in the chat, and the message: " + MSG),
}
out = {"repo": "SWE-agent/mini-swe-agent", "tag": "v2.4.6", "sub": SUB, "n_files": len(files), "aider": "0.86.2",
       "tokenizer": "aider Model('gpt-4o').token_count", "scenarios": {}}
for key, s in SCEN.items():
    res = {"label": s["label"], "message": MSG if key == "chat_ident" else "", "chat": [rel(f) for f in s["chat"]], "idents": sorted(s["idents"]), "maps": {}}
    for budget in (256, 512, 1024, 2048):
        rmap = RepoMap(map_tokens=budget, root=str(ROOT), main_model=model, io=io, verbose=False, refresh="always")
        others = [f for f in files if f not in s["chat"]]
        mf = {rel(f) for f in files if len(Path(f).stem) >= 5 and any(len(i) >= 5 and i.lower() == Path(f).stem.lower() for i in s["idents"])}
        res["mentioned_fnames"] = sorted(mf)
        text = rmap.get_ranked_tags_map(s["chat"], others, budget, mf, s["idents"]) or ""
        res["maps"][str(budget)] = {"tokens": model.token_count(text), "chars": len(text),
                                    "files_shown": sorted({l.rstrip(":") for l in text.splitlines() if l and not l.startswith((" ", "\t", "│", "⋮")) and l.endswith(":")}),
                                    "text": text}
    G, ranked = cap["G"], cap["ranked"]
    res["rank"] = {n: round(v, 5) for n, v in sorted(ranked.items(), key=lambda x: -x[1])}
    agg = {}
    for a, b, d in G.edges(data=True):
        if a == b:
            continue
        k = (a, b)
        agg[k] = agg.get(k, 0) + d["weight"]
    res["edges"] = [[a, b, round(w, 3)] for (a, b), w in sorted(agg.items(), key=lambda x: -x[1])]
    res["personalization"] = {k: round(v, 4) for k, v in (cap["pers"] or {}).items()}
    out["scenarios"][key] = res
    print(key, {b: m["tokens"] for b, m in res["maps"].items()}, list(res["rank"].items())[:3])
s = json.dumps(out, indent=1)
assert str(ROOT) not in s
Path(sys.argv[2]).write_text(s)
