"""Score the TinyDiT checkpoints against the Flow lab's TinyUNet with the Flow lab's own sampler and scoring
(MPS, under the bench lock).

    GM_SCRATCH=... GM_LOCK=... nice -n 15 $GM_SCRATCH/venv/bin/python -I sample_dit.py fw_fm_4000 ld_dit_p4_4000 ...

Per checkpoint: Euler with 50 steps (fm_samplers.euler from the root's src/flow/), guidance scale s = 1 (plain
conditional) and s = 1.5 (the Flow lab's best), N = 1,000 samples (100 per class) from noise seed 11, scored by
fid.fd_fmnist (Frechet distance in the shared classifier's feature space against the 10,000 test images; floor of
1,000 real val images 18.93) and the classifier's accuracy on the requested labels; a 10-class strip from noise
seed 5 (the Flow lab's strip noise); median ms per network evaluation at batch 1 and 1,000.
Writes ../out/tiny_scores.json and ../out/tiny_strips.npz (uint8).
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT, "data")); sys.path.insert(0, os.path.join(ROOT, "flow"))
import numpy as np
import torch
from common import cap_threads, device, scratch, sync, from_model, MACHINE, touch_bench
from nets import TinyUNet, TinyDiT
import fid
from fm_samplers import euler

cap_threads(4)
dev = device(os.environ.get("LD_DEV", "mps"))
OUT = os.path.join(HERE, "..", "out")
clf = fid.load_classifier(dev)
N = int(os.environ.get("LD_N", 1000))
CLS = torch.arange(10).repeat_interleave(N // 10).to(dev)


def noise(n, seed):
    return torch.randn((n, 1, 32, 32), generator=torch.Generator().manual_seed(seed)).to(dev)


def load(name):
    ck = torch.load(scratch("ckpt", f"{name}.pt"), map_location="cpu")
    if name.startswith("fw_"):
        net = TinyUNet()
    else:
        net = TinyDiT(patch=int(name.split("_p")[1][0]))
    net.load_state_dict(ck["ema"])
    return net.to(dev).eval(), ck["config"]


path = os.path.join(OUT, "tiny_scores.json")
res = json.load(open(path)) if os.path.exists(path) else {}
spath = os.path.join(OUT, "tiny_strips.npz")
strips = dict(np.load(spath)) if os.path.exists(spath) else {}
zN, zS, STRIP_Y = noise(N, 11), noise(10, 5), torch.arange(10).to(dev)
for name in sys.argv[1:]:
    net, cfg = load(name)
    r = {"config": cfg, "machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "torch": torch.__version__, "N": N}
    tm = {}
    with torch.no_grad():
        for b in [1, min(N, 1000)]:
            xb = noise(b, 3); tb = torch.full((b,), 0.5, device=dev); yb = torch.zeros(b, dtype=torch.long, device=dev)
            for _ in range(3):
                net(xb, tb, yb)
            sync(dev); ts = []
            for _ in range(15):
                t0 = time.perf_counter(); net(xb, tb, yb); sync(dev); ts.append(time.perf_counter() - t0)
            tm[str(b)] = round(float(np.median(ts)) * 1000, 2)
    r["ms_per_eval"] = tm
    for s in [1.0, 1.5]:
        t0 = time.perf_counter()
        x = torch.cat([euler(net, zN[i:i + 500], CLS[i:i + 500], 50, s) for i in range(0, N, 500)]).clamp(-1, 1)
        sync(dev); sec = time.perf_counter() - t0
        d, acc = fid.fd_fmnist(from_model(x), clf, dev, labels=CLS.cpu().numpy())
        r[f"euler50_s{s}"] = {"fd": round(float(d), 2), "acc": round(float(acc), 4), "sec": round(sec, 2),
                              "nan": int(torch.isnan(x).any())}
        strips[f"{name}_s{s}"] = from_model(euler(net, zS, STRIP_Y, 50, s).clamp(-1, 1))
        print(name, s, r[f"euler50_s{s}"], flush=True)
    res[name] = r
    json.dump(res, open(path, "w"), indent=1)
    np.savez_compressed(spath, **strips)
    touch_bench("ld")
    del net
    torch.mps.empty_cache()
print("done", flush=True)
