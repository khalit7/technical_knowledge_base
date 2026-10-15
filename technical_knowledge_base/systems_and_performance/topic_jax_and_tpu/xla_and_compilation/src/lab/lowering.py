"""From jaxpr to StableHLO to HLO: lowering, measured on the running example.

1. The attention sub-block (x + attention(layer_norm(x)), block 0, x float32 [32, 128, 128]) in four forms:
   jaxpr, StableHLO, HLO before optimisation, optimised HLO (texts scrubbed of paths).
2. The whole train step: for every jaxpr primitive, how many StableHLO operations and how many unoptimised HLO
   instructions it became (matched through the location names JAX writes into the module), i.e. what each
   lowering rule expands to.
3. PJRT: the backend this jaxlib talks to, its version strings, the registered backend factories and plugins.
4. Source locations of the lowering path, located by pattern in the pinned jax-v0.11.2 and XLA 91888df6 files.
Output: lab/out/lowering.json
"""
import collections
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import model_jax as MJ  # noqa: E402

C = X.C
cfg = C.CFG
params, tx, opt, xb, yb = X.setup_state()
p0 = params["blocks"][0]
x = jax.random.normal(jax.random.key(0), (cfg["batch"], cfg["ctx"], cfg["d_model"]), jnp.float32)


def attn_block(p, x):
    return x + MJ.attention(p["attn"], MJ.layer_norm(p["ln1"], x, cfg["ln_eps"]), cfg["n_heads"])


def hlo_body(txt):
    """HLO text without the FileNames / FunctionNames / FileLocations / StackFrames tables."""
    return X.hlo_no_tables(txt)


def stablehlo_clean(txt):
    """StableHLO without loc(...) annotations and #loc lines (as_text() default already omits most)."""
    out = []
    for l in txt.splitlines():
        if l.startswith("#loc"):
            continue
        out.append(re.sub(r"\s*loc\(#loc\d*\)", "", l))
    return "\n".join(out) + "\n"


# ------------------------------------------------------------------ 1. four forms of the attention sub-block
tr = jax.jit(attn_block).trace(p0, x)
jaxpr_txt = str(tr.jaxpr)
lo = tr.lower()
shlo = lo.as_text()
hlo0 = lo.as_text(dialect="hlo")
co = lo.compile()
hlo1 = co.as_text()
forms = {
    "jaxpr": X.scrub(jaxpr_txt),
    "stablehlo": X.scrub(stablehlo_clean(shlo)),
    "hlo": X.scrub(hlo_body(hlo0)),
    "opt_hlo": X.scrub(hlo_body(hlo1)),
}
forms_counts = {
    "jaxpr_eqns": X.HT.jaxpr_counts(tr.jaxpr)["flat_eqns"],
    "stablehlo_ops": X.HT.stablehlo_counts(shlo)["ops"],
    "hlo_instructions": sum(len(c["instrs"]) for c in X.HT.parse_hlo(hlo0)),
    "opt_entry": [i["opcode"] for c in X.HT.parse_hlo(hlo1) if c["entry"] for i in c["instrs"]],
    "bytes": {k: len(v.encode()) for k, v in forms.items()},
}
print("attention block:", {k: v for k, v in forms_counts.items() if k != "opt_entry"})

# ------------------------------------------------------------------ 2. primitive -> StableHLO ops -> HLO instrs
step = MJ.make_train_step(cfg, tx)
trs = step.trace(params, opt, xb, yb)
jc = X.HT.jaxpr_counts(trs.jaxpr)
los = trs.lower()
dbg = los.as_text(debug_info=True)
# location aliases: #loc12 = loc("jit(train_step)/.../mul"(#loc3)) ; fused locs: loc(fused[...])
alias = {}
for m in re.finditer(r'^(#loc\d+) = loc\((.*)\)$', dbg, re.M):
    alias[m.group(1)] = m.group(2)


def loc_name(ref, depth=0):
    s = alias.get(ref, "")
    if depth > 8:
        return None
    m = re.match(r'"([^"]+)"', s)
    if m:
        return m.group(1)
    m = re.search(r'(#loc\d+)', s)
    return loc_name(m.group(1), depth + 1) if m else None


def prim_of(name):
    if not name:
        return None
    last = name.split("/")[-1]
    last = re.sub(r"\[.*\]$", "", last)
    return last


op_rx = re.compile(r"\b((?:stablehlo|chlo)\.[a-z_0-9]+|func\.call)\b")
sh_by_prim = collections.Counter()
sh_ops_by_prim = collections.defaultdict(collections.Counter)
unmatched = 0
for l in dbg.splitlines():
    s = l.strip()
    if s.startswith("#loc") or s.startswith("func.func") or s.startswith("module"):
        continue
    m = op_rx.search(s)
    if not m or m.group(1) in ("stablehlo.return",):
        continue
    lm = re.search(r"loc\((#loc\d+)\)\s*$", s)
    pr = prim_of(loc_name(lm.group(1))) if lm else None
    if pr is None:
        unmatched += 1
        pr = "(no location)"
    sh_by_prim[pr] += 1
    sh_ops_by_prim[pr][m.group(1)] += 1

hlo_step = los.as_text(dialect="hlo", debug_info=True)
hl_by_prim = collections.Counter()
for c in X.HT.parse_hlo(hlo_step):
    for ins in c["instrs"]:
        pr = prim_of(ins.get("meta_op"))
        hl_by_prim[pr or "(no op_name)"] += 1

rows = []
for prim, n in jc["flat_by_prim"].items():
    rows.append({"prim": prim, "jaxpr": n, "stablehlo": sh_by_prim.get(prim, 0),
                 "stablehlo_ops": dict(sh_ops_by_prim[prim].most_common(6)) if prim in sh_ops_by_prim else {},
                 "hlo": hl_by_prim.get(prim, 0)})
rows.sort(key=lambda r: -r["stablehlo"])
extra_sh = {k: v for k, v in sh_by_prim.items() if k not in jc["flat_by_prim"]}
extra_hl = {k: v for k, v in hl_by_prim.items() if k not in jc["flat_by_prim"]}
print("step: jaxpr", jc["flat_eqns"], "stablehlo", sum(sh_by_prim.values()), "hlo", sum(hl_by_prim.values()))
for r in rows[:12]:
    print(" ", r["prim"], r["jaxpr"], r["stablehlo"], r["hlo"], r["stablehlo_ops"])
print("  stablehlo ops under names that are not primitives:", extra_sh)
print("  hlo instrs under names that are not primitives:", dict(list(extra_hl.items())[:12]))

# one primitive's lowering, shown end to end: erfc (in the exact GELU)
erfc_sh = [re.sub(r"\s*loc\(#loc\d*\)", "", l.strip()) for l in dbg.splitlines()
           if "chlo.erfc" in l][:1]

# ------------------------------------------------------------------ 3. PJRT
from jax.extend import backend as jeb  # noqa: E402
from jax._src import xla_bridge as xb  # noqa: E402

be = jeb.get_backend()
dev = jax.devices()[0]
pjrt = {
    "platform": be.platform,
    "platform_version": X.scrub(str(be.platform_version)),
    "device": str(dev), "device_kind": dev.device_kind,
    "backend_factories": sorted(xb._backend_factories.keys()),
    "backends_initialised": sorted(xb.backends().keys()),
    "plugins_discovered": sorted(getattr(xb, "_plugin_callbacks", []) and [] or []),
}
try:
    from importlib.metadata import entry_points
    pjrt["jax_plugins_entry_points"] = sorted(e.name for e in entry_points(group="jax_plugins"))
except Exception as e:  # noqa: BLE001
    pjrt["jax_plugins_entry_points"] = "error: %s" % e
print("pjrt:", pjrt)

# ------------------------------------------------------------------ 4. source locations
J, XL = X.jax_locate, X.xla_locate
src = [
    dict(step="jit lowers", **J("jax/_src/pjit.py", r"^def _pjit_lower\(")),
    dict(step="one module for the whole computation", **J("jax/_src/interpreters/pxla.py", r"lowering_result = mlir\.lower_jaxpr_to_module\(")),
    dict(step="module builder", **J("jax/_src/interpreters/mlir.py", r"^def lower_jaxpr_to_module\(")),
    dict(step="walk the equations", **J("jax/_src/interpreters/mlir.py", r"^def jaxpr_subcomp\(")),
    dict(step="find the rule: platform-specific first, then the default", **J("jax/_src/interpreters/mlir.py", r"# First the platform-specific rules", ctx=4)),
    dict(step="register a rule", **J("jax/_src/interpreters/mlir.py", r"^def register_lowering\(", ctx=2)),
    dict(step="a one-line rule: exp", **J("jax/_src/lax/lax.py", r"^mlir\.register_lowering\(exp_p,")),
    dict(step="the shared elementwise rule", **J("jax/_src/lax/lax.py", r"^def _nary_lower_hlo\(")),
    dict(step="dot_general's rule", **J("jax/_src/lax/lax.py", r"^def _dot_general_lower\(")),
    dict(step="a rule written in JAX itself", **J("jax/_src/interpreters/mlir.py", r"^def lower_fun\(")),
    dict(step="donation becomes an attribute", **J("jax/_src/interpreters/mlir.py", r'attrs\["jax\.buffer_donor"\] = ir\.BoolAttr\.get\(True\)')),
    dict(step="compile or load from cache", **J("jax/_src/compiler.py", r"^def compile_or_get_cached\(")),
    dict(step="hand the module to PJRT", **J("jax/_src/compiler.py", r"^def backend_compile_and_load\(")),
    dict(step="PJRT plugins: discovery", **J("jax/_src/xla_bridge.py", r"^def discover_pjrt_plugins\(")),
    dict(step="PJRT plugins: registration", **J("jax/_src/xla_bridge.py", r"^def register_plugin\(")),
    dict(step="PJRT C API version", **XL("xla/pjrt/c/pjrt_c_api.h", r"^#define PJRT_API_MINOR")),
]
for s in src:
    print(" ", s["file"], s["line"], s["quote"][:70])

X.save("lowering.json", {
    "versions": X.versions(),
    "attention_block": {"what": "x + attention(layer_norm(x)), block 0 of the running example, x float32 [32, 128, 128], forward only",
                        "forms": forms, "counts": forms_counts},
    "step_expansion": {"jaxpr_eqns": jc["flat_eqns"], "stablehlo_ops": sum(sh_by_prim.values()),
                       "hlo_instructions": sum(hl_by_prim.values()), "rows": rows,
                       "stablehlo_without_primitive_name": dict(extra_sh),
                       "hlo_without_primitive_name": dict(extra_hl), "unmatched_locations": unmatched,
                       "erfc_line": erfc_sh},
    "pjrt": pjrt,
    "source": src,
})
