"""Wall-clock forward and backward, the three checkpointing modes interleaved round by round (CPU, 2 threads)."""
import json, time, statistics, torch
import cost
from blk import model_loss
torch.set_num_threads(2)
P, tok = cost.setup()
modes = ["none", "ckpt2", "ckpt1"]
T = {m: {"fwd": [], "bwd": [], "nograd": []} for m in modes}
for r in range(16):
    for m in modes:
        for p in cost.params_of(P):
            p.grad = None
        t0 = time.perf_counter(); loss = model_loss(tok, P, ckpt_every=cost.ck(m)); t1 = time.perf_counter()
        loss.backward(); t2 = time.perf_counter()
        with torch.no_grad():
            t3 = time.perf_counter(); model_loss(tok, P); t4 = time.perf_counter()
        if r:
            T[m]["fwd"].append(t1 - t0); T[m]["bwd"].append(t2 - t1); T[m]["nograd"].append(t4 - t3)
res = {m: {k: statistics.median(v) for k, v in d.items()} for m, d in T.items()}
res["raw"] = T
json.dump(res, open("out/timing2.json", "w"), indent=1)
for m in modes:
    print(m, {k: round(v, 3) for k, v in res[m].items()})
