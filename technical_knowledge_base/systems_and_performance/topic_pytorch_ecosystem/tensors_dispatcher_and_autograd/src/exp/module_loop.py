"""nn.Module, state_dict and the training loop, reproduced on the running example (deterministic).

python module_loop.py > ../inputs/module.json
"""
import io
import json
import multiprocessing
import os
import random
import sys
import tempfile
import warnings

import numpy as np
import torch

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "model"))
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step  # noqa: E402

torch.set_num_threads(4)
cfg = GPTConfig()
out = {"torch": torch.__version__}


def msg(e, n=1):
    s = [x for x in str(e).strip().split("\n") if x.strip()]
    return type(e).__name__ + ": " + " | ".join(x.strip() for x in s[:n])


# ---------- 1. what a Module registers ----------
m = make_model(cfg)
mm = make_model(GPTConfig(attn="manual"))
reg = {
    "parameters": len(list(m.parameters())),
    "named_parameters_remove_duplicate_false": len(list(m.named_parameters(remove_duplicate=False))),
    "state_dict_entries": len(m.state_dict()),
    "numel_parameters": sum(p.numel() for p in m.parameters()),
    "numel_state_dict": sum(t.numel() for t in m.state_dict().values()),
    "tied_same_object": m.head.weight is m.tok.weight,
    "sd_tied_same_storage": m.state_dict()["tok.weight"].data_ptr() == m.state_dict()["head.weight"].data_ptr(),
    "manual_buffers": [n for n, _ in mm.named_buffers()],
    "manual_state_dict_has_mask": any("mask" in k for k in mm.state_dict()),
    "modules": len(list(m.modules())),
    "first_keys": list(m.state_dict().keys())[:6],
    "last_keys": list(m.state_dict().keys())[-3:],
}
out["registered"] = reg

# ---------- 2. saving: torch.save keeps the sharing, safetensors refuses it ----------
sv = {}
buf = io.BytesIO()
torch.save(m.state_dict(), buf)
sv["torch_save_bytes"] = buf.getbuffer().nbytes
sv["param_bytes"] = sum(p.numel() for p in m.parameters()) * 4
sv["state_dict_tensor_bytes"] = sum(t.numel() for t in m.state_dict().values()) * 4
buf.seek(0)
sd2 = torch.load(buf)
sv["loaded_shares"] = sd2["tok.weight"].data_ptr() == sd2["head.weight"].data_ptr()
try:
    from safetensors.torch import save_file, save_model, load_model
    with tempfile.TemporaryDirectory() as d:
        try:
            save_file(m.state_dict(), os.path.join(d, "a.safetensors"))
            sv["safetensors_save_file"] = "ok"
        except Exception as e:  # noqa: BLE001
            sv["safetensors_save_file"] = msg(e)
        save_model(m, os.path.join(d, "b.safetensors"))
        sv["safetensors_save_model_bytes"] = os.path.getsize(os.path.join(d, "b.safetensors"))
        from safetensors import safe_open
        with safe_open(os.path.join(d, "b.safetensors"), "pt") as f:
            sv["safetensors_save_model_keys"] = len(list(f.keys()))
            sv["safetensors_dropped"] = sorted(set(m.state_dict()) - set(f.keys()))
        m3 = make_model(GPTConfig(seed=1))
        miss = load_model(m3, os.path.join(d, "b.safetensors"))
        sv["safetensors_load_model_tied"] = m3.head.weight is m3.tok.weight
        sv["safetensors_load_model_equal"] = bool(torch.equal(m3.tok.weight, m.tok.weight))
    import safetensors
    sv["safetensors_version"] = safetensors.__version__
except ImportError:
    sv["safetensors"] = "not installed"
out["saving"] = sv

# ---------- 3. load_state_dict strict ----------
ld = {}
sd = m.state_dict()
bad = {("blocks.0.ln_1.weight" if k == "blocks.0.ln1.weight" else k): v for k, v in sd.items()}
m4 = make_model(GPTConfig(seed=1))
try:
    m4.load_state_dict(bad)
except Exception as e:  # noqa: BLE001
    ld["strict_error"] = [l.strip() for l in str(e).strip().split("\n") if l.strip()][:3]
r = m4.load_state_dict(bad, strict=False)
ld["strict_false_returns"] = {"missing_keys": r.missing_keys, "unexpected_keys": r.unexpected_keys}
ld["strict_false_ln1_still_seed1"] = not torch.equal(m4.blocks[0].ln1.weight, m.blocks[0].ln1.weight) or bool(torch.equal(m4.blocks[0].ln1.weight, torch.ones(256)))
shape_bad = dict(sd)
shape_bad["blocks.0.mlp.fc.weight"] = torch.zeros(512, 256)
try:
    m4.load_state_dict(shape_bad, strict=False)
except Exception as e:  # noqa: BLE001
    ld["shape_mismatch_even_strict_false"] = [l.strip() for l in str(e).strip().split("\n") if l.strip()][:2]
# two different tensors under the two tied names: which one wins?
untied = dict(sd)
untied["tok.weight"] = torch.full((cfg.vocab_size, cfg.d_model), 1.0)
untied["head.weight"] = torch.full((cfg.vocab_size, cfg.d_model), 2.0)
m5 = make_model(cfg)
m5.load_state_dict(untied)
ld["tied_load_value"] = float(m5.tok.weight[0, 0])
ld["tied_still_tied"] = m5.head.weight is m5.tok.weight
ld["state_dict_order_tok_before_head"] = list(sd).index("tok.weight") < list(sd).index("head.weight")
out["load"] = ld

# ---------- 4. forward hooks ----------
caught = []
hs = [b.register_forward_hook(lambda mod, inp, outp, i=i: caught.append([i, list(outp.shape), round(float(outp.std()), 4)])) for i, b in enumerate(m.blocks)]
pre = []
hs.append(m.blocks[0].register_forward_pre_hook(lambda mod, inp: pre.append(list(inp[0].shape))))
xb, yb = get_batch(cfg, 0)
with torch.no_grad():
    m(xb, yb)
for h in hs:
    h.remove()
out["forward_hooks"] = {"block_outputs": caught, "pre_hook_input": pre}

# ---------- 5. zero_grad ----------
zg = {}
m6 = make_model(cfg)
opt = make_optimizer(m6)
_, loss = m6(xb, yb)
loss.backward()
zg["grad_bytes"] = sum(p.grad.numel() * 4 for p in m6.parameters())
opt.zero_grad()
zg["default_set_to_none"] = all(p.grad is None for p in m6.parameters())
_, loss = m6(xb, yb)
loss.backward()
opt.zero_grad(set_to_none=False)
zg["set_to_none_false_all_zero"] = all(p.grad is not None and not p.grad.any() for p in m6.parameters())
out["zero_grad"] = zg

# ---------- 6. accumulation and clipping ----------
acc = {}


def grads_of(model):
    return torch.cat([p.grad.reshape(-1) for p in model.parameters()]).double()  # float64: a float32 norm over 3.2M numbers is off in the 4th digit here


m7 = make_model(cfg)
_, loss = m7(xb, yb)
loss.backward()
g_full = grads_of(m7).clone()
acc["full_norm"] = float(g_full.norm())
for divide in [True, False]:
    m8 = make_model(cfg)
    for k in range(4):
        _, l = m8(xb[2 * k:2 * k + 2], yb[2 * k:2 * k + 2])
        (l / 4 if divide else l).backward()
    g = grads_of(m8)
    key = "divided" if divide else "not_divided"
    acc[key] = {"norm": float(g.norm()), "max_abs_diff_vs_full": float((g - g_full).abs().max()), "ratio": float(g.norm() / g_full.norm())}
m9 = make_model(cfg)
_, loss = m9(xb, yb)
loss.backward()
tn = torch.nn.utils.clip_grad_norm_(m9.parameters(), max_norm=0.5)
acc["clip"] = {"max_norm": 0.5, "returned_total_norm": float(tn), "norm_after": float(grads_of(m9).norm())}
out["accumulation"] = acc

# ---------- 7. AMP: bf16 autocast step, fp16 and the gradient scaler ----------
amp = {}
m10 = make_model(cfg)
with torch.autocast("cpu", dtype=torch.bfloat16):
    logits, loss = m10(xb, yb)
loss.backward()
amp["bf16_cpu"] = {"logits_dtype": str(logits.dtype).replace("torch.", ""), "loss": float(loss), "param_dtype": str(m10.tok.weight.dtype).replace("torch.", ""),
                   "grad_dtype": str(m10.tok.weight.grad.dtype).replace("torch.", "")}
# fp32 gradients of the real first step: how many would vanish in float16
g = g_full.abs()
nz = g[g > 0]
amp["grad_elems"] = g.numel()
amp["zero_grads"] = int((g == 0).sum())
amp["below_fp16_subnormal_unscaled"] = int((nz < 2.0 ** -24).sum())
amp["below_fp16_normal_unscaled"] = int((nz < 2.0 ** -14).sum())
amp["below_fp16_subnormal_scaled_65536"] = int((nz * 65536 < 2.0 ** -24).sum())
amp["below_fp16_normal_scaled_65536"] = int((nz * 65536 < 2.0 ** -14).sum())
amp["max_abs_grad"] = float(g.max())
amp["min_nonzero_abs_grad"] = float(nz.min())
amp["scaled_max_vs_fp16_max"] = float(g.max() * 65536)
# a few steps with fp16 autocast and GradScaler on the CPU
m11 = make_model(cfg)
opt11 = make_optimizer(m11)
sc = torch.amp.GradScaler("cpu")
hist = []
for step in range(4):
    x, y = get_batch(cfg, step)
    with torch.autocast("cpu", dtype=torch.float16):
        _, l = m11(x, y)
    sc.scale(l).backward()
    sc.step(opt11)
    sc.update()
    opt11.zero_grad(set_to_none=True)
    hist.append({"step": step, "loss": round(float(l), 5), "scale_after": float(sc.get_scale())})
amp["fp16_scaler_cpu"] = hist
out["amp"] = amp

# ---------- 8. determinism ----------
det = {}


def run3(threads, device="cpu", deterministic=False):
    torch.set_num_threads(threads)
    torch.use_deterministic_algorithms(deterministic)
    mdl = make_model(cfg, device)
    o = make_optimizer(mdl)
    ls = []
    for s in range(3):
        x, y = get_batch(cfg, s, device)
        ls.append(float(train_step(mdl, o, x, y)))
    torch.use_deterministic_algorithms(False)
    return ls, torch.cat([p.detach().reshape(-1).cpu() for p in mdl.parameters()])


a1, p1 = run3(4)
a2, p2 = run3(4)
b1, q1 = run3(1)
c1, r1 = run3(4, deterministic=True)
det["cpu_4threads_twice_bitwise_equal"] = bool(torch.equal(p1, p2))
det["cpu_1_vs_4_threads_max_param_diff"] = float((p1 - q1).abs().max())
det["cpu_1_vs_4_threads_losses"] = [a1, b1]
det["cpu_deterministic_flag_equal"] = bool(torch.equal(p1, r1))
if torch.backends.mps.is_available():
    d1, s1 = run3(4, "mps")
    d2, s2 = run3(4, "mps")
    det["mps_twice_bitwise_equal"] = bool(torch.equal(s1, s2))
    det["mps_twice_max_param_diff"] = float((s1 - s2).abs().max())
    det["mps_vs_cpu_max_param_diff"] = float((s1 - p1).abs().max())
    det["mps_losses"] = d1
    e1, t1 = run3(4, "mps", deterministic=True)
    e2, t2 = run3(4, "mps", deterministic=True)
    det["mps_deterministic_flag_twice_bitwise_equal"] = bool(torch.equal(t1, t2))
    eq = 0
    for _ in range(5):
        _, u = run3(4, "mps")
        eq += int(torch.equal(u, s1))
    det["mps_5_more_runs_equal_to_first"] = eq
torch.set_num_threads(4)
out["determinism"] = det

print(json.dumps(out, indent=1))
