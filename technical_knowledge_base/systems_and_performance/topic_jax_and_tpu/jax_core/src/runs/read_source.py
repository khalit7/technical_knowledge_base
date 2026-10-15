"""Excerpts of the pinned JAX source (tag jax-v0.11.2, commit 32544801), located by pattern so the line
numbers are checked, not typed. Writes out/source.json.

$JX_SCRATCH/venv/bin/python -I -B read_source.py
"""
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402

SRC = J.JAXSRC
assert SRC and os.path.isdir(SRC), "set JX_SCRATCH"
commit = subprocess.run(["git", "-C", SRC, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()

# (id, title, file, start pattern, end: number of lines or a pattern that ends the excerpt (inclusive))
SPECS = [
    ("jaxpr_merged", "Jaxpr and ClosedJaxpr are one class now", "jax/_src/core.py",
     r"^# ClosedJaxpr and Jaxpr have been merged", r"^ClosedJaxpr = Jaxpr"),
    ("eqn", "A jaxpr equation", "jax/_src/core.py", r"^class JaxprEqn:", r"^  ctx: JaxprEqnContext"),
    ("literal", "Literals: constants written into the program", "jax/_src/core.py", r"^class Literal:", 8),
    ("shapedarray", "ShapedArray: the abstract value of an array", "jax/_src/core.py", r"^class ShapedArray\(AbstractValue\):", 6),
    ("bind", "Primitive.bind: hand the operation to the current trace", "jax/_src/core.py",
     r"^    # This is equivalent to \"with take_current_trace\(\)\"", r"^    return trace.process_primitive\(self, args, params\)"),
    ("trace", "Trace: the interpreter interface", "jax/_src/core.py", r"^class Trace:", 18),
    ("evaltrace", "EvalTrace: run the primitive's impl on real values", "jax/_src/core.py", r"^class EvalTrace\(Trace\):", r"^        return primitive.impl\(\*args, \*\*params\)"),
    ("ctx", "TracingContext: the current trace is context, not data (\"stackless\")", "jax/_src/core.py", r"^class TracingContext:", r"^    return self.trace is None"),
    ("jaxprtrace", "DynamicJaxprTrace: record an equation (what jit and make_jaxpr use)", "jax/_src/interpreters/partial_eval.py",
     r"^  def process_primitive\(self, primitive, tracers, params, /\):\n    self.frame.is_high", r"^        primitive, jaxpr_tracers, params, source_info\)"),
    ("jvptrace", "JVPTrace: forward mode, one rule per primitive", "jax/_src/interpreters/ad.py",
     r"^class JVPTrace\(Trace\):", r"^      return maybe_jvp_tracer\(self, primal_out, tangent_out\)"),
    ("lintrace", "LinearizeTrace: primal now, tangent program for later (what grad uses)", "jax/_src/interpreters/ad.py",
     r"^  def process_primitive\(self, primitive, tracers, params, /\):\n    primals_in, tangents_in = unzip2\(map\(self.to_primal_tangent_pair, tracers\)\)\n    tangent_nzs",
     r"^      return maybe_linearize_tracer\(self, primal_out, tangent_nzs_out, tangent_out\)"),
    ("batchtrace", "BatchTrace: vmap, one batching rule per primitive", "jax/_src/interpreters/batching.py",
     r"^  def process_primitive\(self, p, tracers, params, /\):", r"^      raise NotImplementedError\(f\"Batching rule for '\{p\}' not implemented\"\)"),
    ("cond_select", "cond under vmap with a batched predicate becomes select", "jax/_src/lax/control_flow/conditionals.py",
     r"^  if index_dim is not None:\n    # Convert to a lax.select", 5),
    ("fori_scan", "fori_loop picks scan when the bounds are concrete", "jax/_src/lax/control_flow/loops.py",
     r"^  # If we can specialize on the trip count, call scan", r"^    use_scan = False\n\n  body_fun_dbg"),
    ("while_T", "why grad of a while_loop fails", "jax/_src/lax/control_flow/loops.py", r"^def _while_transpose_error", 3),
    ("while_batched", "a while_loop with a batched predicate: the body re-evaluates the predicate and selects", "jax/_src/lax/control_flow/loops.py",
     r"^    if batched:\n      body_pred_name_stack", 12),
    ("cvjp_jvp", "custom_vjp functions refuse forward mode", "jax/_src/custom_derivatives.py",
     r"can't apply forward-mode autodiff \(jvp\) to a custom_vjp function", 1),
    ("wsc_batch", "vmap of a sharding constraint: the batch axis is unconstrained unless spmd_axis_name names it", "jax/_src/pjit.py",
     r"^  unconstrained_dims = \{ud \+ \(d <= ud\) for ud in unconstrained_dims\}", 3),
    ("threefry", "Threefry-2x32: rotation constants and key schedule", "jax/_src/random/threefry2x32.py",
     r"^  rotations = \[np.array\(\[13, 15, 26, 6\]", 3),
    ("split_fold", "split and fold_in in partitionable mode: both hash (0, i) with the key", "jax/_src/random/threefry2x32.py",
     r"^@api.jit\(static_argnums=\(1,\), inline=api.Inline.JAX_EARLY\)\ndef _threefry_split_foldlike", r"^  return _threefry_fold_in\(key, jnp.asarray\(data, dtype='uint32'\)\)"),
    ("prng_table", "jax.random's own summary of the implementations", "jax/random.py",
     r"^   Property                            Threefry", r"^   exact ``jax.vmap`` over keys"),
    ("lattice", "The type promotion lattice (the default, non-strict one)", "jax/_src/dtypes.py",
     r"^  if not strict:\n    out: dict\[JAXType, list\[JAXType\]\] = \{", r"^    \}\n"),
    ("precision", "lax.Precision: what DEFAULT, HIGH and HIGHEST mean per backend", "jax/_src/lax/lax.py",
     r"^  DEFAULT:\n    Fastest mode, but least accurate", 12),
    ("committed", "jax.Array.committed", "jax/_src/array.py", r"^  def committed\(self\) -> bool:", 2),
]


def find(text, pat):
    m = re.search(pat, text, re.M)
    if not m:
        raise SystemExit("pattern not found: " + pat)
    return text[:m.start()].count("\n") + 1, m


out = []
for sid, title, rel, start, end in SPECS:
    path = os.path.join(SRC, rel)
    text = open(path, encoding="utf-8").read()
    s_line, m = find(text, start)
    lines = text.splitlines()
    if isinstance(end, int):
        e_line = s_line + end - 1
    else:
        rest = text[m.start():]
        mm = re.search(end, rest, re.M)
        if not mm:
            raise SystemExit("end pattern not found: " + end)
        e_line = s_line + rest[:mm.end()].rstrip("\n").count("\n")
    excerpt = "\n".join(lines[s_line - 1:e_line])
    out.append({"id": sid, "title": title, "file": rel, "start": s_line, "end": e_line, "text": excerpt,
                "url": f"https://github.com/jax-ml/jax/blob/jax-v0.11.2/{rel}#L{s_line}-L{e_line}"})
    print(f"{sid:14s} {rel}:{s_line}-{e_line}")
# every interpreter in the source: classes deriving from Trace
traces = []
for dp, _, fs in os.walk(os.path.join(SRC, "jax", "_src")):
    for fn in fs:
        if fn.endswith(".py"):
            rel = os.path.relpath(os.path.join(dp, fn), SRC)
            for i, ln in enumerate(open(os.path.join(dp, fn), encoding="utf-8"), 1):
                m = re.match(r"^class (\w+)\((?:core\.)?Trace(?:\[[^]]*\])?\):", ln)
                if m:
                    traces.append({"name": m.group(1), "file": rel, "line": i})
traces.sort(key=lambda t: (t["file"], t["line"]))
print(len(traces), "Trace subclasses")
J.save("source", {"trace_classes": traces, "repo": "https://github.com/jax-ml/jax", "tag": "jax-v0.11.2", "commit": commit, "excerpts": out})
