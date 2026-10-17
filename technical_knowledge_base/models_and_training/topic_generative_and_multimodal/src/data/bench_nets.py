"""Step-time benchmark of the shared generators on MPS, so labs can size their runs.

Run under the bench lock: GM_SCRATCH=... nice -n 15 python -I bench_nets.py
For each net and setting: seconds per training step (forward, backward, AdamW; batch 128; no .item()
inside the timed loop) and seconds per sampling forward pass (batch 256, no grad). Writes smoke/bench_nets.json.
"""
import json, os, sys, time

import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import cap_threads, device, sync, empty_cache, PeakMem, MACHINE
from nets import TinyUNet, TinyDiT, n_params

cap_threads(4)
dev = device("mps")
cfgs = [("unet_b64", lambda: TinyUNet(base=64)), ("unet_b64_noattn", lambda: TinyUNet(base=64, attn_res=())),
        ("unet_b32", lambda: TinyUNet(base=32)),
        ("unet_b32_r1", lambda: TinyUNet(base=32, num_res=1)), ("unet_b48_r1", lambda: TinyUNet(base=48, num_res=1)),
        ("unet_b64_r1", lambda: TinyUNet(base=64, num_res=1)), ("unet_b32_noattn", lambda: TinyUNet(base=32, attn_res=())),
        ("dit_d192x6", lambda: TinyDiT()), ("dit_d128x4", lambda: TinyDiT(d=128, depth=4, heads=4))]
ONLY = sys.argv[1].split(",") if len(sys.argv) > 1 else None   # e.g. unet_b32_r1,unet_b48_r1 (fp32 only)
OUTP = os.path.join(HERE, "smoke", "bench_nets.json")
old = json.load(open(OUTP))["nets"] if ONLY and os.path.exists(OUTP) else {}
res = {"machine": MACHINE, "device": str(dev), "torch": torch.__version__, "date": time.strftime("%Y-%m-%d"), "nets": old,
       "note": "bf16 = torch.autocast('mps', bfloat16); on this M1 Pro it is slower than float32 for every net here"}


def timed(fn, n):
    for _ in range(3):
        fn()
    sync(dev); t = time.time()
    for _ in range(n):
        fn()
    sync(dev); return (time.time() - t) / n


for name, mk in cfgs:
    if ONLY and name not in ONLY:
        continue
    for amp in ((None,) if ONLY else (None, torch.bfloat16)):
        torch.manual_seed(0)
        m = mk().to(dev); opt = torch.optim.AdamW(m.parameters(), 2e-4)
        x = torch.randn(128, 1, 32, 32, device=dev); t = torch.rand(128, device=dev); y = torch.randint(0, 11, (128,), device=dev)

        def step():
            with torch.autocast("mps", dtype=amp, enabled=amp is not None):
                loss = (m(x, t, y) - x).pow(2).mean()
            opt.zero_grad(set_to_none=True); loss.backward(); opt.step()

        xs = torch.randn(256, 1, 32, 32, device=dev); ts = torch.rand(256, device=dev); ys = torch.randint(0, 11, (256,), device=dev)

        def fwd():
            with torch.no_grad(), torch.autocast("mps", dtype=amp, enabled=amp is not None):
                m(xs, ts, ys)
        with PeakMem() as pm:
            st = timed(step, 10); fw = timed(fwd, 10)
        key = f"{name}_{'bf16' if amp else 'fp32'}"
        res["nets"][key] = {"params": n_params(m), "train_step_s_b128": round(st, 4), "train_steps_per_s": round(1 / st, 2),
                            "sample_fwd_s_b256": round(fw, 4), "peak_mps_mb": pm.peak_mb}
        print(key, res["nets"][key], flush=True)
        del m, opt; empty_cache()
json.dump(res, open(OUTP, "w"), indent=1)
