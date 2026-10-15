"""XLA's pass pipeline, pass by pass, as diffs.

Dumps the HLO after every pass that changed it (XLA_FLAGS --xla_dump_to --xla_dump_hlo_pass_re=.*) for two programs:
  attn: one attention sub-block of the running example, forward and backward
        (value_and_grad of sum(x + attention(layer_norm(x))) with respect to the block's parameters and x)
  step: the whole train step (model_jax.make_train_step), the root Compiler lab's program
and records, for each dumped pass: instruction counts, fusion counts, the opcode histogram change and a unified
diff of the program text (metadata stripped), truncated. Dumps stay in $JX_SCRATCH/xp/dump_*.
Run as:  passes_diff.py dump attn|step   (in a fresh process: XLA_FLAGS must be set before jax starts)
         passes_diff.py summarise         (reads both dumps -> lab/out/passes_diff.json)
"""
import collections
import difflib
import glob
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

C = X.C
MAX_DIFF = {"attn": 50, "step": 14}
MAX_COL = 170


def dump(which):
    import jax
    import jax.numpy as jnp
    import model_jax as MJ
    cfg = C.CFG
    params, tx, opt, xb, yb = X.setup_state()
    if which == "attn":
        p0 = params["blocks"][0]
        x = jax.random.normal(jax.random.key(0), (cfg["batch"], cfg["ctx"], cfg["d_model"]), jnp.float32)

        def f(p, x):
            y = x + MJ.attention(p["attn"], MJ.layer_norm(p["ln1"], x, cfg["ln_eps"]), cfg["n_heads"])
            return y.sum()
        fn = jax.jit(jax.value_and_grad(f, argnums=(0, 1)))
        fn.lower(p0, x).compile()
    else:
        step = MJ.make_train_step(cfg, tx)
        step.lower(params, opt, xb, yb).compile()


def run_dump(which):
    d = X.big("dump_" + which, "x")
    d = os.path.dirname(d)
    for f in glob.glob(os.path.join(d, "*")):
        os.remove(f)
    env = dict(os.environ)
    env["XLA_FLAGS"] = "--xla_dump_to=%s --xla_dump_hlo_pass_re=.*" % d
    subprocess.run([sys.executable, "-I", "-B", os.path.abspath(__file__), "_dump", which], env=env, check=True)
    print(which, "dump files:", len(os.listdir(d)))


FILE_RX = re.compile(r"^module_(\d+)\.(.+?)\.(\d{4})\.(.+?)\.after_(.+?)\.before_(.+?)\.txt$")


def modules(d):
    """{module stem: [(seq, pipeline, after, before, path)]} for per-pass files."""
    out = collections.defaultdict(list)
    for f in os.listdir(d):
        m = FILE_RX.match(f)
        if m:
            out["module_%s.%s" % (m.group(1), m.group(2))].append((int(m.group(3)), m.group(4), m.group(5), m.group(6),
                                                                  os.path.join(d, f)))
    for k in out:
        out[k].sort()
    return out


def stats(txt):
    comps = X.HT.parse_hlo(txt)
    top = [c for c in comps if not c["name"].startswith("fused_") and "fused" not in c["name"]]
    # computations that are bodies of fusions are named fused_computation*, *_fusion*, ynn_fusion...: use callers
    called_by_fusion = set()
    for c in comps:
        for i in c["instrs"]:
            if i["opcode"] == "fusion" and i.get("calls"):
                called_by_fusion.add(i["calls"].lstrip("%"))
    top = [c for c in comps if c["name"] not in called_by_fusion]
    hist = collections.Counter(i["opcode"] for c in top for i in c["instrs"])
    return {"instructions": sum(hist.values()), "fusions": hist.get("fusion", 0),
            "in_fusions": sum(len(c["instrs"]) for c in comps if c["name"] in called_by_fusion),
            "hist": hist}


def norm(txt):
    lines = []
    for l in X.hlo_no_tables(txt).splitlines():
        if l.startswith("HloModule"):
            continue
        lines.append(X.strip_meta(l))
    return lines


def summarise_one(which):
    d = os.path.join(C.scratch(), "xp", "dump_" + which)
    mods = modules(d)
    stem = max(mods, key=lambda k: len(mods[k]))           # the program (other modules are tiny helpers)
    seq = mods[stem]
    steps = []
    prev_lines, prev_stats = None, None
    for (n, pipe, after, before, path) in seq:
        txt = open(path).read()
        st = stats(txt)
        lines = norm(txt)
        rec = {"n": n, "pipeline": pipe, "pass": after, "next": before,
               "instructions": st["instructions"], "fusions": st["fusions"], "in_fusions": st["in_fusions"]}
        if prev_lines is not None:
            diff = list(difflib.unified_diff(prev_lines, lines, lineterm="", n=1))[2:]
            rec["added"] = sum(1 for l in diff if l.startswith("+"))
            rec["removed"] = sum(1 for l in diff if l.startswith("-"))
            delta = collections.Counter(st["hist"])
            delta.subtract(prev_stats["hist"])
            rec["delta"] = {k: v for k, v in sorted(delta.items(), key=lambda kv: -abs(kv[1])) if v}
            cut = MAX_DIFF[which]
            rec["diff"] = [X.scrub(l)[:MAX_COL] for l in diff[:cut]]
            rec["diff_truncated"] = max(0, len(diff) - cut)
        steps.append(rec)
        prev_lines, prev_stats = lines, st
    changed = [s for s in steps if s.get("added", 0) or s.get("removed", 0)]
    files = sorted(os.listdir(d))
    others = sorted({re.sub(r"^module_\d+\.", "", s).split(".")[0] for s in mods if s != stem})
    first = open(seq[0][4]).read()
    last_opt = [f for f in files if f.startswith(stem) and f.endswith("cpu_after_optimizations.txt")]
    return {"module": stem.split(".", 1)[1], "dump_files": len(files),
            "dump_bytes": sum(os.path.getsize(os.path.join(d, f)) for f in files),
            "per_pass_files": len(seq), "changed": len(changed), "other_modules": others,
            "start": {"instructions": stats(first)["instructions"]},
            "end_file": last_opt[0].split(".", 2)[-1] if last_opt else None,
            "steps": changed}


def summarise():
    out = {"versions": X.versions(), "flags": "--xla_dump_to=<dir> --xla_dump_hlo_pass_re=.*",
           "programs": {}}
    for w in ("attn", "step"):
        out["programs"][w] = summarise_one(w)
        p = out["programs"][w]
        print(w, p["module"], "files", p["dump_files"], "per-pass", p["per_pass_files"], "changed", p["changed"])
    X.save("passes_diff.json", out)


if __name__ == "__main__":
    if sys.argv[1] == "_dump":
        dump(sys.argv[2])
    elif sys.argv[1] == "dump":
        run_dump(sys.argv[2])
    else:
        summarise()
