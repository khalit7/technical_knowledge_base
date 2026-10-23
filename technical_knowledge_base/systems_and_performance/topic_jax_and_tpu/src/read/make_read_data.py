"""Paste real code and output into the Reading parts, between <!--CODE:name--> ... <!--/CODE:name--> markers.

Usage (from anywhere, plain python3): python3 src/read/make_read_data.py
Inputs: src/read/out/examples.json (written by run_examples.py) and src/read/out/step.json (the train step shown in
section 4, written by run_step.py). Idempotent: re-running replaces what is between the markers.
"""
import html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(HERE, "..", "parts")


def block(code, out, cap=None):
    s = '<pre class="rd-code">' + html.escape(code) + '</pre>'
    if out:
        s += '<pre class="rd-code rd-out">' + html.escape(out) + '</pre>'
    if cap:
        s += '<p class="rd-codecap">' + cap + '</p>'
    return s


def captions(ex):
    v = ex["_versions"]
    ran = "Ran with jax %s on %s (CPU), Python %s; output as printed%s." % (v["jax"], "Apple M1 Pro", v["python"], "%s")
    return ran


def main():
    ex = json.load(open(os.path.join(HERE, "out", "examples.json")))
    ran = captions(ex)
    notes = {
        "jaxpr": ran % "",
        "print": ran % "",
        "err_if": ran % " (raised while tracing, before anything runs; shown up to its documentation link)",
        "err_shape": ran % " (shown up to its documentation link)",
        "err_set": ran % "",
        "err_side": ran % "",
        "err_global": ran % "",
        "err_key": ran % "",
        "err_recompile": ran % " (JAX's compile log, its per-phase timing lines left out)",
        "err_oob": ran % "",
    }
    lead = {
        "print": "<b>One line, showing a tracer.</b> The body runs only while tracing; the second and third calls hit the cache and Python never runs. Use <code>jax.debug.print</code> for values at run time.",
        "err_if": "The tracer has no value, so Python cannot decide the branch. Use <code>jax.lax.cond</code> or <code>jnp.where</code>, or mark the argument static if it really is a configuration value.",
        "err_shape": "Every array shape must be known while tracing. Keep the shape fixed and mask: <code>jnp.where(x &gt; 0, x, 0)</code>, or <code>jnp.nonzero(x, size=k)</code> with a fixed maximum.",
        "err_set": "JAX arrays are immutable. <code>.at[i].set(v)</code> (also <code>.add</code>, <code>.multiply</code>, <code>.min</code>, <code>.max</code>) returns a new array; under <code>jit</code> it becomes an in-place write when the old array is dead.",
        "err_side": "The list grew once, during tracing, and holds a tracer. Return values instead of appending; for logging at run time use <code>jax.debug.print</code> or <code>jax.debug.callback</code>.",
        "err_global": "The global was read while tracing and baked into the compiled program as a constant. Pass anything that changes as an argument.",
        "err_key": "Same key, same numbers: a reused key silently correlates your dropout masks or initialisations. Split a fresh subkey for every use.",
        "err_recompile": "Each new length is a new signature: trace and compile again. Pad batches to a few fixed lengths (buckets) and log compiles while developing.",
        "err_oob": "Under JAX, out-of-bounds reads are clamped and out-of-bounds writes are dropped, with no error, because accelerators cannot raise mid-kernel. Check indices yourself, or use <code>jax.experimental.checkify</code>.",
    }
    files = sorted(f for f in os.listdir(PARTS) if f.startswith("20_read"))
    step = None
    sp = os.path.join(HERE, "out", "step.json")
    if os.path.exists(sp):
        step = json.load(open(sp))
    for f in files:
        p = os.path.join(PARTS, f)
        s = open(p).read()

        def rep(m):
            name = m.group(1)
            if name == "example":
                q = json.load(open(os.path.join(HERE, "..", "data", "equiv.json")))
                c, t, lg = q["cfg"], q["train"], q["logits"]
                body = ("one tiny decoder-only transformer language model over characters: the %d distinct characters of TinyShakespeare, "
                        "%d layers, width %d, %d attention heads, MLP width %d, context %d characters, <b>%s parameters</b>. It is written three times, "
                        "in PyTorch, in Flax NNX and in plain JAX with optax (<code>src/data/</code>), and all three read the same batches of %d sequences. "
                        "Started from the same weights, their logits agree to within %.1e and their training losses over %d steps to within %.1e "
                        "<span class=\"meas\">measured</span> (setup's <code>check_equiv.py</code>), so any later difference between them is a finding, not noise.") % (
                    c["vocab"], c["n_layers"], c["d_model"], c["n_heads"], c["d_ff"], c["ctx"], format(q["n_params"], ","), c["batch"],
                    max(lg["torch_vs_nnx"], lg["torch_vs_jax"]), q["steps"], max(t["max_abs_loss_diff"].values()))
            elif name == "twin":
                q = json.load(open(os.path.join(HERE, "..", "data", "equiv.json")))
                L = json.load(open(os.path.join(HERE, "..", "train", "out", "twin_long.json")))
                st, fs, v = q["train"]["step_time_median_s"], q["train"]["first_step_time_s"], L["val"]
                body = ("The running example's twins, from the same weights on the same batches for %s steps (Training lab): validation loss at the end %.4f in PyTorch, %.4f in plain JAX and %.4f in Flax NNX; "
                        "training losses within %.1e of each other over the first 500 steps and %.1e over all %s <span class=\"meas\">measured</span>. The gap is summation order: different kernels add the same numbers in different orders, "
                        "and training compounds the last-bit differences slowly (explained in <code>src/data/README.md</code> and the Training lab). "
                        "Median CPU step %.0f ms in PyTorch eager, %.0f ms in plain JAX and %.0f ms in Flax NNX over setup's 500-step run, the first JAX step %.1f s (tracing and compiling), "
                        "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority (the 4,000-step run's medians, %.0f, %.0f and %.0f ms, were taken under heavier load). On a CPU this small model is dominated by fixed costs, "
                        "so these speeds say nothing about accelerators; the {{Training lab|#t-train}} overlays the curves.") % (
                    format(L["steps"], ","), v["torch"][-1], v["jax"][-1], v["nnx"][-1], L["max_abs_loss_diff_by_window"]["torch_vs_jax"][0][2], L["max_abs_loss_diff"]["torch_vs_jax"], format(L["steps"], ","),
                    st["torch"] * 1000, st["jax"] * 1000, st["nnx"] * 1000, fs["jax"],
                    L["step_time_median_s"]["torch"] * 1000, L["step_time_median_s"]["jax"] * 1000, L["step_time_median_s"]["nnx"] * 1000)
            elif name == "coll":
                q = json.load(open(os.path.join(HERE, "..", "shard", "out", "rd_collectives.json")))
                mb = lambda b: ("%.1f MB" % (b / 1e6)) if b >= 1e5 else ("%.0f KB" % (b / 1e3))
                rows = ""
                for r in q["rows"]:
                    c = r["collectives"]
                    cs = ", ".join("%d %s" % (v["count"], k) for k, v in c.items()) or "none"
                    moved = mb(sum(v["bytes"] for v in c.values())) if c else "0"
                    rows += "<tr><td>%s</td><td>%s</td><td>%s</td><td class=\"num\">%s</td><td class=\"num\">%s</td><td class=\"num\">%.1e</td></tr>" % (
                        html.escape(r["label"]), " &times; ".join(map(str, r["mesh"])), cs, moved, mb(r["param_bytes_per_device"]), r["max_abs_loss_diff_vs_single"])
                body = ('<div class="rd-card"><h4>What the compiler inserted for six layouts of the running example on 8 simulated devices: one missing annotation costs 32 times the bytes</h4>'
                        '<div class="tw"><table class="rd-cmp"><thead><tr><th>Layout</th><th>Mesh</th><th>Collectives in the compiled step</th><th class="num">Bytes in them</th><th class="num">Weights per device</th><th class="num">Loss vs one device</th></tr></thead><tbody>'
                        + rows + '</tbody></table></div>'
                        '<p class="small mute">The second row is the lesson: sharding the weights and the batch but leaving the activations unannotated let the partitioner choose layouts that all-gather 32 times more bytes (105 MB against 3.3 MB); one <code>with_sharding_constraint</code> on the residual stream per block (the next row) fixed it. <span class="meas">measured</span> by the Sharding lab.</p><details class="dp"><summary>How it was counted, and three things the counts show</summary><div><p>Collectives counted in <code>compile().as_text()</code> of the whole step (forward, backward, clipping, AdamW, donated state), %d steps each, Auto mesh axes, jax 0.11.2 (<code>src/shard/out/rd_collectives.json</code>). Bytes are the sizes of the arrays the collectives carry, not link traffic. Data parallel compiles to a single all-reduce: XLA combined every gradient into one. FSDP shows all-reduces where a reduce-scatter is expected: XLA\'s CPU pipeline reduces then slices, while its GPU pipeline has the pass that turns that into a reduce-scatter (Sharding lab, XLA source). Tensor parallel\'s 18 all-reduces include 8 in the forward pass, two per block.</p></div></details></div>') % q["steps"]
            elif name == "step":
                if not step:
                    return m.group(0)
                body = block(step["code"], step["output"], step["caption"])
            elif name in ex:
                e = ex[name]
                body = (("<p>" + lead[name] + "</p>") if name in lead else "") + block(e["code"], e["output"], notes.get(name, ran % ""))
            else:
                return m.group(0)
            return "<!--CODE:%s-->%s<!--/CODE:%s-->" % (name, body, name)

        s2 = re.sub(r"<!--CODE:(\w+)-->(?:.*?<!--/CODE:\1-->)?", rep, s, flags=re.S)
        if s2 != s:
            open(p, "w").write(s2)
            print("filled", f)


if __name__ == "__main__":
    main()
