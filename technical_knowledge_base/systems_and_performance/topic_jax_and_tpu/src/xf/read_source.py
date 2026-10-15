"""Excerpts of the pinned JAX source (tag jax-v0.11.2, commit 32544801e26115ac1794926d027148abf3baf009)
that show the transformations are interpreters: each excerpt is found by an anchor line and copied
verbatim with its real line numbers. Reads the shallow clone in $JX_SCRATCH/src/jax.
Output: out/source.json"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xfcommon as X  # noqa: E402

import common as C  # noqa: E402

ROOT = C.path("src", "jax")
COMMIT = subprocess.run(["git", "-C", ROOT, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()

# (id, file, anchor (first line, exact prefix after stripping), n lines, optional start offset, what it shows)
SPEC = [
    ("bind", "jax/_src/core.py", "    prev_trace = trace_ctx.trace", 6, 0,
     "Every primitive call goes through Primitive.bind, which hands the operation to the current trace's process_primitive. The trace in charge decides what 'doing' an operation means."),
    ("bind_with_trace", "jax/_src/core.py", "  def bind_with_trace(self, trace, args, avals, params, /):", 5, 0,
     "bind_with_trace: the one-line dispatch at the heart of every transformation."),
    ("eval", "jax/_src/core.py", "class EvalTrace(Trace):", 17, 0,
     "The bottom of the stack: EvalTrace runs the primitive's implementation on real arrays (eager JAX)."),
    ("eval_jaxpr", "jax/_src/core.py", "def eval_jaxpr(jaxpr: Jaxpr, consts, *args, propagate_source_info=True) -> list[Any]:", 25, 0,
     "eval_jaxpr: an interpreter over a jaxpr. It walks the equations in order and binds each primitive again, so whatever trace is current (jvp, vmap, another jit) transforms the replayed program."),
    ("jit_trace", "jax/_src/interpreters/partial_eval.py", "  def process_primitive(self, primitive, tracers, params, /):", 13, 0,
     "DynamicJaxprTrace (the tracer under jit and make_jaxpr): it does not compute; it asks the primitive for its output abstract value and appends an equation to the jaxpr being built."),
    ("jvp", "jax/_src/interpreters/ad.py", "class JVPTrace(Trace):", 18, 23,
     "JVPTrace (forward mode, jax.jvp): each tracer carries a primal and a tangent; process_primitive looks up the primitive's JVP rule in primitive_jvps and calls it on the parent trace."),
    ("linearize", "jax/_src/interpreters/ad.py", "class LinearizeTrace(Trace):", 21, 43,
     "LinearizeTrace (what jax.grad uses in 0.11.2, through vjp and linearize): the primal is computed on the parent trace, the linear tangent part is recorded on a separate tangent trace, which is later transposed to run backwards."),
    ("grad", "jax/_src/api.py", "    ans, vjp_py, *maybe_aux = vjp(f_partial, *dyn_args, has_aux=has_aux)", 4, 0,
     "value_and_grad is vjp with a cotangent of 1.0: grad is not a separate mechanism."),
    ("batch", "jax/_src/interpreters/batching.py", "  def process_primitive(self, p, tracers, params, /):", 23, 0,
     "BatchTrace (vmap): each tracer carries a value and the dimension that is batched; process_primitive calls the primitive's batching rule, which returns the batched result and where its batch dimension now is."),
    ("tanh_rule", "jax/_src/lax/lax.py", "tanh_p = standard_unop(_float | _complex, 'tanh')", 14, 0,
     "Where a primitive gets its rules: tanh's JVP rule (d tanh = g * (1 - tanh^2)) and its lowering to the HLO tanh op."),
    ("dot_rules", "jax/_src/lax/lax.py", "ad.defbilinear(dot_general_p,", 6, 0,
     "dot_general's rules: bilinear (its JVP and transpose come from the two transpose functions) and a batching rule that folds the vmapped dimension into the dot's batch dimensions."),
    ("jit_cpp", "jax/_src/pjit.py", "def _cpp_pjit(fun: Callable, jit_info: PjitInfo):", 10, 0,
     "jax.jit's fast path is C++: it keeps its own cache of compiled executables and only calls this Python cache_miss when the call's signature is new; cache_miss is where tracing and compiling start."),
    ("jit_cache", "jax/_src/pjit.py", "def _infer_params(", 20, 0,
     "jit's trace cache: the key is the Python function, the jit options, the argument signature (static values and pytree structure) and the abstract values. A miss traces again (_trace_for_jit)."),
    ("jit_cache_fn", "jax/_src/pjit.py", "@weakref_lru_cache", 6, 0,
     "The cache itself: a weak-reference LRU cache on the function object."),
]


def find(lines, anchor, after=0):
    for i in range(after, len(lines)):
        if lines[i].rstrip("\n") == anchor or lines[i].startswith(anchor):
            return i
    raise KeyError(anchor)


out = {"repo": "https://github.com/jax-ml/jax", "tag": "jax-v0.11.2", "commit": COMMIT, "excerpts": []}
for id_, f, anchor, n, off, why in SPEC:
    with open(os.path.join(ROOT, f), encoding="utf-8") as fh:
        lines = fh.readlines()
    after = 0
    if id_ == "jit_trace":                       # the DynamicJaxprTrace one, not the earlier JaxprTrace
        after = find(lines, "class DynamicJaxprTrace(core.Trace):")
    if id_ == "jit_cache_fn":
        after = find(lines, "class InferParamsCacheEntry:")
    i = find(lines, anchor, after) + off
    text = "".join(lines[i:i + n]).rstrip("\n")
    out["excerpts"].append({"id": id_, "file": f, "start": i + 1, "end": i + n, "text": text, "why": why,
                            "url": f"https://github.com/jax-ml/jax/blob/{COMMIT}/{f}#L{i + 1}-L{i + n}"})
    print(id_, f, i + 1, "-", i + n, "|", lines[i].rstrip()[:70])
assert COMMIT == "32544801e26115ac1794926d027148abf3baf009", COMMIT
X.save("source", out)
