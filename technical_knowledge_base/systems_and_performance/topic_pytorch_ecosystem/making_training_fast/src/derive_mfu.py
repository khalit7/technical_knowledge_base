"""Derive the model FLOPs utilisation (MFU) quoted in Reading section 3 from recorded inputs only (no new runs).
    python3 derive_mfu.py
MFU = model FLOPs of one step / step time / peak. Model FLOPs: 6 N D for the weights (N parameters, D tokens per step)
plus 12 L T d per token for the attention scores and their weighted sum (forward 4 L T d, backward twice that; the
hunt's baseline computes the full T x T scores). The peak used is this machine's own measured float32 matmul rate
(time_amp.json, a 2,048-square matmul), a stand-in for a datasheet peak, which Apple does not publish for float32.
"""
import json, os
IN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exp", "inputs")
J = lambda n: json.load(open(os.path.join(IN, n)))

big = next(r for r in J("mem_step.json")["runs"] if r["config"] == "big")
c, N = big["cfg"], big["params"]
L, d, T, B = c["n_layer"], c["d_model"], c["block_size"], c["batch_size"]
D = B * T
weights = 6 * N * D
attn = 12 * L * T * d * D
flops = weights + attn
peak = {r["device"]: r["gflops"] for r in J("time_amp.json")["results"] if r["op"] == "matmul 2048" and r["dtype"] == "float32"}


def last(dev, stage):
    return [r for r in J(f"hunt_time_{dev}.json")["runs"] if r["stage"] == stage][-1]["median_ms"]


out = {"N": N, "tokens": D, "weights_gflop": weights / 1e9, "attn_gflop": attn / 1e9, "total_gflop": flops / 1e9, "peak_gflops": peak}
for dev, final in (("mps", "s6"), ("cpu", "s3")):
    for name, st in (("baseline", "s0"), ("final", final)):
        ms = last(dev, st)
        achieved = flops / (ms / 1e3) / 1e9
        out[f"{dev}_{name}"] = {"stage": st, "ms": round(ms, 2), "achieved_gflops": round(achieved, 1), "mfu_pct": round(100 * achieved / peak[dev], 1)}
print(json.dumps(out, indent=1))
