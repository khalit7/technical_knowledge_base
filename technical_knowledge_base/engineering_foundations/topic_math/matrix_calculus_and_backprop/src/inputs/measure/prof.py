"""Where the time goes: forward and backward profiled separately (CPU, 2 threads), self time per aten op, median over 5 steps."""
import json, statistics, torch
from torch.profiler import profile, ProfilerActivity
import cost
from blk import model_loss
torch.set_num_threads(2)
P, tok = cost.setup()
model_loss(tok, P).backward()
runs = []
for r in range(5):
    for p in cost.params_of(P): p.grad = None
    with profile(activities=[ProfilerActivity.CPU]) as pf:
        loss = model_loss(tok, P)
    with profile(activities=[ProfilerActivity.CPU]) as pb:
        loss.backward()
    def agg(pr):
        d = {}
        for e in pr.key_averages():
            if e.key.startswith("aten::"):
                d[e.key] = d.get(e.key, 0) + e.self_cpu_time_total / 1e6
        return d
    runs.append((agg(pf), agg(pb)))
keys = set()
for f, b in runs: keys |= set(f) | set(b)
res = {"fwd": {}, "bwd": {}}
for k in keys:
    fv = statistics.median([f.get(k, 0) for f, b in runs]); bv = statistics.median([b.get(k, 0) for f, b in runs])
    if fv > 1e-4: res["fwd"][k] = fv
    if bv > 1e-4: res["bwd"][k] = bv
res["fwd_total"] = statistics.median([sum(f.values()) for f, b in runs]); res["bwd_total"] = statistics.median([sum(b.values()) for f, b in runs])
json.dump(res, open("out/prof.json", "w"), indent=1)
for ph in ("fwd", "bwd"):
    print(ph, round(res[ph + "_total"], 3), sorted(((round(v, 3), k) for k, v in res[ph].items()), reverse=True)[:12])
