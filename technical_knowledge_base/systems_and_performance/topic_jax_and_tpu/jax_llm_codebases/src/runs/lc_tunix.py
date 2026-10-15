"""Tunix v0.1.7 on CPU with the running example's Flax NNX model.

A. Full-weight training with Tunix's PeftTrainer for 100 steps from the shared initial weights, with the
   running example's own optax chain: compare the loss history with the root's NNX run (equiv.json).
B. LoRA (qwix.LoraProvider, as Tunix's tests apply it) on the attention and MLP projections of the model
   trained for 500 steps by the root, against full fine-tuning from the same weights, 100 more steps each.

Run: JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B lc_tunix.py -> ../out/tunix.json
"""
import sys, os, json, time, io, contextlib, logging, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env
ROOT_DATA = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data"))
sys.path.insert(0, ROOT_DATA)
logging.disable(logging.WARNING)
import numpy as np, jax, jax.numpy as jnp, optax
from flax import nnx
import qwix
import common as C, model_nnx as MN
from tunix.sft import peft_trainer, metrics_logger

cfgd = C.CFG
LOGDIR = os.path.join(lc_env.JX, "lc", "tunix_logs"); os.makedirs(LOGDIR, exist_ok=True)

def tx_running_example():
    return optax.chain(optax.clip_by_global_norm(cfgd["clip"]),
        optax.adamw(learning_rate=lambda c: cfgd["lr"] * jnp.minimum(1.0, (c + 1) / cfgd["warmup"]),
                    b1=cfgd["betas"][0], b2=cfgd["betas"][1], eps=cfgd["adam_eps"], weight_decay=cfgd["weight_decay"], mask=MN._decay_mask))

def loss_fn(model, x, y):                       # the running example's loss, given to Tunix with with_loss_fn
    return optax.softmax_cross_entropy_with_integer_labels(model(x), y).mean()

def batches(start, n, n_steps):
    for s in range(start, start + n):
        x, y = C.batch(s, n_steps=n_steps)
        yield {"x": x, "y": y}

def run(model, tx, start, n, n_steps, tag):
    ml = metrics_logger.MetricsLogger(metrics_logger.MetricsLoggerOptions(log_dir=os.path.join(LOGDIR, tag), flush_every_n_steps=1000))
    trainer = peft_trainer.PeftTrainer(model, tx, peft_trainer.TrainingConfig(eval_every_n_steps=10**9, max_steps=n,
                                       pbar_description=None), metrics_logger=ml)
    trainer = trainer.with_loss_fn(loss_fn).with_gen_model_input_fn(lambda b: {"x": b["x"], "y": b["y"]})
    w0 = time.perf_counter(); c0 = time.process_time()
    with contextlib.redirect_stderr(io.StringIO()):
        trainer.train(batches(start, n, n_steps))
    wall = time.perf_counter() - w0; cpu = time.process_time() - c0
    hist = [float(v) for v in ml.get_metric_history("", "loss", "train")]
    return trainer, hist, wall, cpu

def val_loss(model):
    f = nnx.jit(loss_fn)
    return float(np.mean([float(f(model, *C.batch(i, "val", n_steps=8))) for i in range(8)]))

sd0 = dict(np.load(C.path("data", "init_torch.npz")))
res = {"tunix": "v0.1.7 (ce63a9fd)", "jax": jax.__version__, "flax": __import__("flax").__version__, "qwix": qwix.__version__ if hasattr(qwix, "__version__") else "0.1.8"}

# ---- A: full training with Tunix's trainer, from the shared initial weights
model = MN.from_torch(MN.make_model(cfgd), sd0)
tr, hist, wall, cpu = run(model, tx_running_example(), 0, 100, cfgd["steps"], "full_from_init")
ref = json.load(open(os.path.join(ROOT_DATA, "equiv.json")))["train"]["loss"]["nnx"][:100]
res["A"] = {"steps": len(hist), "loss": hist, "root_nnx_loss": ref,
            "max_abs_diff_vs_root_nnx": max(abs(a - b) for a, b in zip(hist, ref)),
            "wall_s": round(wall, 2), "cpu_s": round(cpu, 2)}
print("A", len(hist), res["A"]["max_abs_diff_vs_root_nnx"], wall)

# ---- B: LoRA against full fine-tuning, both from the root's 500-step weights, 100 more steps (batches 500..599)
sd500 = dict(np.load(C.path("data", "final_torch_500.npz")))
def base():
    return MN.from_torch(MN.make_model(cfgd), sd500)
x0, _ = C.batch(0)
n_full = sum(int(np.prod(v.shape)) for v in jax.tree.leaves(nnx.state(base(), nnx.Param)))
out = {}
for rank in (4, 16):
    lm = qwix.apply_lora_to_model(base(), qwix.LoraProvider(module_path=r".*(wq|wk|wv|wo|fc1|fc2).*", rank=rank, alpha=2.0 * rank), jnp.asarray(x0))
    n_lora = sum(int(np.prod(v.shape)) for v in jax.tree.leaves(nnx.state(lm, nnx.LoRAParam)))
    v_before = val_loss(lm)
    lr = 1e-3
    tx = optax.adamw(lr, b1=0.9, b2=0.95, weight_decay=0.0)
    trl, h, wall, cpu = run(lm, tx, 500, 100, 600, f"lora_r{rank}")
    out[f"lora_r{rank}"] = {"trainable": n_lora, "trainable_frac": n_lora / n_full, "val_before": v_before, "val_after": val_loss(lm),
                            "loss": h, "wall_s": round(wall, 2), "cpu_s": round(cpu, 2), "lora_enabled_in_trainer": bool(trl._lora_enabled)}
    print("lora", rank, n_lora, out[f"lora_r{rank}"]["val_before"], out[f"lora_r{rank}"]["val_after"], wall)
fm = base(); v_before = val_loss(fm)
trf, h, wall, cpu = run(fm, optax.adamw(1e-3, b1=0.9, b2=0.95, weight_decay=0.0), 500, 100, 600, "full_ft")
out["full_ft"] = {"trainable": n_full, "trainable_frac": 1.0, "val_before": v_before, "val_after": val_loss(fm), "loss": h,
                  "wall_s": round(wall, 2), "cpu_s": round(cpu, 2)}
print("full", n_full, out["full_ft"]["val_before"], out["full_ft"]["val_after"], wall)
res["B"] = out
res["B_setup"] = {"base": "final_torch_500.npz (root's 500-step run)", "batches": "C.batch(500..599, n_steps=600)",
                  "optimizer": "optax.adamw(1e-3, b1 0.9, b2 0.95, weight_decay 0), no clipping, constant LR",
                  "lora_targets": "wq, wk, wv, wo, fc1, fc2 in every block (qwix LoraProvider regex), alpha = 2 x rank"}
res["load_1min"] = os.getloadavg()[0]
json.dump(res, open(os.path.join(lc_env.OUT, "tunix.json"), "w"), indent=1)
