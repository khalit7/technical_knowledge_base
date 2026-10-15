"""MaxText's remat_policy and scan_layers on the running example's shape (gpt3 block, d 128, 4 layers, batch 32 x 128):
compile MaxText's real train step for each setting on CPU and record XLA's memory and FLOP accounting, compile
time and optimised HLO size, then run 3 steps to check the loss does not change.

Run: JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B lc_remat.py  -> ../out/remat.json
"""
import sys, os, json, time, io, contextlib, logging
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env
ROOT_DATA = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data"))
sys.path.insert(0, ROOT_DATA)
logging.disable(logging.WARNING)
import numpy as np, jax
from flax import nnx
from flax.core.spmd import logical_axis_rules
import common as C
with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
    from maxtext.configs import pyconfig
    from maxtext.utils import train_utils, sharding
    from maxtext.trainers.pre_train import train as mt_train

BASE = os.path.join(lc_env.MAXTEXT, "src", "maxtext", "configs", "base.yml")
COMMON = dict(run_name="lc_remat", hardware="cpu", skip_jax_distributed_system=True, enable_checkpointing=False,
              base_output_directory=os.path.join(lc_env.JX, "lc", "mt_out"), jax_cache_dir="", enable_goodput_recording=False,
              dataset_type="synthetic", packing=False, steps=10)
RUNEX = dict(decoder_block="gpt3", base_emb_dim=128, base_num_query_heads=4, base_num_kv_heads=4, base_mlp_dim=512,
             base_num_decoder_layers=4, head_dim=32, vocab_size=65, max_target_length=128, trainable_position_size=128,
             mlp_activations=["gelu"], logits_via_embedding=False, fused_qkv=False, enable_dropout=False,
             dtype="float32", attention="dot_product", per_device_batch_size=32, normalization_layer_epsilon=1e-5)
CASES = [(p, True) for p in ("full", "save_out_proj", "save_qkv_proj", "save_dot_except_mlp", "minimal", "minimal_with_context")] + \
        [("full", False), ("minimal", False)]

def batch(step):
    x, y = C.batch(step)
    B, Tn = x.shape
    pos = np.broadcast_to(np.arange(Tn, dtype=np.int32), (B, Tn)); seg = np.ones((B, Tn), np.int32)
    return {"inputs": x, "inputs_position": pos, "inputs_segmentation": seg, "targets": y, "targets_position": pos, "targets_segmentation": seg}

rows = []
for policy, scan in CASES:
    with contextlib.redirect_stdout(io.StringIO()):
        cfg = pyconfig.initialize([sys.argv[0], BASE], **COMMON, **RUNEX, remat_policy=policy, scan_layers=scan)
        (rng, ck, sms, model, mesh, lrs, it, dl, ru, ev, state) = train_utils.setup_train_loop(cfg, None)
    jm, state = nnx.split(state)
    ps, sms = sharding.maybe_update_params_sharding_with_opt(cfg, sms)
    step, _ = train_utils.jit_train_and_eval_step(cfg, jm, mesh, state, sms, mt_train.train_step, mt_train.eval_step, None, ps)
    with jax.set_mesh(mesh), logical_axis_rules(cfg.logical_axis_rules):
        b = batch(0)
        t0 = time.perf_counter(); c0 = time.process_time()
        lowered = step.lower(state, b)
        t_lower = time.perf_counter() - t0
        t1 = time.perf_counter()
        compiled = lowered.compile()
        t_compile = time.perf_counter() - t1; c_all = time.process_time() - c0
        ma = compiled.memory_analysis(); ca = compiled.cost_analysis()
        ca = ca[0] if isinstance(ca, (list, tuple)) else ca
        hlo = compiled.as_text()
        jaxpr_eqns = None
        losses = []
        for s in range(3):
            state, m = compiled(state, batch(s))
            losses.append(float(m["scalar"]["learning/loss"]))
    r = {"remat_policy": policy, "scan_layers": scan, "temp_bytes": int(ma.temp_size_in_bytes),
         "argument_bytes": int(ma.argument_size_in_bytes), "output_bytes": int(ma.output_size_in_bytes),
         "alias_bytes": int(ma.alias_size_in_bytes), "flops": float(ca.get("flops", -1)),
         "bytes_accessed": float(ca.get("bytes accessed", -1)), "lower_s": round(t_lower, 2), "compile_s": round(t_compile, 2),
         "cpu_s": round(c_all, 2), "hlo_lines": hlo.count("\n"), "n_while": hlo.count(" while("), "losses": losses}
    rows.append(r); print(r["remat_policy"], scan, r["temp_bytes"], r["flops"], r["compile_s"], r["hlo_lines"], losses)
res = {"maxtext_commit": "1a95d1e5", "jax": jax.__version__, "rows": rows, "load_1min": os.getloadavg()[0],
       "note": "init is MaxText's own (init_weights_seed 0), the same for every case; batches are the running example's 0..2"}
json.dump(res, open(os.path.join(lc_env.OUT, "remat.json"), "w"), indent=1)
