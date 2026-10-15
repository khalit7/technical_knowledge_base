"""Profile the running example's train step with jax.profiler.trace on CPU and summarise it with xprof:
which compiled ops (fusions, dots) take the time. The raw trace names the host machine; it stays in
$JX_SCRATCH/xla/profile/ and only a scrubbed summary is kept. Output: src/xla/out/profile.json
Timings are rough (measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority).
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # noqa: E401,E702
import glob
import gzip
import json
import shutil

import jax

import xc_common as X
import model_jax as MJ

cfg = X.C.CFG
params, tx, opt, x, y = X.setup_state()
step = MJ.make_train_step(cfg, tx)
out = step(params, opt, x, y)
for _ in range(3):
    out = step(out[0], out[1], x, y)
jax.block_until_ready(out)
d = X.big("profile")
shutil.rmtree(d, ignore_errors=True)
N = 5
with jax.profiler.trace(d):
    for i in range(N):
        with jax.profiler.StepTraceAnnotation("train", step_num=i):
            out = step(out[0], out[1], x, y)
            jax.block_until_ready(out)
xp = glob.glob(os.path.join(d, "plugins", "profile", "*", "*.xplane.pb"))
tj = glob.glob(os.path.join(d, "plugins", "profile", "*", "*.trace.json.gz"))
res = {"versions": X.versions(), "steps_traced": N, "files": sorted(X.scrub(os.path.relpath(f, d)) for f in xp + tj)}

# trace events: per-name total duration over the traced steps (the XLA CPU thunks carry the HLO op names)
ev = json.load(gzip.open(tj[0]))
evs = ev["traceEvents"] if isinstance(ev, dict) else ev
pids = {e["pid"]: e.get("args", {}).get("name", "") for e in evs if e.get("ph") == "M" and e.get("name") == "process_name"}
tids = {(e["pid"], e["tid"]): e.get("args", {}).get("name", "") for e in evs if e.get("ph") == "M" and e.get("name") == "thread_name"}
dur = {}
cnt = {}
threads = {}
for e in evs:
    if e.get("ph") != "X":
        continue
    nm = e["name"]
    dur[nm] = dur.get(nm, 0) + e.get("dur", 0)
    cnt[nm] = cnt.get(nm, 0) + 1
    tn = tids.get((e["pid"], e["tid"]), "")
    threads[tn] = threads.get(tn, 0) + 1
top = sorted(dur.items(), key=lambda kv: -kv[1])[:40]
res["processes"] = sorted({X.scrub(v) for v in pids.values()})
res["threads_by_events"] = {X.scrub(k): v for k, v in sorted(threads.items(), key=lambda kv: -kv[1])[:12]}
res["top_events_us"] = [{"name": X.scrub(k), "total_us": v, "count": cnt[k]} for k, v in top]

# xprof tools: hlo_stats (per HLO op time) and overview
try:
    from xprof.convert import raw_to_tool_data as R
    data, ctype = R.xspace_to_tool_data(xp, "hlo_stats", {})
    js = json.loads(data) if isinstance(data, (str, bytes)) else data
    res["hlo_stats_raw_kind"] = type(js).__name__
    # a google-visualization DataTable: {"cols": [...], "rows": [{"c": [{"v": ..}]}]}
    tab = js[0] if isinstance(js, list) else js
    cols = [c.get("label") or c.get("id") for c in tab.get("cols", [])]
    rows = [[c.get("v") if isinstance(c, dict) else c for c in r["c"]] for r in tab.get("rows", [])]
    res["hlo_stats_cols"] = cols
    res["hlo_stats_rows"] = [[X.scrub(str(v)) if isinstance(v, str) else v for v in r] for r in rows[:400]]
    res["hlo_stats_n"] = len(rows)
except Exception as e:  # noqa: BLE001
    res["hlo_stats_error"] = X.scrub(repr(e))[:400]
X.save("profile.json", res)
print(res["files"])
print(res["threads_by_events"])
for t in res["top_events_us"][:15]:
    print(t)
print(res.get("hlo_stats_cols"), res.get("hlo_stats_n"), res.get("hlo_stats_error"))
