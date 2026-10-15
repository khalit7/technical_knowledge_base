"""XLA flags that matter: defaults and help text read from the pinned source, and five CPU settings measured on
the running example's train step (each in a fresh process, since XLA_FLAGS is read once at start-up):
compile CPU time, steady step CPU and wall time (median of 7 after 2 warm-up steps), and the loss after
5 steps from the same initial state (does the flag change the numbers?).
TPU flags (LIBTPU_INIT_ARGS) as MaxText sets them are quoted from its pinned source: not run here (no TPU).
Output: lab/out/flags.json
"""
import json
import os
import statistics
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

C = X.C
SETTINGS = [
    ("default", ""),
    ("opt_level_0", "--xla_backend_optimization_level=0"),
    ("no_fusion", "--xla_disable_hlo_passes=fusion"),
    ("no_library", "--xla_cpu_experimental_ynn_fusion_type=-individual_dot,-individual_convolution,-reduce"),
    ("fast_math", "--xla_cpu_enable_fast_math=true"),
]
FLAGS_DOC = ["xla_dump_to", "xla_dump_hlo_pass_re", "xla_disable_hlo_passes", "xla_enable_hlo_passes_only",
             "xla_backend_optimization_level", "xla_cpu_enable_fast_math", "xla_cpu_enable_fast_min_max",
             "xla_gpu_autotune_level", "xla_gpu_enable_triton_gemm", "xla_gpu_enable_latency_hiding_scheduler",
             "xla_gpu_exclude_nondeterministic_ops", "xla_gpu_enable_command_buffer", "xla_gpu_memory_limit_slop_factor",
             "xla_cpu_experimental_ynn_fusion_type", "xla_dump_max_hlo_modules"]


def child():
    import jax
    import numpy as np
    import model_jax as MJ
    cfg = C.CFG
    params, tx, opt, x, y = X.setup_state()
    step = MJ.make_train_step(cfg, tx)
    c0 = time.process_time()
    comp = step.lower(params, opt, x, y).compile()
    compile_cpu = time.process_time() - c0
    p, o = params, opt
    losses = []
    walls, cpus = [], []
    for i in range(9):
        xb, yb = C.batch(i)
        t0, c0 = time.perf_counter(), time.process_time()
        p, o, loss, gn = comp(p, o, xb, yb)
        jax.block_until_ready(loss)
        if i >= 2:
            walls.append(time.perf_counter() - t0)
            cpus.append(time.process_time() - c0)
        losses.append(float(loss))
    print(json.dumps({"compile_cpu_s": compile_cpu, "step_wall_s": statistics.median(walls),
                      "step_cpu_s": statistics.median(cpus), "losses": losses[:5],
                      "load1": X.load1()}))


def flag_doc(name):
    rel = "xla/debug_options_flags.cc"
    out = {"name": name}
    try:
        loc = X.xla_locate(rel, r'"%s"' % name)
        lines = open(X.xla_file(rel)).read().splitlines()
        i = loc["line"] - 1
        blk = []
        for l in lines[i:i + 40]:
            if blk and ("push_back" in l or "tsl::Flag(" in l):
                break
            blk.append(l.strip())
        import re as _re
        lits = _re.findall(r'"((?:[^"\\]|\\.)*)"', " ".join(blk))
        lits = [t for t in lits if t != name and not t.endswith("_") and t != ""]
        out["help"] = "".join(lits).replace("\\n", " ")[:420]
        out["line"] = loc["line"]
        out["url"] = loc["url"]
    except ValueError:
        out["help"] = None
    try:
        d = X.xla_locate(rel, r"opts\.(set|add)_%s\(" % name)
        out["default"] = d["quote"].strip()
        out["default_line"] = d["line"]
    except ValueError:
        out["default"] = None
    return out


def parent():
    res = {"versions": X.versions(), "label": "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority",
           "runs": []}
    for key, flags in SETTINGS:
        env = dict(os.environ)
        env["XLA_FLAGS"] = flags
        p = subprocess.run([sys.executable, "-I", "-B", os.path.abspath(__file__), "_child"], env=env,
                           capture_output=True, text=True)
        if p.returncode:
            print(p.stderr[-1500:])
            raise SystemExit(key)
        r = json.loads(p.stdout.strip().splitlines()[-1])
        r.update(key=key, flags=flags)
        res["runs"].append(r)
        print("%-12s compile %.2f s  step cpu %.3f wall %.3f  loss5 %s  load %s" % (key, r["compile_cpu_s"], r["step_cpu_s"],
              r["step_wall_s"], ["%.6f" % v for v in r["losses"]], r["load1"]))
    res["docs"] = [flag_doc(n) for n in FLAGS_DOC]
    for d in res["docs"]:
        print(d["name"], d.get("line"), "|", (d.get("default") or "")[:60], "|", (d.get("help") or "")[:90])
    mt = "benchmarks/xla_flags_library.py"
    base = X.src_path("maxtext")
    res["maxtext"] = {k: X.locate(os.path.join(base, mt), pat, mt, "https://github.com/AI-Hypercomputer/maxtext/blob/1a95d1e5371021aab8d0574c53d2cca425474318/", ctx=c)
                      for k, pat, c in [("vmem", r"^_DENSE_VMEM_LIMIT = ", 2),
                                        ("cf_all_gather", r"^CF_FOR_ALL_GATHER = \($", 6),
                                        ("dp_overlap", r"^DATA_PARALLEL_OVERLAP = \($", 2),
                                        ("host_offload", r"^HOST_OFFLOAD_FLAGS = \($", 5)]}
    res["jax_doc"] = X.jax_locate("docs/xla_flags.md", r"Set `XLA_FLAGS` before importing Jax")
    X.save("flags.json", res)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "_child":
        child()
    else:
        parent()
