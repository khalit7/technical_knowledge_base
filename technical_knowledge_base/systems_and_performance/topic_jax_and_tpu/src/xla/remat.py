"""Rematerialisation (jax.checkpoint) on the running example's train step: memory against recompute.

For each policy and each number k of the 4 blocks wrapped in jax.checkpoint, compile the full train step
(value_and_grad + optax update, donated like model_jax.make_train_step) and record memory_analysis and
cost_analysis. Deterministic (no timings here; timing.py times a few of them).
Output: src/xla/out/remat.json
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # noqa: E401,E702

import jax
import optax

import xc_common as X
import model_jax as MJ

C = X.C
cfg = C.CFG
params, tx, opt, x, y = X.setup_state()
cp = jax.checkpoint_policies
POLICIES = {
    "nothing_saveable": cp.nothing_saveable,            # save only the block's inputs: recompute everything
    "dots_saveable": cp.dots_saveable,                  # keep every matmul output, recompute the rest
    "dots_with_no_batch_dims_saveable": cp.dots_with_no_batch_dims_saveable,  # keep weight matmuls, not q@k or p@v
}


def make_step(k, policy):
    blk = jax.checkpoint(lambda p, h: MJ.block(p, h, cfg), policy=policy) if policy else None

    def apply_k(params, idx):
        T = idx.shape[1]
        h = params["tok_emb"][idx] + params["pos_emb"][:T]
        for i, p in enumerate(params["blocks"]):
            h = blk(p, h) if (blk is not None and i < k) else MJ.block(p, h, cfg)
        return MJ.layer_norm(params["ln_f"], h, cfg["ln_eps"]) @ params["head"]["w"]

    def loss(params, x, y):
        return optax.softmax_cross_entropy_with_integer_labels(apply_k(params, x), y).mean()

    def step(params, opt_state, x, y):
        l, g = jax.value_and_grad(loss)(params, x, y)
        u, opt_state = tx.update(g, opt_state, params)
        return optax.apply_updates(params, u), opt_state, l, optax.global_norm(g)
    return jax.jit(step, donate_argnums=(0, 1))


def measure(k, name):
    f = make_step(k, POLICIES.get(name))
    co = f.lower(params, opt, x, y).compile()
    m = co.memory_analysis()
    ca = co.cost_analysis()
    ca = ca[0] if isinstance(ca, (list, tuple)) else ca
    txt = co.as_text()
    return {"k": k, "policy": name, "temp_bytes": int(m.temp_size_in_bytes), "argument_bytes": int(m.argument_size_in_bytes),
            "output_bytes": int(m.output_size_in_bytes), "alias_bytes": int(m.alias_size_in_bytes),
            "flops": float(ca.get("flops", 0)), "bytes_accessed": float(ca.get("bytes accessed", 0)),
            "opt_barriers": txt.count("opt-barrier("), "dots": txt.count(" dot(")}


if __name__ == "__main__":
    rows = [measure(0, "none")]
    print(rows[-1])
    for name in POLICIES:
        for k in range(1, cfg["n_layers"] + 1):
            rows.append(measure(k, name))
            print(rows[-1])
    # check: the loss and gradient norm are identical with and without remat (same program, recomputed)
    a = make_step(0, None)(jax.tree.map(lambda v: v.copy(), params), jax.tree.map(lambda v: v.copy(), opt), x, y)
    b = make_step(4, cp.nothing_saveable)(jax.tree.map(lambda v: v.copy(), params), jax.tree.map(lambda v: v.copy(), opt), x, y)
    chk = {"loss_none": float(a[2]), "loss_full_remat": float(b[2]), "gnorm_none": float(a[3]), "gnorm_full_remat": float(b[3]),
           "max_param_diff": float(max(jax.tree.leaves(jax.tree.map(lambda u, v: abs(u - v).max(), a[0], b[0]))))}
    print(chk)
    X.save("remat.json", {"versions": X.versions(), "what": "train step, first k of 4 blocks under jax.checkpoint(policy); donated",
                          "rows": rows, "check": chk})
