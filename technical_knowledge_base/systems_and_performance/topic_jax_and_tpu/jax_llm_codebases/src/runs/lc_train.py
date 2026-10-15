"""Train the running example with MaxText's own train step on CPU, on the running example's real batches,
and train the root's plain-JAX twin with the three settings MaxText cannot express changed to MaxText's
(tanh GELU, warmup from 0, MaxText's adamw mask) to check that the two steps are the same computation.
Also records which Python functions run in step 0 (tracing) and in step 1 (cached executable).

Run: JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B lc_train.py  -> ../out/train.json
"""
import sys, os, json, time, io, contextlib, logging, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env
ROOT_DATA = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data"))
sys.path.insert(0, ROOT_DATA)
logging.disable(logging.WARNING)
import numpy as np, jax, jax.numpy as jnp, optax
from flax import nnx
from flax.core.spmd import logical_axis_rules
import common as C, model_jax as MJ
with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
    from maxtext.configs import pyconfig
    from maxtext.utils import train_utils, sharding
    from maxtext.trainers.pre_train import train as mt_train

STEPS = int(os.environ.get("LC_STEPS", "200")); WARM = 50
BASE = os.path.join(lc_env.MAXTEXT, "src", "maxtext", "configs", "base.yml")
COMMON = dict(run_name="lc_train", hardware="cpu", skip_jax_distributed_system=True, enable_checkpointing=False,
              base_output_directory=os.path.join(lc_env.JX, "lc", "mt_out"), jax_cache_dir="", enable_goodput_recording=False,
              dataset_type="synthetic", packing=False)
RUNEX = dict(decoder_block="gpt3", base_emb_dim=128, base_num_query_heads=4, base_num_kv_heads=4, base_mlp_dim=512,
             base_num_decoder_layers=4, head_dim=32, vocab_size=65, max_target_length=128, trainable_position_size=128,
             mlp_activations=["gelu"], logits_via_embedding=False, fused_qkv=False, enable_dropout=False,
             dtype="float32", attention="dot_product", per_device_batch_size=32, normalization_layer_epsilon=1e-5,
             matmul_precision="highest",
             # optimizer as close to the running example as MaxText's flags allow
             opt_type="adamw", learning_rate=1e-3, adam_b1=0.9, adam_b2=0.95, adam_eps=1e-8, adam_weight_decay=0.1,
             gradient_clipping_threshold=1.0, steps=STEPS, warmup_steps_fraction=WARM / STEPS,
             lr_schedule_type="cosine", learning_rate_final_fraction=1.0,          # cosine from lr to lr = constant
             adamw_mask=["bias", "scale", "embedding"])                            # no decay on biases, norms, embeddings
cfgd = C.CFG; L, H, D = cfgd["n_layers"], cfgd["n_heads"], cfgd["d_model"]; dh = D // H

t0 = time.perf_counter()
with contextlib.redirect_stdout(io.StringIO()):
    cfg = pyconfig.initialize([sys.argv[0], BASE], **COMMON, **RUNEX)
    (init_rng, ckpt, state_mesh_shardings, model, mesh, lr_sched, data_it, data_loader, rampup, eval_it, state) = \
        train_utils.setup_train_loop(cfg, None)
t_setup = time.perf_counter() - t0

# copy the running example's initial weights into the train state (same mapping as lc_fwd.py)
sd = dict(np.load(C.path("data", "init_torch.npz")))
T = lambda a: np.ascontiguousarray(a.T)
st = lambda fn: np.stack([fn(i) for i in range(L)], axis=1)
M = {"token_embedder.embedding": sd["tok_emb.weight"], "decoder.position_embedder.embedding": sd["pos_emb.weight"],
     "decoder.decoder_norm.scale": sd["ln_f.weight"] - 1.0, "decoder.decoder_norm.bias": sd["ln_f.bias"],
     "decoder.logits_dense.kernel": T(sd["head.weight"]),
     "decoder.layers.pre_self_attention_norm.scale": st(lambda i: sd[f"blocks.{i}.ln1.weight"] - 1.0),
     "decoder.layers.pre_self_attention_norm.bias": st(lambda i: sd[f"blocks.{i}.ln1.bias"]),
     "decoder.layers.mlp.mlp_layer_norm.scale": st(lambda i: sd[f"blocks.{i}.ln2.weight"] - 1.0),
     "decoder.layers.mlp.mlp_layer_norm.bias": st(lambda i: sd[f"blocks.{i}.ln2.bias"]),
     "decoder.layers.mlp.wi.kernel": st(lambda i: T(sd[f"blocks.{i}.mlp.fc1.weight"])),
     "decoder.layers.mlp.wi.bias": st(lambda i: sd[f"blocks.{i}.mlp.fc1.bias"]),
     "decoder.layers.mlp.wo.kernel": st(lambda i: T(sd[f"blocks.{i}.mlp.fc2.weight"])),
     "decoder.layers.mlp.wo.bias": st(lambda i: sd[f"blocks.{i}.mlp.fc2.bias"])}
for nm, key in (("query", "wq"), ("key", "wk"), ("value", "wv")):
    M[f"decoder.layers.self_attention.{nm}.kernel"] = st(lambda i: T(sd[f"blocks.{i}.attn.{key}.weight"]).reshape(D, H, dh))
    M[f"decoder.layers.self_attention.{nm}.bias"] = st(lambda i: sd[f"blocks.{i}.attn.{key}.bias"].reshape(H, dh))
M["decoder.layers.self_attention.out.kernel"] = st(lambda i: T(sd[f"blocks.{i}.attn.wo.weight"]).reshape(H, dh, D))
M["decoder.layers.self_attention.out.bias"] = st(lambda i: sd[f"blocks.{i}.attn.wo.bias"])
pstate = nnx.state(state.model, nnx.Param)
n_set = 0
for path, v in jax.tree_util.tree_leaves_with_path(pstate, is_leaf=lambda x: isinstance(x, nnx.Variable)):
    k = ".".join(str(getattr(p, "key", p)) for p in path)
    old = v.get_value(); v.set_value(jax.device_put(jnp.asarray(M[k], old.dtype), old.sharding)); n_set += 1
assert n_set == len(M), n_set

# which parameters MaxText's adamw mask decays
from maxtext.optimizers import optimizers as mt_opt
mfn = mt_opt.get_adamw_mask(cfg)
decayed = sorted(jax.tree_util.keystr(p, simple=True, separator="/") for p, m in jax.tree_util.tree_leaves_with_path(mfn(nnx.to_pure_dict(pstate))) if m)

jit_model, state = nnx.split(state)
params_shardings, state_mesh_shardings = sharding.maybe_update_params_sharding_with_opt(cfg, state_mesh_shardings)
p_train_step, _ = train_utils.jit_train_and_eval_step(cfg, jit_model, mesh, state, state_mesh_shardings,
                                                       mt_train.train_step, mt_train.eval_step, None, params_shardings)

def mt_batch(step):
    x, y = C.batch(step)
    B, Tn = x.shape
    pos = np.broadcast_to(np.arange(Tn, dtype=np.int32), (B, Tn)); seg = np.ones((B, Tn), np.int32)
    return {"inputs": x, "inputs_position": pos, "inputs_segmentation": seg, "targets": y, "targets_position": pos, "targets_segmentation": seg}

# --- Python call profile of step 0 (trace, lower, compile, run) and step 1 (cached executable)
def profiled(fn):
    counts = collections.Counter(); first = []; seen = set(); depth = [0]
    def prof(frame, event, arg):
        if event == "call":
            depth[0] += 1
            f = frame.f_code.co_filename
            pkg = ("maxtext" if "/maxtext/" in f else "flax" if "/flax/" in f else "optax" if "/optax/" in f
                   else "jax" if ("/jax/" in f or "/jaxlib/" in f) else "other")
            counts[pkg] += 1
            if pkg == "maxtext":
                rel = f.split("/src/maxtext/", 1)[-1]
                key = (rel, frame.f_code.co_name, frame.f_code.co_firstlineno)
                if key not in seen:
                    seen.add(key); first.append({"file": "src/maxtext/" + rel, "fn": frame.f_code.co_qualname, "line": frame.f_code.co_firstlineno, "depth": depth[0]})
        elif event == "return":
            depth[0] -= 1
    sys.setprofile(prof)
    try:
        r = fn()
    finally:
        sys.setprofile(None)
    return r, dict(counts), first

steps = []; mt_loss = []; mt_gn = []; mt_lr = []
with jax.set_mesh(mesh), logical_axis_rules(cfg.logical_axis_rules):
    for s in range(STEPS):
        b = mt_batch(s)
        w0 = time.perf_counter(); c0 = time.process_time()
        if s < 2:
            (state, metrics), counts, first = profiled(lambda: p_train_step(state, b))
            jax.block_until_ready(metrics)
            steps.append({"step": s, "python_calls": counts, "maxtext_functions_first_seen": first})
        else:
            state, metrics = p_train_step(state, b); jax.block_until_ready(metrics)
        dt = time.perf_counter() - w0; dc = time.process_time() - c0
        sc = metrics["scalar"]
        mt_loss.append(float(sc["learning/loss"])); mt_gn.append(float(sc["learning/raw_grad_norm"]))
        if s < 2: steps[-1].update(wall_s=round(dt, 3), cpu_s=round(dc, 3))
        steps_time = steps
        if s >= 2: steps_time = None
        if s == 2: t_rest = []
        if s >= 2: t_rest.append(dt)
lr_values = [float(lr_sched(i)) for i in range(0, STEPS, 10)]

# --- the plain-JAX twin with MaxText's three differences switched on
def twin(steps, tanh=True, maxtext_warmup=True, decay_all=False):
    """The root's plain-JAX model and optax chain. Defaults = MaxText's behaviour: tanh GELU, warmup from 0,
    decay on the 2-D matrices only (what adamw_mask=['bias','scale','embedding'] leaves). decay_all=True is
    MaxText's default adamw_mask=[] (every leaf decayed)."""
    params = MJ.from_torch(sd, cfgd)
    sched = (optax.linear_schedule(0.0, cfgd["lr"], WARM) if maxtext_warmup
             else (lambda c: cfgd["lr"] * jnp.minimum(1.0, (c + 1) / WARM)))
    mask = None if decay_all else MJ.decay_mask
    tx = optax.chain(optax.clip_by_global_norm(1.0), optax.adamw(sched, b1=0.9, b2=0.95, eps=1e-8, weight_decay=0.1, mask=mask))
    opt = tx.init(params)
    orig = jax.nn.gelu
    if tanh: jax.nn.gelu = lambda v, approximate=True: orig(v, approximate=True)
    try:
        stepf = MJ.make_train_step(cfgd, tx)
        losses, gns = [], []
        with jax.default_matmul_precision("highest"):
            for s in range(steps):
                x, y = C.batch(s)
                params, opt, l, g = stepf(params, opt, jnp.asarray(x), jnp.asarray(y))
                losses.append(float(l)); gns.append(float(g))
    finally:
        jax.nn.gelu = orig
    return losses, gns

tw_loss, tw_gn = twin(STEPS)
variants = {"exact_gelu": twin(STEPS, tanh=False)[0], "warmup_from_step1": twin(STEPS, maxtext_warmup=False)[0],
            "decay_everything": twin(STEPS, decay_all=True)[0],
            "running_example_settings": twin(STEPS, tanh=False, maxtext_warmup=False)[0]}
re_loss = None
eq = json.load(open(os.path.join(ROOT_DATA, "equiv.json")))
re_loss = eq["train"]["loss"]["jax"][:STEPS]
diff = [abs(a - b) for a, b in zip(mt_loss, tw_loss)]
res = {"maxtext_commit": "1a95d1e5", "jax": jax.__version__, "steps": STEPS, "warmup": WARM,
       "setup_wall_s": round(t_setup, 2), "step0": steps[0] | {}, "step1": steps[1] | {},
       "step_time_median_s": float(np.median(t_rest)), "step_time_p90_s": float(np.percentile(t_rest, 90)),
       "maxtext_loss": mt_loss, "maxtext_raw_grad_norm": mt_gn, "maxtext_lr_every10": lr_values,
       "twin_loss": tw_loss, "twin_grad_norm": tw_gn, "running_example_loss_jax": re_loss,
       "max_abs_loss_diff_maxtext_vs_twin": max(diff), "loss_diff_first10": diff[:10],
       "max_abs_loss_diff_maxtext_vs_running_example": max(abs(a - b) for a, b in zip(mt_loss, re_loss)),
       "decayed_leaves": decayed,
       "variant_loss": variants, "variant_max_abs_diff_vs_twin": {k: max(abs(a - b) for a, b in zip(v, tw_loss)) for k, v in variants.items()}, "load_1min": os.getloadavg()[0], "cpu_count_used": "nice 15, OMP 4",
       "overrides": RUNEX}
json.dump(res, open(os.path.join(lc_env.OUT, "train.json"), "w"), indent=1)
print({k: v for k, v in res.items() if k not in ("maxtext_loss", "maxtext_raw_grad_norm", "twin_loss", "twin_grad_norm", "running_example_loss_jax", "step0", "step1", "overrides", "decayed_leaves")})
print("step0 calls", steps[0]["python_calls"], len(steps[0]["maxtext_functions_first_seen"]), steps[0]["wall_s"])
print("step1 calls", steps[1]["python_calls"], len(steps[1]["maxtext_functions_first_seen"]), steps[1]["wall_s"])
print("decayed", decayed)
