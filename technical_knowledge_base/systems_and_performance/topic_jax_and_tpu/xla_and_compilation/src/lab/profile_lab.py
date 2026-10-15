"""Reading a profile of the running example's train step: the trace viewer's timeline of one step, the per-op
tables xprof derives (hlo_stats, framework_op_stats, op_profile), the overview page and the memory profile,
each summarised and scrubbed of the host name and paths (the raw files stay in $JX_SCRATCH/xp/profile/).

Every kernel in the timeline is joined to the fusion catalogue (fusion_lab.py) to say which phase
(forward, backward, optimiser) and which model function it computes.
Timings: measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority; the 1-minute load is recorded.
Output: lab/out/profile.json
"""
import collections
import glob
import gzip
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

import jax  # noqa: E402
import model_jax as MJ  # noqa: E402

cfg = X.C.CFG
params, tx, opt, x, y = X.setup_state()
step = MJ.make_train_step(cfg, tx)
out = step(params, opt, x, y)
for _ in range(3):
    out = step(out[0], out[1], x, y)
jax.block_until_ready(out)
d = os.path.dirname(X.big("profile", "x"))
shutil.rmtree(d, ignore_errors=True)
N = 5
load_before = X.load1()
with jax.profiler.trace(d):
    for i in range(N):
        with jax.profiler.StepTraceAnnotation("train", step_num=i):
            out = step(out[0], out[1], x, y)
            jax.block_until_ready(out)
load_after = X.load1()
xp = glob.glob(os.path.join(d, "plugins", "profile", "*", "*.xplane.pb"))
tj = glob.glob(os.path.join(d, "plugins", "profile", "*", "*.trace.json.gz"))
res = {"versions": X.versions(), "steps": N, "load1": [load_before, load_after],
       "label": "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority",
       "files": sorted(re.sub(r"/[^/]*\.(xplane\.pb|trace\.json\.gz)$", r"/<host>.\1", X.scrub(os.path.relpath(f, d))) for f in xp + tj)}

# ---------------------------------------------------------------- the timeline of one step
ev = json.load(gzip.open(tj[0]))
evs = ev["traceEvents"] if isinstance(ev, dict) else ev
tids = {(e["pid"], e["tid"]): e.get("args", {}).get("name", "") for e in evs if e.get("ph") == "M" and e.get("name") == "thread_name"}
steps = sorted([e for e in evs if e.get("ph") == "X" and e.get("name") == "train"], key=lambda e: e["ts"])
res["step_ms"] = [round(e["dur"] / 1000, 2) for e in steps]
S = steps[2]                      # the third traced step
t0, t1 = S["ts"], S["ts"] + S["dur"]
cat = json.load(open(os.path.join(X.OUT, "fusion_lab.json")))["step"]["default"]["catalog"]
info = {r[0]: {"kind": r[1], "n": r[2], "root": r[3], "phase": r[4], "fn": r[5]} for r in cat}
# every other instruction (the matmuls, including those inside library fusions): phase and function from metadata
import fusion_lab as FL  # noqa: E402
for nm, v in FL.phase_and_fn(step.lower(params, opt, x, y).compile().as_text()).items():
    if nm not in info:
        info[nm] = {"kind": None, "n": None, "root": None, "phase": v["phase"], "fn": v["fn"]}


def thread_label(raw):
    if raw.startswith("tf_XLAEigen"):
        return "XLA:CPU worker"
    if "PjRtCpuClient" in raw:
        return "PJRT client"
    return "Python (main)" if raw == "" or "MainThread" in raw else re.sub(r"/\d+$", "", raw)


rows = collections.OrderedDict()
events = []
for e in evs:
    if e.get("ph") != "X" or e["ts"] < t0 or e["ts"] > t1:
        continue
    key = (e["pid"], e["tid"])
    lab = thread_label(tids.get(key, ""))
    if key not in rows:
        rows[key] = lab
    nm = X.scrub(e["name"])
    events.append((key, e["ts"] - t0, e.get("dur", 0), nm))
order = sorted(rows, key=lambda k: (rows[k] != "Python (main)", rows[k] != "PJRT client", rows[k]))
rid = {k: i for i, k in enumerate(order)}
labels = []
cnt = collections.Counter()
for k in order:
    lab = rows[k]
    cnt[lab] += 1
    labels.append(lab + (" %d" % cnt[lab] if lab == "XLA:CPU worker" else ""))
kern = {}
for _, _, dur, nm in events:
    kern.setdefault(nm, 0)
    kern[nm] += dur
tl = []
for key, ts, dur, nm in events:
    if dur < 15:
        continue
    f = info.get(nm, {})
    tl.append([rid[key], round(ts, 1), round(dur, 1), nm, f.get("phase", ""), f.get("fn", "")])
tl.sort(key=lambda r: (r[0], r[1]))
res["timeline"] = {"step_index": 2, "dur_us": S["dur"], "threads": labels, "events": tl[:2600],
                   "n_events_all": len(events), "n_kept": min(len(tl), 2600), "min_dur_us": 15}

# time by phase and by model function, over all kernels of the step (thread time, not wall time)
by_phase = collections.Counter()
by_fn = collections.Counter()
by_kind = collections.Counter()
for key, ts, dur, nm in events:
    if rows[key] == "Python (main)" or nm.startswith("ThunkExecutor") or nm.startswith("SlinkyThreadPool"):
        continue
    if nm in info:
        by_phase[info[nm]["phase"]] += dur
        by_fn[info[nm]["fn"]] += dur
        by_kind["fusion " + (info[nm]["kind"] or "")] += dur
    elif nm.startswith("dot") or "dot_general" in nm:
        by_kind["dot (library call)"] += dur
        by_phase[info.get(nm, {}).get("phase", "?")] += dur
        by_fn[info.get(nm, {}).get("fn", "?")] += dur
    else:
        by_kind["other"] += dur
res["by_phase_us"] = dict(by_phase.most_common())
res["by_fn_us"] = dict(by_fn.most_common(10))
res["by_kind_us"] = dict(by_kind.most_common())
res["top_kernels"] = [{"name": n, "us": round(v, 1), **info.get(n, {})} for n, v in sorted(kern.items(), key=lambda kv: -kv[1])
                      if not n.startswith("ThunkExecutor") and not n.startswith("Slinky") and n not in ("train",) and not n.startswith("$")][:25]

# ---------------------------------------------------------------- xprof tools
from xprof.convert import raw_to_tool_data as R  # noqa: E402


def table(js):
    tab = js[0] if isinstance(js, list) else js
    cols = [c.get("label") or c.get("id") for c in tab.get("cols", [])]
    rws = [[c.get("v") if isinstance(c, dict) else c for c in r["c"]] for r in tab.get("rows", [])]
    return cols, rws


tools = {}
for tool in ("overview_page", "hlo_stats", "framework_op_stats", "op_profile", "memory_profile", "roofline_model", "trace_viewer@"):
    try:
        data, ctype = R.xspace_to_tool_data(xp, tool, {})
        raw = data.decode() if isinstance(data, bytes) else data
        tools[tool] = {"ok": True, "content_type": str(ctype), "bytes": len(raw) if raw else 0}
        js = json.loads(raw) if raw and raw.strip()[:1] in "[{" else None
        if tool in ("hlo_stats", "framework_op_stats") and js is not None:
            cols, rws = table(js)
            tools[tool]["cols"] = cols
            tools[tool]["n_rows"] = len(rws)
            tools[tool]["rows"] = [[X.scrub(str(v))[:80] if isinstance(v, str) else v for v in r] for r in rws[:12]]
        elif tool == "op_profile" and js is not None:
            def walk(node, depth=0, outl=None):
                outl = [] if outl is None else outl
                m = node.get("metrics", {})
                outl.append({"depth": depth, "name": X.scrub(node.get("name", ""))[:70],
                             "time_frac": m.get("time") or m.get("rawTime"), "flops": m.get("flops"),
                             "children": len(node.get("children", []))})
                if depth < 2:
                    for c in node.get("children", [])[:8]:
                        walk(c, depth + 1, outl)
                return outl
            root = js.get("byCategory") or js.get("byProgram") or js
            tools[tool]["tree"] = walk(root)[:40]
            tools[tool]["keys"] = sorted(js.keys())[:10]
        elif tool == "overview_page" and js is not None:
            s = json.dumps(js)
            tools[tool]["snippet_keys"] = sorted(set(re.findall(r'"(\w*(?:step|device|host|idle|mxu|flop)\w*)"', s, re.I)))[:30]
            tools[tool]["device_type"] = re.findall(r'"device_type"\s*:\s*"([^"]*)"', s)[:2]
        elif tool == "memory_profile" and js is not None:
            s = json.dumps(js)
            tools[tool]["keys"] = sorted(js.keys())[:12] if isinstance(js, dict) else None
            tools[tool]["n_snapshots"] = len(re.findall(r'"timeOffsetPs"', s))
    except Exception as e:  # noqa: BLE001
        tools[tool] = {"ok": False, "error": X.scrub(repr(e))[:300]}
    print(tool, {k: v for k, v in tools[tool].items() if k not in ("rows", "tree")})
res["xprof_tools"] = tools
X.save("profile.json", res)
print("steps ms", res["step_ms"], "events", res["timeline"]["n_events_all"], "kept", res["timeline"]["n_kept"])
print("by phase", res["by_phase_us"])
print("by kind", res["by_kind_us"])
print("by fn", res["by_fn_us"])
print("threads", res["timeline"]["threads"])
