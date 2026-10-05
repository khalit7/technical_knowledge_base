# Numerical computing page: measurements part B. One real training step of SmolLM2-135M
# (HuggingFaceTB/SmolLM2-135M) on 4 x 128 tokens of Tiny Shakespeare, in fp32 (CPU, the reference),
# then pure fp16 (MPS) at several loss scales, then pure bf16 (MPS). Gradient exponents histogram,
# underflow counts, overflow, and how many weight updates a 16-bit weight would swallow.
# Run: uv run --no-project --with torch==2.14.1 --with transformers --with numpy --with ml_dtypes python measure_b.py
import json, math, sys, time
import numpy as np, torch, ml_dtypes as md
from transformers import AutoModelForCausalLM, AutoTokenizer
torch.set_num_threads(2); torch.manual_seed(0)
MID = "HuggingFaceTB/SmolLM2-135M"
tok = AutoTokenizer.from_pretrained(MID)
text = open("../tinyshakespeare.txt").read()[:20000]
ids = tok(text, return_tensors="pt").input_ids[0]
B, T = 4, 128
batch = torch.stack([ids[i * T:(i + 1) * T] for i in range(B)])
OUT = {"model": MID, "tokens": B * T, "text": "Tiny Shakespeare, first 20,000 characters (Karpathy char-rnn data)",
       "torch": torch.__version__, "date": time.strftime("%Y-%m-%d")}

def grads(model):
    return torch.cat([p.grad.detach().float().flatten().cpu() for p in model.parameters() if p.grad is not None])

def step(model, dev, scale=1.0):
    model.zero_grad(set_to_none=True)
    out = model(batch.to(dev), labels=batch.to(dev))
    (out.loss * scale).backward()
    return float(out.loss), grads(model)

m32 = AutoModelForCausalLM.from_pretrained(MID, torch_dtype=torch.float32)
m32.train()
loss32, g32 = step(m32, "cpu")
w32 = torch.cat([p.detach().flatten() for p in m32.parameters()])
n = g32.numel(); nz = int((g32 != 0).sum())
a = g32.abs(); a = a[a > 0]
e = torch.floor(torch.log2(a)).to(torch.int64)
lo, hi = int(e.min()), int(e.max())
hist = torch.bincount(e - lo).tolist()
OUT["fp32"] = {"loss": loss32, "n_params": n, "nonzero": nz, "exp_min": lo, "exp_max": hi, "hist": hist,
               "frac_below_2m24": float((a < 2 ** -24).sum()) / nz,   # fp16 rounds these to 0 (below half of 2^-24 exactly, see page)
               "frac_below_2m25": float((a < 2 ** -25).sum()) / nz,
               "frac_below_2m14": float((a < 2 ** -14).sum()) / nz,   # fp16 subnormal range or zero
               "max_abs": float(a.max()), "median_abs": float(a.median())}
# what fp16 does to the fp32 gradients if they are simply cast (the effect of the format alone)
g16 = g32.to(torch.float16).float()
OUT["cast_fp16"] = {"zero_frac": float(((g16 == 0) & (g32 != 0)).sum()) / nz,
                    "cast_bf16_zero_frac": float(((g32.to(torch.bfloat16).float() == 0) & (g32 != 0)).sum()) / nz}
print(json.dumps(OUT["fp32"] | {"hist": None}), OUT["cast_fp16"], flush=True)

# lost updates: weight w, update u = lr * sign(g) (an Adam-like step of size lr); is round(w - u) == round(w)?
lost = {}
for lr in [1e-3, 1e-4, 1e-5]:
    u = lr * torch.sign(g32)
    row = {}
    for name, dt in [("fp32", torch.float32), ("bf16", torch.bfloat16), ("fp16", torch.float16)]:
        wd = w32.to(dt)
        row[name] = float(((wd - u.to(dt)) == wd).sum()) / n
    lost[str(lr)] = row
OUT["lost_updates"] = lost; OUT["weights_abs_median"] = float(w32.abs().median())
print(lost, flush=True)
del m32

dev = "mps" if torch.backends.mps.is_available() else "cpu"
OUT["device16"] = dev
res = []
for dt, tag in [(torch.float16, "fp16"), (torch.bfloat16, "bf16")]:
    m = AutoModelForCausalLM.from_pretrained(MID, torch_dtype=dt).to(dev); m.train()
    scales = [1, 2 ** 4, 2 ** 8, 2 ** 12, 2 ** 16, 2 ** 20, 2 ** 24] if tag == "fp16" else [1]
    for s in scales:
        L, g = step(m, dev, s)
        fin = torch.isfinite(g)
        gs = g / s
        row = {"fmt": tag, "scale": s, "loss": L, "nonfinite": int((~fin).sum()),
               "zero_where_fp32_nonzero": float(((g == 0) & (g32 != 0)).sum()) / nz,
               "rel_err_median": float(((gs - g32).abs() / g32.abs().clamp_min(1e-30))[fin & (g32 != 0)].median()) if fin.any() else None}
        res.append(row); print(row, flush=True)
    del m
OUT["runs16"] = res
json.dump(OUT, open("out_b.json", "w"), indent=1)
print("done")
