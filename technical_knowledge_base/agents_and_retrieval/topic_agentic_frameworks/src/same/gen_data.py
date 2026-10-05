"""Generate parts/31_js_same_0data.js from the redacted recordings (data/runs.json) and the agent code (code/).
Run from anywhere: python3 gen_data.py. Writes window.SAME = {...}."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(HERE, "..", "parts")
runs = json.load(open(os.path.join(HERE, "data", "runs.json")))

# One entry per agent: file, label, which lines play which role (1-based, inclusive ranges).
# Roles: model (model client and agent setup), tools (tool definitions), state, loop, stop, extra
# (what only this framework has: typed result, retry, tracing switch, MCP wrapper).
AGENTS = [
    {"id": "a1", "name": "Plain loop", "file": "a1_plain.py", "lib": "openai 3.24.0 (client only)",
     "roles": {"model": [[6, 7]], "tools": [[9, 21]], "state": [[23, 24]], "loop": [[26, 30], [34, 40]], "stop": [[27, 27], [31, 33]]}},
    {"id": "a2", "name": "LangGraph", "file": "a2_langgraph.py", "lib": "langgraph 1.2.13, langchain-openai 1.6.7",
     "roles": {"tools": [[10, 31]], "model": [[32, 33]], "state": [[35, 37], [46, 46]], "loop": [[39, 45], [49, 49]], "stop": [[44, 44], [48, 48]]}},
    {"id": "a3", "name": "Pydantic AI", "file": "a3_pydantic_ai.py", "lib": "pydantic-ai-slim 2.54.0",
     "roles": {"model": [[10, 11], [17, 18]], "extra": [[13, 15], [35, 36]], "tools": [[20, 34], [37, 42]], "loop": [[44, 44]], "stop": [[45, 45]]}},
    {"id": "a4", "name": "OpenAI Agents SDK", "file": "a4_openai_agents.py", "lib": "openai-agents 0.23.1",
     "roles": {"extra": [[7, 7]], "model": [[8, 9], [32, 33]], "tools": [[11, 30]], "loop": [[35, 35]], "stop": [[36, 36]]}},
    {"id": "a5", "name": "smolagents", "file": "a5_smolagents.py", "lib": "smolagents 1.26.0",
     "roles": {"model": [[6, 7]], "tools": [[9, 38]], "extra": [[40, 41]], "loop": [[42, 42], [44, 44]], "stop": [[43, 43]]}},
    {"id": "a6", "name": "Claude Agent SDK", "file": "a6_claude_sdk.py", "lib": "claude-agent-sdk 0.2.163 (Claude Code 2.1.286)",
     "roles": {"extra": [[6, 7], [27, 27], [31, 33]], "tools": [[9, 25]], "model": [[28, 30], [34, 34]], "loop": [[36, 38], [40, 43]], "stop": [[34, 34]]}},
]


def loc(src):
    """Lines of code: non-blank, not a comment-only line, not part of a docstring."""
    n, in_doc = 0, False
    for line in src.splitlines():
        s = line.strip()
        if not s:
            continue
        if in_doc:
            if s.endswith('"""'):
                in_doc = False
            continue
        if s.startswith('"""'):
            if not (len(s) > 3 and s.endswith('"""')):
                in_doc = True
            continue
        if s.startswith("#") or s.endswith("# recording only, for the page"):
            continue
        n += 1
    return n


CUT = 1200  # characters per message on the page; runs.json keeps up to 2,500


def short(t):
    t = dict(t)
    for f in ("text",):
        if isinstance(t.get(f), str) and len(t[f]) > CUT:
            t[f] = t[f][:CUT] + f"\n[... {len(t[f]) - CUT} more characters in src/same/data/runs.json]"
    if t.get("calls"):
        t["calls"] = [dict(c, args=c["args"][:CUT] + ("..." if len(c["args"]) > CUT else "")) for c in t["calls"]]
    return t


def slim(r, keep_transcript):
    o = {k: r[k] for k in r if k not in ("transcript",)}
    if keep_transcript:
        o["transcript"] = [short(t) for t in r["transcript"]]
    return o


SHOW = {"a1_1", "a2_1", "a3_1", "a4_1", "a5_1", "a5b_1", "a1_t07_3", "a6_haiku_1", "a6_sonnet_1"}
FIRST = {"a1_1", "a2_1", "a3_1", "a4_1", "a5_1"}
out = {"agents": [], "local": {}, "claude": {}, "tools_impl": open(os.path.join(HERE, "code", "tools_impl.py")).read()}
for a in AGENTS:
    src = open(os.path.join(HERE, "code", a["file"])).read()
    out["agents"].append(dict(a, src=src, loc=loc(src)))
for k, r in runs["local"].items():
    out["local"][k] = slim(r, k in SHOW)
    if k not in FIRST:
        out["local"][k].pop("first", None)
for k, r in runs["claude"].items():
    out["claude"][k] = slim(r, k in SHOW)
for f in ("a6b_claude_preset.py", "a6c_claude_builtin.py"):
    out["variant_" + f[:3]] = open(os.path.join(HERE, "code", f)).read()
out["first_tokens"] = {k.replace("_1", "") + "_1": v for k, v in json.load(open(os.path.join(HERE, "data", "first_tokens.json"))).items()}
out["emdash_replaced"] = runs.get("emdash_replaced", 0)
cz = json.load(open(os.path.join(HERE, "causes.json")))
out["causes"], out["causes_summary"] = cz["runs"], cz.get("summary", "")
missing = [k for k in list(runs["local"]) + list(runs["claude"]) if k not in cz["runs"] and not (
    (runs["local"].get(k) or runs["claude"].get(k))["meta"]["tests_pass"] and
    ((runs["local"].get(k) or {}).get("meta", {}).get("rc") == 0 or (runs["claude"].get(k) or {}).get("result", {}).get("subtype") == "success"))]
if missing:
    print("WARNING: runs without a cause:", missing)
js = "window.SAME=" + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n"
open(os.path.join(PARTS, "31_js_same_0data.js"), "w").write(js)
print("wrote", len(js), "bytes;", "loc:", {a["id"]: loc(open(os.path.join(HERE, "code", a["file"])).read()) for a in AGENTS})
