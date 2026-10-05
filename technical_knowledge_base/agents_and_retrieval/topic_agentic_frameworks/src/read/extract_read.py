"""Build parts/22_js_afread_data.js (window.AFREAD) from redacted recordings already in the repo:
src/orch/recordings (Orchestration lab, 5 Oct 2026) and src/read/recordings (this tab, 6 Oct 2026).
No numbers are typed by hand: every figure on the Reading tab that says MEASURED comes from here."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ORCH = os.path.join(HERE, "..", "orch", "recordings")
REC = os.path.join(HERE, "recordings")
OUT = os.path.join(HERE, "..", "parts", "22_js_afread_data.js")


def recs(path):
    return [json.loads(l) for l in open(path) if l.strip()]


def summ(run):
    s = json.load(open(os.path.join(ORCH, run, "summary.json")))
    llm = [e for e in s["events"] if e["kind"] in ("llm", "agent")]
    def tot(e):
        mu = e.get("modelUsage")
        if mu:
            m = list(mu.values())[0]
            return m["inputTokens"] + m["cacheCreationInputTokens"] + m["cacheReadInputTokens"] + m["outputTokens"]
        return e["input"] + e["cache_write"] + e["cache_read"] + e["output"]
    cost = sum((list(e["modelUsage"].values())[0]["costUSD"] if e.get("modelUsage") else e["cost"]) for e in llm)
    return dict(run=run, calls=len(llm), wall=round(s["wall"], 1), cost=round(cost, 4),
                tokens=sum(tot(e) for e in llm), hidden=sum(1 for h in s["hidden"] if h[1]),
                nhidden=len(s["hidden"]), passed=s["passed"],
                turns=sum(e.get("num_turns", 0) for e in llm))


runs = {r: summ(r) for r in ["chain", "route", "parallel", "orch", "evalopt", "agent", "multi"]}
base = json.load(open(os.path.join(ORCH, "baseline.json")))
runs["baseline_hidden"] = sum(1 for h in base["hidden"] if h[1])

# who chose each step: the chain (code) against the free agent (model), same input
chain = [dict(who=("model" if e["kind"] == "llm" else "code"), node=e["node"], what=e.get("label") or e["node"])
         for e in json.load(open(os.path.join(ORCH, "chain", "summary.json")))["events"]]
agent = []
for r in recs(os.path.join(ORCH, "agent", "agent.jsonl")):
    if r.get("type") == "assistant":
        for b in r["message"]["content"]:
            if b["type"] == "tool_use":
                i = b["input"]
                arg = i.get("command") or i.get("file_path") or i.get("pattern") or ""
                agent.append(dict(who="model", tool=b["name"], arg=arg.replace("/work/", "")))
    if r.get("type") == "user" and isinstance(r["message"]["content"], list):
        for b in r["message"]["content"]:
            if b.get("type") == "tool_result" and agent:
                c = b["content"] if isinstance(b["content"], str) else json.dumps(b["content"])
                agent[-1]["res"] = c.strip().splitlines()[0][:90] if c.strip() else ""
                agent[-1]["err"] = bool(b.get("is_error"))


def so(fn):
    R = recs(os.path.join(REC, fn))
    res = [r for r in R if r.get("type") == "result"][0]
    texts, tools, toolres = [], [], []
    for r in R:
        if r.get("type") == "assistant":
            for b in r["message"]["content"]:
                if b["type"] == "text":
                    texts.append(b["text"])
                if b["type"] == "tool_use":
                    tools.append(dict(name=b["name"], input=b["input"]))
        if r.get("type") == "user" and isinstance(r["message"]["content"], list):
            for b in r["message"]["content"]:
                if b.get("type") == "tool_result":
                    toolres.append(b["content"] if isinstance(b["content"], str) else json.dumps(b["content"]))
    raw = texts[-1] if texts else ""
    try:
        json.loads(raw); parse = "ok"
    except Exception as e:
        parse = str(e)
    u = res["usage"]
    init = [r for r in R if r.get("type") == "system" and r.get("subtype") == "init"][0]
    return dict(model=init["model"], tools=init["tools"], version=init["claude_code_version"],
                text=raw, alltext=texts, parse=parse, tool_calls=tools, tool_results=toolres,
                structured=res.get("structured_output"), turns=res["num_turns"], ms=res["duration_ms"],
                cost=res["total_cost_usd"], inp=u["input_tokens"] + u["cache_creation_input_tokens"] + u["cache_read_input_tokens"],
                out=u["output_tokens"], think=u.get("output_tokens_details", {}).get("thinking_tokens"),
                records=[(r.get("type"), r.get("subtype") or "") for r in R])


ev = [json.loads(l) for l in open(os.path.join(ORCH, "langgraph", "events.jsonl")) if l.strip()]
dg = [e for e in ev if e["what"] == "llm_done" and e["node"].startswith("diagnose")][0]
kill = [e for e in ev if e["what"] == "SIGKILL"][0]
pstart = [e for e in ev if e["node"] == "propose_fix" and e["what"] == "start" and e["t"] < kill["t"]][-1]
res = [e for e in ev if e.get("cmd") == "resume"][0]
first_after = [e for e in ev if e["what"] == "start" and e["t"] > res["t"]][0]
dur = dict(diag_secs=round(dg["secs"], 1), diag_cost=round(dg["cost"], 4), killed_after=round(kill["t"] - pstart["t"], 1),
           resumed_at=first_after["node"], llm_calls=sum(1 for e in ev if e["what"] == "llm_done"),
           review_starts=sum(1 for e in ev if e["node"] == "human_review" and e["what"] == "start"))
data = dict(runs=runs, dur=dur, chain=chain, agent=agent,
            soA=so("A_prompt_json.jsonl"), soB=so("B_json_schema.jsonl"),
            schema=json.load(open(os.path.join(REC, "schema.json"))))
txt = "// generated by src/read/extract_read.py from redacted recordings; do not edit\nwindow.AFREAD=" + json.dumps(data, ensure_ascii=False) + ";\n"
open(OUT, "w").write(txt)
print(json.dumps(runs, indent=0)[:1500]); print(len(txt), "bytes")
