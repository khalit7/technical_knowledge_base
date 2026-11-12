"""Checks that ../index.html embeds exactly the data runs/make_data.py builds from runs/out/*.json, that every
data-k span points at a value that exists, and that the numbers written directly in the prose agree with the data.
Plain Python 3: python3 -B check_data.py (after sh build.sh).
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
fails = 0


def ok(cond, msg):
    global fails
    print(("ok   " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


# 1. embedded data equals a fresh build from the recorded outputs
m = re.search(r"window\.JC=(\{.*?\});\n</script>", html, re.S)
ok(m is not None, "window.JC found in the page")
emb = json.loads(m.group(1))
subprocess.run([sys.executable, "-B", os.path.join(HERE, "runs", "make_data.py")], check=True, capture_output=True)
part = open(os.path.join(HERE, "parts", "22_js_jc_data.js"), encoding="utf-8").read()
fresh = json.loads(part[len("window.JC="):].rstrip().rstrip(";"))
ok(emb == fresh, "embedded data identical to make_data.py output from runs/out/*.json")


# 2. every data-k / data-code path resolves (same longest-key rule as the page's JCU.get)
def get(o, path):
    rest = path
    while rest:
        if isinstance(o, list):
            k, _, rest2 = rest.partition(".")
            if not k.isdigit() or int(k) >= len(o):
                return KeyError
            o, rest = o[int(k)], rest2
            continue
        if not isinstance(o, dict):
            return KeyError
        if rest in o:
            return o[rest]
        ks = sorted((k for k in o if rest.startswith(k + ".")), key=len, reverse=True)
        if not ks:
            return KeyError
        o, rest = o[ks[0]], rest[len(ks[0]) + 1:]
    return o


paths = re.findall(r'data-(?:k|code)="([^"]+)"', html)
missing = [p for p in paths if get(emb, p) is KeyError or get(emb, p) is None]
ok(not missing, f"{len(paths)} data paths resolve ({missing[:5]})")

# 3. numbers written in the prose, checked against the data
J = emb
ad, cf, cv = J["ad"], J["cf"], J["cv"]
row = lambda n, v: next(r for r in cf["loops"]["rows"] if r["n"] == n and r["variant"] == v)  # noqa: E731
vg = ad["model"]["flops"]["value_and_grad"] / ad["model"]["flops"]["forward (loss)"]
ok(f"{vg:.2f}" == "2.88", f"value_and_grad / forward FLOPs = {vg:.3f} (prose: 2.88)")
hvp = ad["hess"]["flops"]["one Hessian-vector product: jvp(grad)"] / ad["hess"]["flops"]["grad"]
ok(f"{hvp:.1f}" == "1.7", f"HVP / grad FLOPs = {hvp:.2f} (prose: 1.7x)")
ff = ad["hess"]["flops"]["jacfwd(jacfwd)"] / ad["hess"]["flops"]["jax.hessian = jacfwd(jacrev)"]
ok(31 <= ff <= 33, f"jacfwd(jacfwd) / hessian FLOPs = {ff:.1f} (prose: about 32 times)")
rr = abs(ad["hess"]["flops"]["jacrev(jacrev)"] / ad["hess"]["flops"]["jax.hessian = jacfwd(jacrev)"] - 1)
ok(rr < 0.002, f"jacrev(jacrev) within 0.2% of the Hessian's FLOPs ({100 * rr:.2f}%)")
ok(round(row(1000, "scan")["compile_s"], 2) == 0.15 and round(row(1000, "python for")["compile_s"]) == 41,
   f"scan {row(1000, 'scan')['compile_s']:.3f} s against python for {row(1000, 'python for')['compile_s']:.1f} s (prose: 0.15 s against 41 s)")
cr = cf["cond_vmap"]["ms_pred_batched"] / cf["cond_vmap"]["ms_pred_not_batched"]
ok(100 <= cr <= 2000, f"batched cond / unbatched = {cr:.0f}x (prose: several hundred times / hundreds of times)")
ok(cf["while_vmap"]["counts"] == [1, 10, 100, 1000], "vmapped while counts [1, 10, 100, 1000]")
mlp_params = 128 * 512 + 512 + 512 * 128 + 128
ok(mlp_params == 131712, "MLP weights 131,712")
ok(abs(J["vm"]["axis_name"]["out_first_col"][0] - 1 / 30) < 1e-6, "normalize example divides by 30")
ok(J["pr"]["prefix"]["partitionable=True"]["(4,)[:3] equals (3,)"] is True and J["pr"]["prefix"]["partitionable=False"]["(4,)[:3] equals (3,)"] is False,
   "prefix stability true with partitionable, false without")
ok(J["cv"]["softplus"]["sweep"]["x"][120] == 0.0, "softplus sweep index 120 is x = 0")
ok(J["cv"]["softplus"]["sweep"]["stable rewrite"]["grad"][120] == 0.0, "stable rewrite gradient 0 at x = 0")
ok(J["cv"]["fixed_point"]["iters_to_converge"] == 15, "fixed point converged in 15 iterations")
ok(len(J["src"]["trace_classes"]) == 8, "8 Trace subclasses")
ok(J["pt"]["map_with_path"]["n_true"] == 25, "25 weight matrices matched by path")
ok(J["ad"]["mlp"]["torch_saved"].__len__() == 4 and len(J["ad"]["mlp"]["residuals"]) == 7, "MLP: 7 JAX residuals, 4 PyTorch saved tensors")
# absorbed from the root's Transforms lab (src/inputs/root_xf_*.json), quoted as static prose
rb = J["rb"]
ok(rb["side"]["count"] == 1 and rb["side"]["calls"] == 3 and rb["side"]["log_len"] == 1 and len(rb["side"]["debug_print"]) == 3,
   "side effects: count 1 after 3 calls, log 1 entry, debug.print 3 times")
ok(len(set(rb["np_random_in_jit"])) == 1 and rb["time_in_jit_same"] is True, "np.random and time.time frozen at trace time")
ok(rb["prng"]["reuse_same_mask_frac"] == 1.0 and f"{100 * rb['prng']['split_same_mask_frac']:.1f}" == "81.8", "masks: 100% same key, 81.8% split keys")
rc = {d["id"]: d for d in J["rc"]["drills"]}
ok(rc["pyfloat"]["compiles"] == 0 and rc["static"]["compiles"] == 2 and rc["lambda"]["compiles"] == 3 and rc["global"]["compiles"] == 0,
   "jit drills: python float 0, static 2, lambda 3, global 0 compiles")
# root facts quoted
ok("5.8" in html and "826,368" in html, "root figures quoted (5.8, 826,368)")
# 4. numbers written into the step lists of the 3D figures (2026-11 rollout), against the data
T = J["tape"]
fwd = [e for e in T["vjp"]["eqns"] if not e.get("d")]
ok(len(T["vjp"]["eqns"]) == 35 and len(fwd) == 15 and "35 equations: 15 forward" in html and "20 backward" in html, "Fig. 3: VJP program 35 equations, 15 forward, 20 backward")
ok(len(T["jvp"]["eqns"]) == 32 and "same five stages, 32 equations" in html, "Fig. 3: JVP program 32 equations")
fl = ad["mlp"]["flops"]
ok(f'{fl["vjp (forward + backward)"] / fl["forward"]:.2f}' == "2.03" and "2.03 times the forward FLOPs" in html, "Fig. 3: VJP 2.03 times the forward FLOPs")
ok(f'{fl["jvp"] / fl["forward"]:.2f}' == "2.48" and "2.48 times the forward FLOPs" in html, "Fig. 3: JVP 2.48 times the forward FLOPs")
rj = sum(r["bytes"] for r in ad["mlp"]["residuals"]); rt = sum(r["bytes"] for r in ad["mlp"]["torch_saved"])
ok(f"{rj/1e3:.1f}" == "297.0" and f"{rt/1e3:.1f}" == "280.6" and "297.0 KB in JAX, 280.6 KB in PyTorch" in html, "Fig. 3: tape totals 297.0 KB and 280.6 KB")
by = {r["src"].split(" from")[0]: r["bytes"] for r in ad["mlp"]["residuals"]}
ok(any(r["bytes"] == 2048 and "constant" in r["src"] for r in ad["mlp"]["residuals"]) and "2.0 KB) on the tape" in html, "Fig. 3: x residual 2.0 KB")
ok(sum(1 for r in ad["mlp"]["residuals"] if r["bytes"] == 8192) == 4 and "8.2 KB each" in html, "Fig. 3: GELU residuals 8.2 KB")
ok(any(r["bytes"] == 262144 for r in ad["mlp"]["residuals"]) and "262 KB)" in html, "Fig. 3: W2 residual 262 KB")
ok(128 * 512 + 512 + 512 * 128 + 128 == 131712 and "131,712 weights" in html, "Fig. 3: 131,712 weights in the MLP")
nv = J["vm"]["nested"]
ok(nv["shape"] == [6, 7] and "a:f32[6,32] b:f32[7,32]" in nv["jaxpr"] and "float32[6,32] against float32[7,32], all 42 scores" in html, "Fig. 4: q [6,32], k [7,32], 42 scores")
pm = J["pm"]["final"]
ok(pm["eager"] == [3.0, 6.0, 9.0] == pm["jit"] and pm["grad"] == [3.0, 3.0, 3.0] and pm["vmap_shape"] == [2, 3] and "eager and jit give [3, 6, 9], grad gives [3, 3, 3]" in html and "shape [2, 3]" in html, "section 11: final primitive results")
for st in J["pm"]["steps"]:
    errs = [v for v in st["result"].values() if v != "ok"]
    if errs:
        ok(errs[0].replace("NotImplementedError: ", "") in html, "section 11 step list quotes: " + errs[0][:60])
sc = row(1000, "scan")
ok(sc["eqns_total"] == 4 and sc["loop_prims"].get("scan") == 1 and "4 equations in all" in html, "Fig. 2: scan jaxpr 4 equations in all")
ok("\u2014" not in html, "no em-dashes")
print("FAILED", fails if fails else "") if fails else print("all checks passed")
sys.exit(1 if fails else 0)
