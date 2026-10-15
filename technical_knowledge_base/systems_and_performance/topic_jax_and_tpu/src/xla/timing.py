"""Rough timings of the running example's train step (measured on Apple M1 Pro (CPU), shared machine, 4 threads,
low priority): trace, lower and compile times, first and second call, the persistent compilation cache across
processes, scan against unrolled layers, remat step times, and torch.compile cold and warm.
Each measurement runs in a fresh child process (so caches start empty) and is repeated; medians are reported
with the 1-minute load average at the time. Output: src/xla/out/timing.json

    python timing.py [part ...]     parts: step cache layers remat torch   (default: all)
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # noqa: E401,E702
import json
import shutil
import statistics
import subprocess

import xc_common as X

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
OUTP = os.path.join(X.OUT, "timing.json")

STEP = r'''
import os, sys, time, json
t_import = time.perf_counter()
sys.path.insert(0, %(here)r)
import jax
cache = %(cache)r
if cache:
    jax.config.update("jax_compilation_cache_dir", cache)
    jax.config.update("jax_persistent_cache_min_compile_time_secs", 0.0)
    jax.config.update("jax_persistent_cache_min_entry_size_bytes", -1)
import xc_common as X, model_jax as MJ
cfg = X.C.CFG
params, tx, opt, x, y = X.setup_state()
aot = MJ.make_train_step(cfg, tx)            # stages, ahead of time (nothing runs)
pc = time.process_time
c0 = pc(); t0 = time.perf_counter(); tr = aot.trace(params, opt, x, y); t1 = time.perf_counter(); c1 = pc()
lo = tr.lower(); t2 = time.perf_counter(); c2 = pc()
co = lo.compile(); t3 = time.perf_counter(); c3 = pc()
step = MJ.make_train_step(cfg, tx)           # a new jitted function: the normal path, its caches empty
ca = pc(); a = time.perf_counter(); out = step(params, opt, x, y); jax.block_until_ready(out); b = time.perf_counter(); cb = pc()
p2, o2 = out[0], out[1]
c = time.perf_counter(); out = step(p2, o2, x, y); jax.block_until_ready(out); d = time.perf_counter()
runs = []
for i in range(10):
    s = time.perf_counter(); out = step(out[0], out[1], x, y); jax.block_until_ready(out); runs.append(time.perf_counter() - s)
runs.sort()
print(json.dumps({"trace": t1 - t0, "lower": t2 - t1, "compile": t3 - t2, "first_call": b - a, "second_call": d - c,
                  "steady_median": runs[len(runs) // 2], "trace_cpu": c1 - c0, "lower_cpu": c2 - c1, "compile_cpu": c3 - c2,
                  "first_call_cpu": cb - ca}))
'''

LAYERS = r'''
import os, sys, time, json
sys.path.insert(0, %(here)r)
import jax, optax
import xc_common as X, model_jax as MJ, hlo_tools as H
cfg = dict(X.C.CFG, n_layers=%(n)d)
key = jax.random.key(0)
params = MJ.init_params(cfg, key)
x, y = X.C.batch(0)
tx = MJ.make_optimizer(cfg, X.C.lr_at)
scan = %(scan)r
if scan:
    params = MJ.stack_blocks(params)
    fwd = lambda p, x: MJ.apply_scan(p, x, cfg)
else:
    fwd = lambda p, x: MJ.apply(p, x, cfg)
def step(params, opt_state, x, y):
    l, g = jax.value_and_grad(lambda p: optax.softmax_cross_entropy_with_integer_labels(fwd(p, x), y).mean())(params)
    u, opt_state = tx.update(g, opt_state, params)
    return optax.apply_updates(params, u), opt_state, l
opt = tx.init(params)
f = jax.jit(step, donate_argnums=(0, 1))
c0 = time.process_time(); t0 = time.perf_counter(); tr = f.trace(params, opt, x, y); t1 = time.perf_counter()
lo = tr.lower(); t2 = time.perf_counter(); c2 = time.process_time(); co = lo.compile(); t3 = time.perf_counter(); c3 = time.process_time()
out = co(params, opt, x, y); jax.block_until_ready(out)
runs = []
for i in range(5):
    s = time.perf_counter(); out = co(out[0], out[1], x, y); jax.block_until_ready(out); runs.append(time.perf_counter() - s)
runs.sort()
oh = H.hlo_counts(co.as_text())
print(json.dumps({"trace": t1 - t0, "lower": t2 - t1, "compile": t3 - t2, "steady_median": runs[len(runs) // 2],
                  "compile_cpu": c3 - c2, "trace_lower_cpu": c2 - c0,
                  "jaxpr_eqns": H.jaxpr_counts(tr.jaxpr)["flat_eqns"], "stablehlo_bytes": len(lo.as_text().encode()),
                  "opt_hlo_bytes": len(co.as_text().encode()), "kernels": oh["kernels"],
                  "temp_bytes": int(co.memory_analysis().temp_size_in_bytes), "loss": float(out[2])}))
'''

REMAT = r'''
import os, sys, time, json
sys.path.insert(0, %(here)r)
import jax
import remat as R
f = R.make_step(%(k)d, R.POLICIES.get(%(policy)r))
co = f.lower(R.params, R.opt, R.x, R.y).compile()
p = jax.tree.map(lambda v: v.copy(), R.params); o = jax.tree.map(lambda v: v.copy(), R.opt)
out = co(p, o, R.x, R.y); jax.block_until_ready(out)
runs = []
for i in range(9):
    s = time.perf_counter(); out = co(out[0], out[1], R.x, R.y); jax.block_until_ready(out); runs.append(time.perf_counter() - s)
runs.sort()
print(json.dumps({"steady_median": runs[len(runs) // 2]}))
'''


def load1():
    return os.getloadavg()[0]


def child(code, env=None, **kw):
    e = dict(os.environ, JAX_PLATFORMS="cpu", OMP_NUM_THREADS="4")
    e.update(env or {})
    r = subprocess.run([PY, "-I", "-B", "-c", code % dict(here=HERE, **kw)], env=e, capture_output=True, text=True, check=True)
    return json.loads(r.stdout.strip().splitlines()[-1])


def med(rows, k):
    return statistics.median(r[k] for r in rows)


def part_step(res, n=5):
    rows = []
    for _ in range(n):
        rows.append(dict(child(STEP, cache=""), load1=load1()))
        print("step", rows[-1])
    res["step"] = {"runs": rows, "median": {k: med(rows, k) for k in rows[0] if k != "load1"}}


def part_cache(res, n=5):
    d = X.big("jax_cache")
    shutil.rmtree(d, ignore_errors=True)
    rows = []
    for i in range(n):
        r = child(STEP, cache=d)
        r["load1"] = load1()
        r["cache_files"] = len(os.listdir(d)) if os.path.isdir(d) else 0
        r["cache_bytes"] = sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d)) if os.path.isdir(d) else 0
        rows.append(r)
        print("cache", i, r)
    # the same with JAX's default threshold (jax_persistent_cache_min_compile_time_secs = 1.0): is the step written at all?
    d2 = X.big("jax_cache_default")
    shutil.rmtree(d2, ignore_errors=True)
    code_def = STEP.replace('jax.config.update("jax_persistent_cache_min_compile_time_secs", 0.0)', 'pass')
    rdef = child(code_def, cache=d2)
    rdef["cache_files"] = len(os.listdir(d2)) if os.path.isdir(d2) else 0
    rdef["load1"] = load1()
    print("cache default threshold", rdef)
    res["cache_default_threshold"] = rdef
    res["cache"] = {"first_process": rows[0], "later": rows[1:],
                    "later_median": {k: med(rows[1:], k) for k in ("trace", "lower", "compile", "first_call", "trace_cpu", "lower_cpu", "compile_cpu", "first_call_cpu")}}


def part_layers(res, ns=(1, 2, 4, 8, 16, 32)):
    out = []
    for n in ns:
        for scan in (False, True):
            reps = [child(LAYERS, n=n, scan=scan) for _ in range(3)]
            r = {"n_layers": n, "scan": scan, "load1": load1()}
            for k in reps[0]:
                r[k] = statistics.median(x[k] for x in reps)
            out.append(r)
            print("layers", r)
    res["layers"] = out


def part_remat(res):
    out = []
    for k, pol in [(0, "none"), (4, "nothing_saveable"), (4, "dots_saveable"), (4, "dots_with_no_batch_dims_saveable")]:
        reps = [child(REMAT, k=k, policy=pol)["steady_median"] for _ in range(3)]
        out.append({"k": k, "policy": pol, "steady_median": statistics.median(reps), "reps": reps, "load1": load1()})
        print("remat", out[-1])
    res["remat"] = out


TORCH = r'''
import os, sys, time, json
sys.path.insert(0, %(here)r)
import numpy as np, torch
torch.set_num_threads(4)
import xc_common as X, model_torch as MT
cfg = X.C.CFG
m = MT.make_model(cfg)
sd = dict(np.load(X.C.path("data", "init_torch.npz")))
m.load_state_dict({k: torch.from_numpy(v) for k, v in sd.items()})
xb, yb = (torch.from_numpy(a).long() for a in X.C.batch(0))
fn = lambda x, y: MT.loss_fn(m, x, y)
cfn = torch.compile(fn)
c0 = time.process_time(); t0 = time.perf_counter(); cfn(xb, yb).backward(); t1 = time.perf_counter(); c1 = time.process_time()
def med(f):
    r = []
    for i in range(9):
        m.zero_grad(set_to_none=True); s = time.perf_counter(); f(xb, yb).backward(); r.append(time.perf_counter() - s)
    r.sort(); return r[4]
print(json.dumps({"first_call": t1 - t0, "first_call_cpu": c1 - c0, "compiled_median": med(cfn), "eager_median": med(fn)}))
'''


def part_torch(res, n=3):
    d = X.big("inductor_cache_timing")
    rows = []
    for i in range(n):
        shutil.rmtree(d, ignore_errors=True)       # cold: empty Inductor cache
        r = child(TORCH, env={"TORCHINDUCTOR_CACHE_DIR": d})
        r["load1"] = load1()
        r2 = child(TORCH, env={"TORCHINDUCTOR_CACHE_DIR": d})   # warm: same cache, new process
        r["warm_first_call"] = r2["first_call"]
        r["warm_first_call_cpu"] = r2["first_call_cpu"]
        rows.append(r)
        print("torch", r)
    res["torch"] = {"runs": rows, "median": {k: med(rows, k) for k in rows[0] if k != "load1"}}


if __name__ == "__main__":
    res = json.load(open(OUTP)) if os.path.exists(OUTP) else {}
    res["versions"] = X.versions()
    res["label"] = "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority (nice 15)"
    parts = sys.argv[1:] or ["step", "cache", "layers", "remat", "torch"]
    for p in parts:
        globals()["part_" + p](res)
        X.save("timing.json", res)
