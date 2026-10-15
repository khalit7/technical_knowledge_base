"""Build parts/33_js_tr_0data.js (window.TRD) from the Training lab's measured outputs in out/ and the
running example's source files. Plain python3, no JAX needed:  python3 src/train/make_train_data.py
Every number the tab shows comes from here; check_train.mjs checks the built page against these files.
"""
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
DATA = os.path.join(HERE, "..", "data")
PART = os.path.join(HERE, "..", "parts", "33_js_tr_0data.js")
J = lambda n: json.load(open(os.path.join(OUT, n)))
r = lambda v, n=6: None if v is None else float("%.*g" % (n, v))


# ------------------------------------------------------------------ the port, line by line
# (key, note); lines in each file are tagged with a key when they contain one of its substrings.
NOTES = {
    "lin": "Linear layers. PyTorch stores weight as [out, in] and computes x @ W.T; Flax's kernel and the plain-JAX w are [in, out] (x @ w). Copying weights needs a transpose, and the 16 square 128 x 128 matrices load without any error if you forget it (section 4).",
    "rng": "Randomness is explicit in JAX: NNX modules take rngs=nnx.Rngs(seed) at construction, plain JAX splits a jax.random key; there is no global generator like torch.manual_seed.",
    "init": "Initialisers differ: nn.Linear defaults to kaiming_uniform(a=sqrt(5)), nnx.Linear to lecun_normal. Both twins use N(0, 0.02) weights, zero biases and LayerNorm (1, 0), set explicitly.",
    "split": "Head split: .view(...).transpose(1, 2) in PyTorch, .reshape(...).transpose(0, 2, 1, 3) in JAX (jnp's transpose takes the full permutation).",
    "mask": "Causal mask: masked_fill writes into a tensor; JAX arrays are immutable, so jnp.where builds a new one (XLA fuses it, nothing is copied).",
    "softmax": "Softmax and the attention-weighted sum: the same arithmetic.",
    "gelu": "GELU: torch's F.gelu is exact (erf) by default, jax.nn.gelu defaults to the tanh approximation; approximate=False makes them agree (a 7e-5 logit difference otherwise, section 4).",
    "ln": "LayerNorm epsilon: PyTorch 1e-5, nnx.LayerNorm 1e-6 by default; set to 1e-5 on both sides (a 5e-3 logit difference otherwise).",
    "list": "A list of blocks: nn.ModuleList registers submodules; Flax 0.12 wants nnx.List; the plain-JAX twin keeps a Python list of dicts (a pytree).",
    "fwd": "The forward pass: identical structure (pre-LayerNorm residual blocks). NNX uses __call__; plain JAX is a function of (params, x).",
    "emb": "Embeddings: nn.Embedding vs nnx.Embed, or plain indexing params['tok_emb'][idx].",
    "loss": "Cross-entropy: F.cross_entropy flattens and averages; optax.softmax_cross_entropy_with_integer_labels returns one loss per position and you take .mean().",
    "opt": "Optimiser: parameter groups in torch become an optax mask (a pytree of booleans, or a function returning one) on optax.adamw; clipping becomes the first link of optax.chain.",
    "sched": "Schedule: LambdaLR multiplies the base lr and is stepped after opt.step(); optax calls the schedule with its own update count starting at 0. Same values here.",
    "grad": "Gradients: loss.backward() fills .grad on every parameter; JAX returns them: nnx.value_and_grad(loss_fn)(model, ...) gives grads as a State with the model's structure, jax.value_and_grad as a pytree like params.",
    "update": "The update: zero_grad, backward, clip and step become one call (optimizer.update(model, grads) in NNX; tx.update then optax.apply_updates in plain JAX). Nothing to zero: gradients are fresh return values.",
    "jit": "Compilation: the PyTorch twin runs eagerly; the JAX twins compile the whole step (forward, backward, update) into one XLA program with @nnx.jit or jax.jit(..., donate_argnums=(0, 1)), whose donated inputs let XLA update the buffers in place.",
    "ret": "Return values: PyTorch calls loss.item() (a host sync); the JAX steps return device arrays and the caller decides when to sync.",
}
TAGS = {
    "torch": [("lin", ["nn.Linear("]), ("split", [".view("]), ("mask", ["masked_fill", "torch.ones(T, T"]), ("softmax", ["s.softmax"]),
              ("gelu", ["F.gelu"]), ("ln", ["nn.LayerNorm("]), ("list", ["nn.ModuleList"]), ("init", ["nn.init.", "named_parameters():", "GPT-2-style init", "endswith(\"bias\")", "ln_f\"):", "            else:"]),
              ("emb", ["nn.Embedding", "self.tok_emb(idx)"]), ("fwd", ["x = x + self.attn", "return x + self.mlp", "for b in self.blocks", "x = b(x)", "return self.head("]),
              ("loss", ["F.cross_entropy", "logits = model(x)"]), ("opt", ["torch.optim.AdamW", "decay = [p", "rest = [p", "{\"params\": rest", "lr=cfg[\"lr\"], betas"]),
              ("sched", ["LambdaLR", "sched.step()"]), ("grad", ["loss.backward()", "loss = loss_fn(model, x, y)"]),
              ("update", ["opt.zero_grad", "clip_grad_norm_", "opt.step()"]), ("ret", ["return loss.item()"])],
    "nnx": [("lin", ["nnx.Linear(", "_linear(d, d, rngs)", "self.fc1, self.fc2 = _linear", "self.head = _linear"]), ("rng", ["rngs=nnx.Rngs", "*, rngs"]),
            ("init", ["_init = nnx.initializers"]), ("split", ["split = lambda t"]), ("mask", ["jnp.where(jnp.tril"]), ("softmax", ["jax.nn.softmax"]),
            ("gelu", ["jax.nn.gelu"]), ("ln", ["nnx.LayerNorm("]), ("list", ["_List(", "_List = "]), ("emb", ["nnx.Embed(", "self.tok_emb(idx)"]),
            ("fwd", ["x = x + self.attn", "return x + self.mlp", "for b in self.blocks", "x = b(x)", "return self.head("]),
            ("loss", ["softmax_cross_entropy_with_integer_labels"]), ("sched", ["learning_rate=lambda count"]), ("opt", ["optax.adamw(", "optax.chain(", "clip_by_global_norm", "b1=cfg", "weight_decay=cfg", "nnx.Optimizer("]),
            ("sched", ["learning_rate=lambda count"]), ("grad", ["nnx.value_and_grad"]), ("update", ["optimizer.update(model, grads)"]),
            ("jit", ["@nnx.jit"]), ("ret", ["return loss, optax.global_norm"])],
    "jax": [("lin", ["lin = lambda i, o", "def linear(", "return x @ p[\"w\"]"]), ("rng", ["jax.random.split(key", "jax.random.normal"]),
            ("init", ["n = lambda shape: 0.02", "ln = lambda: {"]), ("split", ["split = lambda t"]), ("mask", ["mask = jnp.tril", "s = jnp.where(mask"]),
            ("softmax", ["jax.nn.softmax"]), ("gelu", ["jax.nn.gelu"]), ("ln", ["def layer_norm(", "var = ((x - mu)", "return (x - mu) / jnp.sqrt", "mu = x.mean("]),
            ("list", ["blocks = [{\"ln1\": ln()"]), ("emb", ["params[\"tok_emb\"][idx]", "return {\"tok_emb\": n(("]),
            ("fwd", ["x = x + attention(", "return x + mlp(", "for p in params[\"blocks\"]", "x = block(p, x, cfg)", "return layer_norm(params[\"ln_f\"]"]),
            ("loss", ["softmax_cross_entropy_with_integer_labels", "logits = apply(params"]), ("sched", ["learning_rate=lambda count"]), ("opt", ["optax.adamw(", "optax.chain(", "clip_by_global_norm", "b1=cfg", "weight_decay=cfg", "lambda path, _: getattr(path[-1]"]),
            ("sched", ["learning_rate=lambda count"]), ("grad", ["jax.value_and_grad(loss_fn)"]), ("update", ["tx.update(grads", "optax.apply_updates"]),
            ("jit", ["jax.jit(train_step, donate_argnums"]), ("ret", ["return params, opt_state, loss"])],
}
RANGES = {   # (first line containing, last line containing), inclusive; a gap marker goes between ranges
    "torch": ("model_torch.py", [("class Attention", "return self.wo("), ("class MLP", "return self.fc2("), ("class Block", "return x + self.mlp"),
                                 ("class TinyLM", "return self.head("), ("def loss_fn", "return F.cross_entropy"), ("def make_optimizer", "return loss.item()")]),
    "nnx": ("model_nnx.py", [("_init = nnx", "return nnx.Linear("), ("class Attention", "return self.wo("), ("class MLP", "return self.fc2("),
                             ("class Block", "return x + self.mlp"), ("class TinyLM", "return self.head("), ("def loss_fn", "return optax.softmax"),
                             ("def make_optimizer", "return loss, optax.global_norm")]),
    "jax": ("model_jax.py", [("def init_params", "\"ln_f\": ln(), \"head\""), ("def layer_norm", "return linear(p[\"wo\"]"), ("def mlp", "return x + mlp("),
                             ("def apply(", "return layer_norm(params[\"ln_f\"]"), ("def loss_fn", "return optax.softmax"), ("def decay_mask", "return jax.jit(train_step")]),
}


def port_pane(kind):
    fn, ranges = RANGES[kind]
    lines = open(os.path.join(DATA, fn)).read().split("\n")
    out, tagged = [], set()
    for a, b in ranges:
        i = next(k for k, l in enumerate(lines) if a in l)
        j = next(k for k in range(i, len(lines)) if b in lines[k])
        if out:
            out.append(["...", None])
        for l in lines[i:j + 1]:
            if not l.strip() or '"""' in l:          # blank lines and one-line docstrings left out
                continue
            key = next((k for k, subs in TAGS[kind] if any(s in l for s in subs)), None)
            out.append([l.rstrip(), key]); tagged.add(key)
    missing = [k for k, _ in TAGS[kind] if k not in tagged]
    assert not missing, (kind, missing)
    return out


def main():
    T = {}
    # frameworks
    fw = J("frameworks.json")
    T["fw"] = {"res": {k: fw["results"][k] for k in ("nnx", "linen", "equinox", "haiku", "ref_max_abs", "nnx_param_count")},
               "code": fw["source"], "versions": fw["results"]["versions"]}
    # snippets
    sn = J("snippets.json")
    T["snip"] = {k: v for k, v in sn.items() if not k.startswith("_")}
    T["snipv"] = sn["_versions"]
    # optax
    oc = J("optax_check.json")
    T["ox"] = {k: {"diff": [r(v, 3) for v in oc[k]["max_abs_param_diff_per_step"]], "moved": r(oc[k]["max_abs_param_change_from_init"][-1], 4)}
               for k in ("matched", "matched_noclip", "defaults", "wd_matched")}
    T["ox"]["n"] = oc["n_steps"]; T["ox"]["worst"] = oc["defaults_worst"][:3]; T["ox"]["ndecay"] = oc["n_decayed_tensors"]; T["ox"]["ntens"] = oc["n_tensors"]
    T["ox"]["wd_derived"] = (0.01 - 1e-4) * 1e-3 * 1.0 * oc["n_steps"]
    ch = J("chain_ref.json")
    if os.path.exists(os.path.join(OUT, "chain_check.json")):
        T["chainCheck"] = J("chain_check.json")["text"]
    T["chain"] = {"coords": ch["coords"], "grads": ch["grads"], "params0": ch["params0"], "mask": ch["decay_mask"]}
    # port
    T["port"] = {"torch": port_pane("torch"), "nnx": port_pane("nnx"), "jax": port_pane("jax"), "notes": NOTES}
    # pitfalls
    pf = J("pitfalls.json")
    eq = json.load(open(os.path.join(DATA, "equiv.json")))
    T["pit"] = {"torch": pf["torch_loss"], "torch_val300": eq["train"]["val"]["torch"][eq["train"]["val_at"].index(300)],
                "v": {k: {"label": v["label"], "loss": v["loss"], "d0": r(v["init_logit_max_abs_diff"], 3), "val": r(v["val_300"], 6),
                          "maxd": r(v["max_abs_loss_diff_vs_torch"], 3)} for k, v in pf["variants"].items()}}
    # twins, long
    tw = J("twin_long.json")
    n = tw["steps"]; E = 10
    L = tw["loss"]
    win = lambda a, b: [r(max(abs(L[a][i] - L[b][i]) for i in range(s, min(s + E, n))), 3) for s in range(0, n, E)]
    load_peak = 0.0
    log = os.path.join(os.environ.get("JX_SCRATCH", ""), "train", "twin_long.log")
    if os.path.exists(log):
        for l in open(log):
            m = re.match(r"^\d+ \{.*\} \d+s ([\d.]+)$", l.strip())
            if m: load_peak = max(load_peak, float(m.group(1)))
    T["twin"] = {"steps": n, "every": E, "loss": {k: L[k][::E] for k in L}, "dwin": {"tj": win("torch", "jax"), "jn": win("jax", "nnx")},
                 "val_at": tw["val_at"], "val": tw["val"], "drift": tw["drift"], "max_abs_loss_diff": tw["max_abs_loss_diff"],
                 "first_over": {{"1e-05": "e5", "0.0001": "e4", "0.001": "e3", "0.01": "e2"}[k]: v for k, v in tw["first_step_loss_diff_over"].items()}, "r500max": max(tw["first500_vs_setup_run_max_abs"].values()),
                 "time": tw["step_time_median_s"], "time_p": tw["step_time_p10_p90_s"], "first": tw["first_step_time_s"],
                 "clip": tw["clip_active_steps"], "load_peak": round(load_peak) if load_peak else None,
                 "wall_s": tw["wall_s"], "date": tw["date"],
                 "val_min_torch": min(tw["val"]["torch"]), "val_min_at": tw["val_at"][tw["val"]["torch"].index(min(tw["val"]["torch"]))]}
    # checkpoints
    ck = J("ckpt_resume.json")
    T["ck"] = {k: ck[k] for k in ("total_steps", "save_at", "n_windows", "batches_per_epoch", "bit_identical_state", "n_arrays_compared",
                                  "max_abs_diff", "losses_identical", "resumed_losses_first3", "full_losses_100_102", "save_call_s",
                                  "save_total_s", "iterator_state", "restored_step", "losses_full")}
    T["ck"]["files"] = ck["files"]; T["ck"]["n_files"] = len(ck["files"]); T["ck"]["total_mb"] = sum(s for _, s in ck["files"]) / 1e6
    T["cks"] = J("ckpt_sharded.json")
    T["cks"].pop("devices", None)
    # grain code shown in section 7: the real pipeline() from ckpt_resume.py
    src = open(os.path.join(HERE, "ckpt_resume.py")).read().split("\n")
    i = next(k for k, l in enumerate(src) if l.startswith("def pipeline"))
    j = next(k for k in range(i, len(src)) if "return n, len(ds)" in src[k])
    T["grain_code"] = "\n".join(src[i:j + 1])
    # mixed precision
    mx = J("mixed.json")
    T["mx"] = {k: {kk: v[kk] for kk in ("loss", "val_300", "param_bytes", "opt_state_bytes", "ln_scale_entries", "ln_scale_unmoved", "grad_dtype", "param_dtype")}
               for k, v in mx["variants"].items()}
    T["mx_spacing"] = mx["bf16_spacing_at_1"]
    T["mxmem"] = {k: (v["param_bytes"] + v["opt_state_bytes"]) / 1e6 for k, v in mx["variants"].items()}
    s = "// Generated by src/train/make_train_data.py from src/train/out/*.json and src/data/model_*.py. Do not edit.\nwindow.TRD=" + \
        json.dumps(T, separators=(",", ":")) + ";\n"
    open(PART, "w").write(s)
    print("wrote", PART, len(s), "bytes")


if __name__ == "__main__":
    main()
