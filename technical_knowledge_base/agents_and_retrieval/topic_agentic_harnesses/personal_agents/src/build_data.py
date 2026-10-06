#!/usr/bin/env python3
"""Build parts/30_js_data.js from the redacted recordings in src/recordings/ (written by redact.py).

Each recording is one run of demo/resident.py (copied in src/demo/) over the fake world, under one
configuration: model, gate on/off, mid-run message mode, history mode. The page gets, per recording,
the configuration, each agent run with its steps (model text kept up to the ACTION line, the action,
the gate's class and decision, the result), token and cost totals, and the final state of the fake world.
Also computes the summary numbers quoted in the Reading tab (memory grading, steering outcomes)."""
import glob, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
OUT = os.path.join(HERE, "parts", "30_js_data.js")


def clip(s, n):
    s = s or ""
    return s if len(s) <= n else s[: n - 3] + "..."


def load(p):
    R = [json.loads(l) for l in open(p)]
    label = os.path.basename(p)[:-6]
    runs, cur, pend_ret = [], None, []
    cfg, final = {}, {}
    tin = tout = 0
    cost = 0.0
    models = set()
    for r in R:
        k = r["kind"]
        if k == "run_start":
            cfg = {"gate": r["gate"], "steer": r["steer"], "history": r["history"]}
            cur = {"id": r["run"], "kind": r["trigger"]["kind"], "at": r["trigger"]["at"],
                   "text": r["trigger"]["text"], "origin": r["origin"], "steps": [], "ret": pend_ret}
            pend_ret = []
            runs.append(cur)
        elif k == "retrieved":
            # the gateway retrieves before it logs run_start: attach to the next run
            pend_ret = [f"{d}: {t}" for d, t in r["rows"]]
        elif k == "incoming":
            cur["steps"].append({"msg": r["text"], "mode": r["mode"], "at_step": r["step"]})
        elif k == "queued":
            pass
        elif k == "model":
            u = r["usage"]
            tin += u.get("in") or 0
            tout += u.get("out") or 0
            cost += (r.get("call") or {}).get("total_cost_usd") or u.get("cost_usd") or 0
            models.add(u.get("model"))
            cur["steps"].append({"n": r["step"], "say": clip(r["text"], 600), "drop": r["dropped_chars"],
                                 "tin": u.get("in"), "tout": u.get("out")})
        elif k == "action":
            s = cur["steps"][-1]
            s.update(tool=r["tool"], args={a: clip(str(v), 300) for a, v in r["args"].items()},
                     cls=r["cls"], dec=r["decision"], why=r["why"], res=clip(r["result"], 260),
                     flat=bool(r.get("flattened")))
        elif k == "run_end":
            cur["end"] = r["reason"]
            ms = [s for s in cur["steps"] if "n" in s]
            if r["reason"] == "finish" and ms and not ms[-1].get("tool"):
                ms[-1]["fin"] = 1
            cur["summary"] = clip(r.get("summary") or "", 400)
        elif k == "final_state":
            final = r["state"]
    m = re.match(r"(s\d)_(haiku|sonnet|local)_(.*)", label)
    return label, {"scen": m.group(1), "model": m.group(2), "variant": m.group(3), "cfg": cfg,
                   "model_ids": sorted(x for x in models if x), "runs": runs, "tin": tin, "tout": tout,
                   "cost": round(cost, 6), "calls": sum(1 for r in R if r["kind"] == "model"),
                   "final": final}


def grade_memory(rec):
    """s2: correct when the advice to Sam says the car was already serviced (or not to book).
    Graded on the last notify_owner text, by keyword, and checked by hand (see README)."""
    texts = [s.get("args", {}).get("text", "") for r in rec["runs"] for s in r["steps"]
             if s.get("tool") == "notify_owner"]
    t = " ".join(texts).lower()
    ok = bool(re.search(r"already (been )?serviced|already had the service|was (already )?serviced|serviced (it )?on|3 sept|sept(ember)? 3|not due", t))
    searched = any(s.get("tool") == "search_history" for r in rec["runs"] for s in r["steps"])
    return {"ok": ok, "searched": searched, "advice": clip(texts[-1] if texts else "", 400)}


def main():
    data = {}
    for p in sorted(glob.glob(os.path.join(REC, "*.jsonl"))):
        label, rec = load(p)
        if rec["scen"] == "s2":
            rec["grade"] = grade_memory(rec)
        data[label] = rec
    js = "window.HPD=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    old = json.load(open(os.path.join(HERE, "old_claims.json")))
    js += "window.HPOLD=" + json.dumps(old, ensure_ascii=False, separators=(",", ":")) + ";\n"
    assert "\u2014" not in js
    open(OUT, "w").write(js)
    print(f"{len(data)} recordings, {sum(r['calls'] for r in data.values())} model calls, "
          f"{len(js)} bytes -> {os.path.relpath(OUT, HERE)}")
    for k, r in data.items():
        if r["scen"] == "s2":
            print(k, r["grade"]["ok"], r["grade"]["searched"])


if __name__ == "__main__":
    main()
