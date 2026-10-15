"""Ahead of time: jit(...).lower().compile(), serialized executables, and jax.export.

1. AOT stages on the running example's forward pass (logits = apply(params, x)): lower, compile, call the
   Compiled object; what happens when the arguments do not match.
2. jax.experimental.serialize_executable: the compiled CPU executable as bytes, loaded back in a fresh process.
3. jax.export: the forward pass exported for CPU, CUDA and TPU from this machine (lowering needs no device),
   serialized; the StableHLO of each platform compared; deserialized and called in a fresh process; a batch-
   polymorphic export ("b" symbolic) called at two batch sizes; the VJP of an export.
Output: lab/out/export.json
"""
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

C = X.C
ART = os.path.dirname(X.big("export", "x"))


def forward_and_inputs():
    import jax
    import model_jax as MJ
    cfg = C.CFG
    params, tx, opt, xb, yb = X.setup_state()

    def fwd(params, x):
        return MJ.apply(params, x, cfg)
    return jax, fwd, params, xb


def parent():
    import jax
    import jax.numpy as jnp
    import numpy as np
    from jax import export
    jax_, fwd, params, xb = forward_and_inputs()
    res = {"versions": X.versions(), "label": "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority"}

    # ---------------- 1. AOT stages
    jf = jax.jit(fwd)
    t0 = time.process_time()
    lowered = jf.lower(params, xb)
    t1 = time.process_time()
    compiled = lowered.compile()
    t2 = time.process_time()
    out = compiled(params, xb)
    ref = jf(params, xb)
    aot = {"lower_cpu_s": round(t1 - t0, 3), "compile_cpu_s": round(t2 - t1, 3),
           "same_as_jit": float(jnp.max(jnp.abs(out - ref))),
           "in_tree": str(compiled.in_tree)[:120], "out_shape": str(out.shape)}
    try:
        compiled(params, xb[:16])
    except Exception as e:  # noqa: BLE001
        aot["wrong_shape_error"] = "%s: %s" % (type(e).__name__, X.scrub(str(e)).splitlines()[0][:300])
    res["aot"] = aot
    print("aot", aot)

    # ---------------- 2. serialized executable
    from jax.experimental import serialize_executable as se
    payload, in_tree, out_tree = se.serialize(compiled)
    with open(os.path.join(ART, "fwd_executable.bin"), "wb") as f:
        f.write(payload)
    np.save(os.path.join(ART, "ref_logits.npy"), np.asarray(ref))
    res["serialized_executable"] = {"bytes": len(payload)}

    # ---------------- 3. jax.export
    exps = {}
    for plats in (("cpu",), ("cuda",), ("tpu",), ("cpu", "cuda", "tpu")):
        t0 = time.process_time()
        ex = export.export(jax.jit(fwd), platforms=plats)(params, xb)
        blob = ex.serialize()
        txt = ex.mlir_module()
        key = "+".join(plats)
        with open(os.path.join(ART, "fwd_%s.jaxexport" % key), "wb") as f:
            f.write(blob)
        cc = sorted(set(re.findall(r'stablehlo\.custom_call @([\w.]+)', txt)))
        ops = X.HT.stablehlo_counts(txt)
        exps[key] = {"platforms": list(ex.platforms), "serialized_bytes": len(blob),
                     "calling_convention_version": ex.calling_convention_version,
                     "stablehlo_ops": ops["ops"], "custom_calls": cc, "funcs": ops["funcs"],
                     "nr_devices": ex.nr_devices, "export_cpu_s": round(time.process_time() - t0, 3),
                     "module_attrs": sorted(set(re.findall(r"(jax\.[a-z_]+|mhlo\.[a-z_]+)\s*=", txt.split("func.func")[0])))}
        if key == "cpu+cuda+tpu":
            # how one module serves three platforms: the platform index argument and the case op
            main = [l.strip() for l in txt.splitlines() if "func.func public @main" in l][:1]
            case = [l.strip()[:200] for l in txt.splitlines() if "stablehlo.case" in l][:2]
            exps[key]["main_signature"] = [X.scrub(m)[:400] for m in main]
            exps[key]["case_lines"] = case
        print(key, {k: v for k, v in exps[key].items() if k not in ("main_signature", "case_lines")})
    res["export"] = exps
    res["export_versions"] = {"min": export.minimum_supported_calling_convention_version,
                              "max": export.maximum_supported_calling_convention_version}
    # first lines of the CPU export's StableHLO (what ships), scrubbed
    ex = export.export(jax.jit(fwd), platforms=("cpu",))(params, xb)
    head = [l for l in ex.mlir_module().splitlines() if l.strip()][:6]
    res["export_head"] = [X.scrub(re.sub(r"loc\(#loc\d*\)", "", l))[:260] for l in head]
    res["in_avals"] = [str(a) for a in ex.in_avals][:4] + ["... %d inputs in all" % len(ex.in_avals)]

    # shape polymorphism: batch b
    b, = export.symbolic_shape("b")
    spec_x = jax.ShapeDtypeStruct((b, xb.shape[1]), xb.dtype)
    expo = export.export(jax.jit(fwd))(params, spec_x)
    poly = {"in_aval_x": str(expo.in_avals[-1]), "out_aval": str(expo.out_avals[0]),
            "serialized_bytes": len(expo.serialize())}
    for n in (2, 8):
        o = expo.call(params, xb[:n])
        poly["call_%d" % n] = {"shape": list(o.shape), "max_diff_vs_jit": float(jnp.max(jnp.abs(o - ref[:n])))}
    shlo = expo.mlir_module()
    poly["shape_assertions"] = len(re.findall(r"shape_assertion", shlo))
    poly["dynamic_ops"] = sorted(set(re.findall(r"stablehlo\.(dynamic_\w+|get_dimension_size)", shlo)))
    res["shape_poly"] = poly
    print("poly", poly)
    with open(os.path.join(ART, "fwd_poly.jaxexport"), "wb") as f:
        f.write(expo.serialize())

    # vjp of an export
    def loss(params, x):
        return fwd(params, x).mean()
    exl = export.export(jax.jit(loss))(params, xb)
    blob = exl.serialize(vjp_order=1)
    exl2 = export.deserialize(blob)
    g_ex = jax.grad(exl2.call)(params, xb)
    g_ref = jax.grad(loss)(params, xb)
    diff = max(float(jnp.max(jnp.abs(a - b))) for a, b in zip(jax.tree.leaves(g_ex), jax.tree.leaves(g_ref)))
    res["vjp"] = {"serialized_bytes_vjp1": len(blob), "serialized_bytes_vjp0": len(exl.serialize()),
                  "grad_max_diff": diff}
    print("vjp", res["vjp"])

    # ---------------- fresh process: load the executable and the CPU export, call, compare
    p = subprocess.run([sys.executable, "-I", "-B", os.path.abspath(__file__), "_child"], capture_output=True, text=True,
                       env=dict(os.environ))
    if p.returncode:
        print(p.stderr[-2000:])
        raise SystemExit("child failed")
    res["fresh_process"] = json.loads(p.stdout.strip().splitlines()[-1])
    print("fresh", res["fresh_process"])
    res["source"] = {
        "compat_doc": X.jax_locate("docs/export/export.md", r"\*\*up to 6 months newer\*\*", ctx=1),
        "fwd_compat_doc": X.jax_locate("docs/export/export.md", r"\*\*up to 3 weeks older\*\*", ctx=1),
        "version10": X.jax_locate("docs/export/export.md", r"^  \* Version 10 propagate"),
        "doc_stale": X.jax_locate("docs/export/export.md", r"^As of June 2024, all function exported with version 9"),
        "serialize_executable": X.jax_locate("jax/experimental/serialize_executable.py", r"^def serialize\("),
        "aot_doc": X.jax_locate("docs/aot.md", r"^# Ahead-of-time lowering and compilation"),
    }
    X.save("export.json", res)


def child():
    """A fresh process: load the serialized CPU executable and the serialized export, run both."""
    import jax
    import jax.numpy as jnp
    import numpy as np
    from jax import export
    from jax.experimental import serialize_executable as se
    jax_, fwd, params, xb = forward_and_inputs()
    ref = np.load(os.path.join(ART, "ref_logits.npy"))
    out = {}
    # export: deserialize and call (compiles the StableHLO here)
    t0 = time.process_time()
    ex = export.deserialize(open(os.path.join(ART, "fwd_cpu.jaxexport"), "rb").read())
    o = ex.call(params, xb)
    out["export_call"] = {"cpu_s": round(time.process_time() - t0, 3), "max_diff": float(np.max(np.abs(np.asarray(o) - ref)))}
    ex3 = export.deserialize(open(os.path.join(ART, "fwd_cpu+cuda+tpu.jaxexport"), "rb").read())
    o3 = ex3.call(params, xb)
    out["multi_platform_call_on_cpu"] = {"max_diff": float(np.max(np.abs(np.asarray(o3) - ref)))}
    try:
        ext = export.deserialize(open(os.path.join(ART, "fwd_tpu.jaxexport"), "rb").read())
        ext.call(params, xb)
    except Exception as e:  # noqa: BLE001
        out["tpu_only_on_cpu_error"] = "%s: %s" % (type(e).__name__, X.scrub(str(e)).splitlines()[0][:300])
    # serialized executable: load without compiling
    jf = jax.jit(fwd)
    lowered = jf.lower(params, xb)
    t0 = time.process_time()
    payload = open(os.path.join(ART, "fwd_executable.bin"), "rb").read()
    comp = se.deserialize_and_load(payload, lowered.compile().in_tree if False else jax.tree.structure(((params, xb), {})),
                                   jax.tree.structure(jnp.zeros(1)))
    t_load = time.process_time() - t0
    o2 = comp(params, xb)
    out["executable_load"] = {"cpu_s": round(t_load, 3), "max_diff": float(np.max(np.abs(np.asarray(o2) - ref)))}
    print(json.dumps(out))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "_child":
        child()
    else:
        parent()
