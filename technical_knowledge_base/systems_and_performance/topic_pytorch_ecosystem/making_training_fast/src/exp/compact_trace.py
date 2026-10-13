"""Compact the profiler's Chrome traces of the hunt (scratch, tens of MB) into inputs/hunt_trace.json for the
Profiler trace tab: one ProfilerStep per trace, every event on every thread with its nesting depth, events shorter
than MIN_US dropped (counted), plus a self-time table of ATen ops like prof.key_averages().
    python compact_trace.py <scratch dir> mps:s0 mps:s6 cpu:s0 cpu:s6
"""
import json, os, sys
from collections import defaultdict
import common

MIN_US = 40          # drop events shorter than this from the drawing (they are still in the totals)
RANGES = ("data", "forward", "backward", "optimizer", "log loss (.item)")


def one(path):
    t = json.load(open(path))
    ev = [e for e in t["traceEvents"] if e.get("ph") == "X" and "dur" in e]
    steps = sorted([e for e in ev if e["name"].startswith("ProfilerStep#")], key=lambda e: e["ts"])
    st = steps[-1]                                           # the last active step
    t0, t1 = st["ts"], st["ts"] + st["dur"]
    inside = [e for e in ev if e["ts"] >= t0 - 1 and e["ts"] + e["dur"] <= t1 + 1 and e is not st]
    by_tid = defaultdict(list)
    for e in inside:
        by_tid[e["tid"]].append(e)
    lanes, out, names, nidx = [], [], [], {}
    dropped = 0
    selft = defaultdict(float); calls = defaultdict(int)
    for tid, es in sorted(by_tid.items(), key=lambda kv: -sum(e["dur"] for e in kv[1])):
        es.sort(key=lambda e: (e["ts"], -e["dur"]))
        stack = []
        lane = len(lanes)
        for e in es:
            while stack and stack[-1][0]["ts"] + stack[-1][0]["dur"] <= e["ts"]:
                stack.pop()
            depth = len(stack)
            if stack:
                stack[-1][1].append(e)
            stack.append((e, []))
            e["_depth"] = depth
            e["_kids"] = stack[-1][1]
        for e in es:
            kids = e["_kids"]
            s = e["dur"] - sum(k["dur"] for k in kids)
            if e.get("cat") == "cpu_op":
                selft[e["name"]] += s; calls[e["name"]] += 1
            if e["dur"] < MIN_US and e["name"] not in RANGES:
                dropped += 1; continue
            if e["name"] not in nidx:
                nidx[e["name"]] = len(names); names.append(e["name"])
            out.append([lane, round(e["ts"] - t0, 1), round(e["dur"], 1), nidx[e["name"]], e["_depth"], 1 if e.get("cat") == "user_annotation" else 0])
        lanes.append({"tid": str(tid), "events": len(es), "busy_us": round(sum(e["dur"] for e in es if e["_depth"] == 0), 1)})
    top = sorted(selft.items(), key=lambda kv: -kv[1])[:14]
    rng = {}
    for e in inside:
        if e["name"] in RANGES and e.get("cat") == "user_annotation":
            rng[e["name"]] = rng.get(e["name"], 0) + e["dur"]
    return {"step": st["name"], "step_us": round(st["dur"], 1), "lanes": lanes, "names": names, "events": out,
            "dropped_short": dropped, "total_events": len(inside), "ranges_us": {k: round(v, 1) for k, v in rng.items()},
            "top_self": [[n, round(v, 1), calls[n]] for n, v in top]}


if __name__ == "__main__":
    d, specs = sys.argv[1], sys.argv[2:]
    res = {"min_us": MIN_US, "traces": {}}
    for sp in specs:
        dev, st = sp.split(":")
        r = one(os.path.join(d, f"hunt_{dev}_{st}.json")); r["device"] = dev; r["stage"] = st
        res["traces"][sp] = r
        print(sp, r["step_us"], len(r["events"]), r["dropped_short"], r["ranges_us"], file=sys.stderr)
    res["env"] = common.env()
    common.dump("hunt_trace.json", res)
