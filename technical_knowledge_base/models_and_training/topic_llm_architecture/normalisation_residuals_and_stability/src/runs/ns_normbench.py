"""LayerNorm against RMSNorm, the operation alone: forward + backward time at three shapes, on one device.

Three implementations of each: torch.nn.LayerNorm / torch.nn.RMSNorm (PyTorch's own kernels), and a hand-written
RMSNorm as in transformers' LlamaRMSNorm (upcast to float32, pow, mean, rsqrt, multiply). Median of 30 timed
repeats after 5 warm-up, synchronised. Also checks that RMSNorm equals LayerNorm on mean-centred inputs.
  ns_normbench.py --device mps|cpu   ->  ../out/normbench_<device>.json
Rough timings on a shared laptop: read ratios, not absolute times.
"""
import argparse, json, os, statistics, time
import torch
import torch.nn as nn

ap = argparse.ArgumentParser(); ap.add_argument("--device", default="cpu"); ap.add_argument("--reps", type=int, default=30)
a = ap.parse_args()
torch.set_num_threads(4); torch.manual_seed(0)
dev = a.device
sync = (lambda: torch.mps.synchronize()) if dev == "mps" else (lambda: None)


class HandRMS(nn.Module):  # transformers LlamaRMSNorm, written out
    def __init__(self, d, eps=1e-5):
        super().__init__(); self.weight = nn.Parameter(torch.ones(d)); self.eps = eps

    def forward(self, x):
        dt = x.dtype; x = x.to(torch.float32)
        x = x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps)
        return self.weight * x.to(dt)


def bench(mod, x):
    g = torch.randn_like(x)
    ts = []
    for i in range(5 + a.reps):
        xx = x.detach().requires_grad_(True)
        sync(); t = time.perf_counter()
        y = mod(xx); y.backward(g)
        sync(); dt = time.perf_counter() - t
        if i >= 5:
            ts.append(dt)
    return statistics.median(ts) * 1e3


res = {"device": dev, "torch": torch.__version__, "reps": a.reps, "shapes": []}
for B, T, D in [(32, 256, 256), (4, 2048, 4096), (1, 8192, 8192)]:
    for dt in ([torch.float32, torch.bfloat16] if dev == "mps" else [torch.float32]):
        x = torch.randn(B, T, D, device=dev, dtype=dt)
        mods = {"layernorm": nn.LayerNorm(D, eps=1e-5).to(dev, dt), "rmsnorm": nn.RMSNorm(D, eps=1e-5).to(dev, dt),
                "rmsnorm_hand": HandRMS(D).to(dev, dt)}
        row = {"shape": [B, T, D], "dtype": str(dt).split(".")[-1]}
        for k, m in mods.items():
            row[k + "_ms"] = round(bench(m, x), 3)
        row["rms_over_ln"] = round(row["rmsnorm_ms"] / row["layernorm_ms"], 3)
        row["hand_over_ln"] = round(row["rmsnorm_hand_ms"] / row["layernorm_ms"], 3)
        res["shapes"].append(row); print(row, flush=True)
# equivalence: on mean-centred rows, RMSNorm == LayerNorm (both without affine change)
x = torch.randn(64, 256, dtype=torch.float64); xc = x - x.mean(-1, keepdim=True)
ln = nn.functional.layer_norm(xc, (256,), eps=1e-5); rn = nn.functional.rms_norm(xc, (256,), eps=1e-5)
res["max_diff_centred"] = float((ln - rn).abs().max())
res["max_diff_raw"] = float((nn.functional.layer_norm(x + 3.0, (256,), eps=1e-5) - nn.functional.rms_norm(x + 3.0, (256,), eps=1e-5)).abs().max())
print("centred", res["max_diff_centred"], "shifted by 3", res["max_diff_raw"])
json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", f"normbench_{dev}.json"), "w"), indent=1)
