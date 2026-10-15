"""jit's path through the pinned JAX source (jax-v0.11.2, commit 32544801e261), located by pattern so the
line numbers are checked, not remembered. Output: src/xla/out/source.json (file:line plus a few lines quoted)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # noqa: E401,E702
import xc_common as X

ROOT = X.C.path("src", "jax")
# (step, file relative to the jax repo, pattern that starts the quoted lines, lines to quote, what it does)
REFS = [
    ("call", "jax/_src/pjit.py", "def jit_trace(jit_func", 5,
     "jitted(...).trace(...): infer parameters (flatten the pytrees, abstract the arguments), producing a Traced stage"),
    ("trace", "jax/_src/pjit.py", "      jaxpr, out_avals = pe.trace_to_jaxpr(fun, avals_ft, dbg)", 1,
     "_trace_for_jit runs your Python function once on abstract values and records a jaxpr"),
    ("trace-cache", "jax/_src/pjit.py", "def _infer_params_cached(", 1,
     "the tracing cache: same function, same abstract signature, no retrace"),
    ("lower", "jax/_src/pjit.py", "def _pjit_lower(", 1,
     "lowering hands the jaxpr to pxla.lower_sharding_computation"),
    ("lower-module", "jax/_src/interpreters/pxla.py", "    lowering_result = mlir.lower_jaxpr_to_module(", 1,
     "_cached_lowering_to_hlo builds one MLIR module (StableHLO) for the whole computation"),
    ("lower-eqns", "jax/_src/interpreters/mlir.py", "def jaxpr_subcomp(", 1,
     "jaxpr_subcomp walks the jaxpr equation by equation..."),
    ("lower-rule", "jax/_src/interpreters/mlir.py", "    if primitive in _lowerings:", 4,
     "...and looks up each primitive's lowering rule (platform-specific rules first, then the default)"),
    ("donate", "jax/_src/interpreters/mlir.py", "          attrs[\"jax.buffer_donor\"] = ir.BoolAttr.get(True)", 1,
     "donate_argnums marks inputs as buffer donors; XLA may then write outputs into them (tf.aliasing_output)"),
    ("compile", "jax/_src/interpreters/pxla.py", "    xla_executable = compiler.compile_or_get_cached(", 3,
     "_cached_compilation asks for an executable: from the persistent cache if one is configured and hit, else XLA compiles"),
    ("compile-cache", "jax/_src/compiler.py", "def compile_or_get_cached(", 1,
     "compile_or_get_cached: the persistent compilation cache sits here"),
    ("cache-threshold", "jax/_src/compiler.py", "  min_compile_time = config.persistent_cache_min_compile_time_secs.value", 2,
     "programs that compiled faster than jax_persistent_cache_min_compile_time_secs (default 1 s) are not written to disk"),
    ("cache-default", "jax/_src/config.py", "persistent_cache_min_compile_time_secs = float_state(", 3,
     "the default threshold"),
    ("remat", "jax/_src/ad_checkpoint.py", "def checkpoint(fun: Callable, *, prevent_cse", 1,
     "jax.checkpoint (alias jax.remat)"),
    ("remat-barrier", "jax/_src/ad_checkpoint.py", "    barrier_op = hlo.OptimizationBarrierOp(flat_barrier_args)", 1,
     "the lowering wraps the recomputation's inputs in an optimization barrier so XLA's CSE cannot merge it with the forward pass"),
    ("policy", "jax/_src/ad_checkpoint.py", "checkpoint_dots = dots_saveable = DotsSaveable(False)", 2,
     "the two dot policies: save every matmul output, or only matmuls without batch dimensions"),
    ("debug-nans", "jax/_src/config.py", "debug_nans = bool_state(", 5,
     "jax_debug_nans: check outputs for NaNs; on a hit, rerun the function de-optimised, op by op, to find the culprit"),
]


def find(rel, pat):
    p = os.path.join(ROOT, rel)
    lines = open(p).read().splitlines()
    hits = [i for i, l in enumerate(lines) if l.startswith(pat) or pat.strip() == l.strip() or (pat in l and pat.strip().startswith(("def ", "class ")) is False and l.strip().startswith(pat.strip()))]
    if not hits:
        raise SystemExit("not found: %s %s" % (rel, pat))
    return hits[0], lines


if __name__ == "__main__":
    out = []
    for step, rel, pat, n, what in REFS:
        i, lines = find(rel, pat)
        out.append({"step": step, "file": rel, "line": i + 1, "quote": "\n".join(lines[i:i + n]), "what": what,
                    "url": "https://github.com/jax-ml/jax/blob/jax-v0.11.2/%s#L%d" % (rel, i + 1)})
        print("%-15s %s:%d" % (step, rel, i + 1))
    X.save("source.json", {"jax_tag": "jax-v0.11.2", "commit": "32544801e26115ac1794926d027148abf3baf009",
                           "commit_date": "2026-09-17", "refs": out})
