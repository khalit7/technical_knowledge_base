"""XLA's pass pipeline, observed: dump the HLO after every pass that changed it (--xla_dump_hlo_pass_re=.*)
for a function, and count instructions after each pass. Run in a child process per function so XLA_FLAGS apply.

    python passes.py            # runs both functions, writes src/xla/out/passes.json
Dumps go to $JX_SCRATCH/xla/dump_<name>/ (absolute paths inside are scrubbed before anything is embedded).
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # noqa: E401,E702
import glob
import json
import re
import shutil
import subprocess

import xc_common as X
import hlo_tools as H

CHILD = r'''
import os, sys
sys.path.insert(0, %(here)r)
import jax, jax.numpy as jnp, optax
import xc_common as X, model_jax as MJ
cfg = X.C.CFG
params, tx, opt, x, y = X.setup_state()
name = %(name)r
if name == "mlp_block":
    p = params["blocks"][0]
    h = jax.random.normal(jax.random.key(0), (32, 128, 128), jnp.float32)
    f = jax.jit(lambda p, x: x + MJ.mlp(p["mlp"], MJ.layer_norm(p["ln2"], x, cfg["ln_eps"])))
    f.lower(p, h).compile()
else:
    MJ.make_train_step(cfg, tx).lower(params, opt, x, y).compile()
'''


def count_instr(txt):
    n = 0
    for line in txt.splitlines():
        if re.match(r"^\s+(ROOT\s+)?%?[\w.\-]+\s*=\s*\S", line):
            n += 1
    return n


def run(name):
    d = X.big("dump_" + name)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    env = dict(os.environ, JAX_PLATFORMS="cpu",
               XLA_FLAGS="--xla_dump_to=%s --xla_dump_hlo_pass_re=.*" % d)
    subprocess.run([sys.executable, "-I", "-B", "-c", CHILD % {"here": os.path.dirname(os.path.abspath(__file__)), "name": name}],
                   env=env, check=True)
    files = sorted(glob.glob(os.path.join(d, "*.txt")))
    # names: module_0044.jit__lambda.0005.<pipeline>.after_<pass>[.before_<next pass>].txt
    mods = {}
    for f in files:
        b = os.path.basename(f)
        m = re.match(r"module_(\d+)\.([^.]+)\.(\d{4})\.([^.]+)\.after_(.+?)(?:\.before_(.+))?\.txt$", b)
        if m:
            mods.setdefault((m.group(1), m.group(2)), []).append((int(m.group(3)), m.group(4), m.group(5), f))
    want = "jit__lambda" if name == "mlp_block" else "jit_train_step"
    key = [k for k in mods if k[1] == want][-1]
    seq = sorted(mods[key])
    steps = []
    for idx, pipe, pas, f in seq:
        t = open(f).read()
        comps = H.parse_hlo(t)
        top = [i for c in comps if not c.get("fused") for i in c["instrs"]]
        steps.append({"i": idx, "pipeline": pipe, "after": pas, "instructions": len(top),
                      "fusions": sum(1 for i in top if i["opcode"] == "fusion"),
                      "work": sum(1 for i in top if i["opcode"] not in H.TRIVIAL)})
    files = [f for f in files if os.path.basename(f).startswith("module_%s." % key[0])]
    n_modules = len(mods)
    eager_modules = sorted({k[1] for k in mods if k != key})
    other = [os.path.basename(f) for f in glob.glob(os.path.join(d, "module_%s.*" % key[0])) if not re.search(r"\.\d{4}\.", os.path.basename(f))]
    tot = sum(os.path.getsize(f) for f in glob.glob(os.path.join(d, "*")))
    # what the biggest cse pass removed: instruction counts by (opcode, jax op name) before minus after
    import collections
    cse = None
    for j, (idx, pipe, pas, f) in enumerate(seq):
        if pas == "cse" and j > 0 and pipe.startswith("HLO_passes_through"):
            def bag(path):
                c = collections.Counter()
                for comp in H.parse_hlo(open(path).read()):
                    for ins in comp["instrs"]:
                        c[ins["opcode"] + " / " + ((ins.get("meta_op") or "").split("/")[-1] or "-")] += 1
                return c
            diff = bag(seq[j - 1][3]) - bag(f)
            cse = {"removed": sum(diff.values()), "top": diff.most_common(10)}

    return {"module": key[1], "n_files": len(os.listdir(d)), "dump_bytes": tot, "passes_that_changed_hlo": len(seq),
            "pipelines": list(dict.fromkeys(s["pipeline"] for s in steps)), "steps": steps,
            "other_files": sorted(X.scrub(o) for o in other)[:30], "n_modules_compiled": n_modules,
            "other_modules": eager_modules, "cse": cse}


if __name__ == "__main__":
    res = {"versions": X.versions(), "flags": "--xla_dump_to=<dir> --xla_dump_hlo_pass_re=.*"}
    for n in sys.argv[1:] or ["mlp_block", "train_step"]:
        r = run(n)
        res[n] = r
        print(n, r["n_files"], "files", r["dump_bytes"], "bytes;", r["passes_that_changed_hlo"], "pass dumps; pipelines", r["pipelines"])
        for s in r["steps"][:3] + r["steps"][-3:]:
            print("  ", s)
    X.save("passes.json", res)
