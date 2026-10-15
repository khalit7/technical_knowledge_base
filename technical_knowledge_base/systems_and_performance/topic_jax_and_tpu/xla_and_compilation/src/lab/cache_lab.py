"""The persistent compilation cache: what is in the key, what hits, what misses.

Each case is a fresh Python process compiling the running example's train step with
jax_compilation_cache_dir set to a scratch folder and jax_persistent_cache_min_compile_time_secs = 0:
  cold        empty cache: compile, write an entry
  warm        same program, same flags: read the entry
  dump_flag   adds --xla_dump_to (listed in cache_key.py as excluded from the key): still a hit
  xla_flag    adds --xla_cpu_enable_fast_math=true: a different key, a miss
  donation    the same step jitted without donate_argnums: a different computation, a miss
  threshold   default threshold (1 s) on a small function, fresh folder: nothing written
JAX's own per-entry key hashes (logger jax._src.cache_key at DEBUG) say which ingredient changed.
Times are rough (shared machine, low priority); hits, misses, keys and sizes are deterministic.
Output: lab/out/cache.json
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

C = X.C
CACHE = os.path.dirname(X.big("cache", "x"))
CACHE2 = os.path.dirname(X.big("cache_threshold", "x"))
CASES = [
    ("cold", "", "step", CACHE, True),
    ("warm", "", "step", CACHE, False),
    ("dump_flag", "--xla_dump_to=" + os.path.dirname(X.big("cache_dump", "x")), "step", CACHE, False),
    ("xla_flag", "--xla_cpu_enable_fast_math=true", "step", CACHE, False),
    ("donation", "", "step_nodonate", CACHE, False),
    ("threshold", "", "small_default", CACHE2, True),
]


def child(what, cache_dir):
    import logging
    import jax
    import jax.numpy as jnp
    from jax import monitoring
    import model_jax as MJ
    ev = {}
    monitoring.register_event_listener(lambda e, **kw: ev.__setitem__(e, ev.get(e, 0) + 1))
    dur = {}
    monitoring.register_event_duration_secs_listener(lambda e, d, **kw: dur.__setitem__(e, dur.get(e, 0.0) + d))
    logs = []

    class H(logging.Handler):
        def emit(self, r):
            logs.append(r.getMessage())
    h = H(logging.DEBUG)
    for name in ("jax._src.cache_key", "jax._src.compiler", "jax._src.compilation_cache"):
        lg = logging.getLogger(name)
        lg.setLevel(logging.DEBUG)
        lg.addHandler(h)
    jax.config.update("jax_compilation_cache_dir", cache_dir)
    if what != "small_default":
        jax.config.update("jax_persistent_cache_min_compile_time_secs", 0.0)
    cfg = C.CFG
    t0, c0 = time.perf_counter(), time.process_time()
    if what == "small_default":
        jax.jit(lambda x: jnp.tanh(x) * 2).lower(jnp.ones((256, 256))).compile()
    else:
        params, tx, opt, xb, yb = X.setup_state()
        if what == "step":
            step = MJ.make_train_step(cfg, tx)
        else:
            step = jax.jit(MJ.make_train_step(cfg, tx).__wrapped__)
        ev.clear()
        dur.clear()
        t0, c0 = time.perf_counter(), time.process_time()
        step.lower(params, opt, xb, yb).compile()
    wall, cpu = time.perf_counter() - t0, time.process_time() - c0
    entries = {}
    for m in logs:
        mm = re.match(r"get_cache_key hash of serialized (.+): ([0-9a-f]{64})$", m)
        if mm:
            entries[mm.group(1)] = mm.group(2)[:16]
    keys = [re.search(r"with key '?([\w\-]+)", m).group(1) for m in logs if re.search(r"with key '?([\w\-]+)", m)]
    keys = [k for k in keys if "train_step" in k or "lambda" in k]
    print(json.dumps({"wall_s": wall, "cpu_s": cpu, "events": ev,
                      "compile_s": dur.get("/jax/core/compile/backend_compile_duration"),
                      "entries": entries, "keys": sorted(set(keys)),
                      "logs": [X.scrub(m)[:300] for m in logs if "get_cache_key" not in m][:12]}))


def listing(d):
    out = []
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        out.append({"name": f, "bytes": os.path.getsize(os.path.join(d, f))})
    return out


def parent():
    for d in (CACHE, CACHE2):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)
    res = {"versions": X.versions(), "load1": X.load1(),
           "label": "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority", "cases": []}
    for key, flags, what, d, _ in CASES:
        env = dict(os.environ)
        env["XLA_FLAGS"] = flags
        p = subprocess.run([sys.executable, "-I", "-B", os.path.abspath(__file__), "_child", what, d], env=env,
                           capture_output=True, text=True)
        if p.returncode:
            print(p.stderr[-2000:])
            raise SystemExit(key)
        r = json.loads(p.stdout.strip().splitlines()[-1])
        r.update(key=key, flags=X.scrub(flags).replace(os.path.dirname(X.big("cache_dump", "x")), "<dir>"), what=what,
                 files_after=listing(d))
        res["cases"].append(r)
        ev = {k.split("/")[-1]: v for k, v in r["events"].items() if "compilation_cache" in k}
        print("%-10s wall %.2f cpu %.2f compile %s ev %s files %d keys %s" % (key, r["wall_s"], r["cpu_s"], r["compile_s"], ev,
              len(r["files_after"]), r["keys"][:1]))
    base = res["cases"][0]["entries"]
    for c in res["cases"][1:]:
        c["changed_entries"] = [k for k, v in c["entries"].items() if base.get(k) != v] if c["entries"] else None
        print(c["key"], "changed key ingredients:", c["changed_entries"])
    res["source"] = {
        "entries": X.jax_locate("jax/_src/cache_key.py", r"^  entries = \[$"),
        "excluded_flags": X.jax_locate("jax/_src/cache_key.py", r'"--xla_dump_to",$'),
        "threshold_default": X.jax_locate("jax/_src/config.py", r"name='jax_persistent_cache_min_compile_time_secs',", ctx=1),
        "threshold_check": X.jax_locate("jax/_src/compiler.py", r"if compile_time_secs < min_compile_time:"),
        "doc": X.jax_locate("docs/persistent_compilation_cache.md", r"^# Persistent compilation cache"),
    }
    X.save("cache.json", res)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "_child":
        child(sys.argv[2], sys.argv[3])
    else:
        parent()
