"""Build parts/22_js_data.js (window.FLG) from src/data/*.json and src/recordings/e6/ only.
Run after redact.py. Every number the page shows is computed here or read from these files."""
import json, os, glob

HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda f: json.load(open(os.path.join(HERE, "data", f + ".json")))


def e1():
    out = []
    for g in D("e1_supersteps")["graphs"]:
        ev = g["events"]
        starts = {e["id"]: e for e in ev if e["kind"] == "start"}
        ends = {e["id"]: e for e in ev if e["kind"] == "end"}
        steps = []
        for c in g["checkpoints"]:
            tids = []
            for p in c["pending"]:
                if p["task"] not in tids:
                    tids.append(p["task"])
            tasks = []
            for t in tids:
                if t in starts:
                    s = starts[t]
                    tasks.append(dict(name=s["name"], triggers=s["triggers"], result=(ends.get(t) or {}).get("result")))
            hidden = [k for k in c["channel_versions"] if k.startswith(("branch:", "join:", "__"))]
            steps.append(dict(step=c["step"], source=c["source"], values=c["values"], versions=c["channel_versions"],
                              seen=c["versions_seen"], updated=c["updated"], tasks=tasks,
                              writes=[dict(task=next((s["name"] for i, s in starts.items() if i == p["task"]), p["task"]), channel=p["channel"], value=p["value"]) for p in c["pending"]]))
        out.append(dict(name=g["name"], note=g["note"], nodes=[n for n in g["nodes"] if n not in ("__start__", "__end__")],
                        edges=g["edges"], steps=steps, error=g["error"], get_state_error=g.get("get_state_error"), final=g["final"]))
    return out


def e6():
    rec = os.path.join(HERE, "recordings", "e6")
    runs = {}
    for sc in ("A", "B"):
        evs = [json.loads(l) for l in open(os.path.join(rec, f"{sc}_events.jsonl"))]
        names = {e["process"]: e["cmd"] for e in evs if e["what"] == "process_start"}
        for e in evs:
            e["process"] = names.get(e["process"], "driver")
        calls = []
        for e in evs:
            if e["what"] == "llm_start":
                calls.append(dict(node=e["node"], call=e["call"], process=e["process"], t0=e["t"], t1=None))
            if e["what"] == "llm_done":
                c = next(c for c in calls if c["call"] == e["call"])
                c.update(t1=e["t"], input=e["input"], output=None, cost=e["cost"])
        for c in calls:
            f = os.path.join(rec, f"{sc}_{c['call']}.jsonl")
            if c["t1"] is not None and os.path.exists(f):
                res = [json.loads(l) for l in open(f) if '"type": "result"' in l][-1]
                u = res["usage"]
                c.update(output=u["output_tokens"], thinking=(u.get("output_tokens_details") or {}).get("thinking_tokens", 0),
                         input=u["input_tokens"], text=res["result"], model=list(res["modelUsage"].keys())[0])
            del c["call"]
        kill = next(e["t"] for e in evs if e["what"] == "SIGKILL")
        nodes = [dict(t=e["t"], process=e["process"], node=e["node"], what=e["what"], **{k: e[k] for k in ("decision", "passed") if k in e}) for e in evs]
        runs[sc] = dict(durability="sync" if sc == "A" else "exit", kill=kill, calls=calls, events=nodes,
                        db=next({k: e[k] for k in ("checkpoints", "writes")} for e in evs if e["what"] == "db_rows"))
    init = json.loads(open(glob.glob(os.path.join(rec, "A_diagnose_top_words_*.jsonl"))[0]).readline())
    return dict(runs=runs, cli=init.get("claude_code_version"))


def main():
    data = dict(e1=e1(), e2=D("e2_crash"), e3=D("e3_storage"), e4=D("e4_interrupts"), e5=D("e5_more"), e6=e6())
    for key, f in (("e7", "e7_agent"), ("e7b", "e7_agent_check_path")):
        raw = D(f)
        x = dict(policy=raw.get("policy", "approve_all"), model=raw["model"], shape_plain=raw["shape_plain"], shape_mw=raw["shape_mw"],
                 final_tests_pass=raw["final_tests_pass"], final_core=raw["final_core"], messages=raw["messages_final"],
                 phases=[dict(secs=p["secs"], chunks=p["message_chunks"], next=p["next"], decisions=p.get("decisions"),
                              hitl=p.get("hitl_request")) for p in raw["phases"]], requests=[])
        for r in raw["requests"]:
            b = r["body"]
            x["requests"].append(dict(secs=round(r["t1"] - r["t0"], 2) if r.get("t1") else None, n_messages=len(b.get("messages", [])),
                                      tools=[t["function"]["name"] for t in b.get("tools", [])], stream=b.get("stream"), temperature=b.get("temperature")))
        x["first_body"] = raw["requests"][0]["body"]
        data[key] = x
    for k in ("e2", "e3", "e4", "e5"):
        data[k].pop("versions", None)
    data["versions"] = D("e1_supersteps")["versions"]
    js = "window.FLG=" + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n"
    open(os.path.join(HERE, "parts", "22_js_data.js"), "w").write(js)
    print("22_js_data.js", len(js), "bytes")


if __name__ == "__main__":
    main()
