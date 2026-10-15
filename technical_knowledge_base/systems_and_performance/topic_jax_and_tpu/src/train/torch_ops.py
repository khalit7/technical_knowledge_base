"""How many operations the PyTorch twin dispatches per eager training step (for the Reading tab's comparison with
the number of fusions in the JAX step's optimised HLO). On CPU there are no GPU kernel launches; we count the
ATen operator calls the profiler records for one full step (forward, backward, clip, AdamW, scheduler), after
5 warm-up steps. "top-level" counts only operators not called from inside another operator.
Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B torch_ops.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import numpy as np
import torch
from torch.profiler import ProfilerActivity, profile

torch.set_num_threads(4)
import common as C
import model_torch as MT

cfg = C.CFG
m = MT.make_model(cfg, 0)
opt, sched = MT.make_optimizer(m, cfg, C.lr_at)
for s in range(5):
    x, y = C.batch(s)
    MT.train_step(m, opt, sched, torch.from_numpy(x).long(), torch.from_numpy(y).long(), cfg["clip"])
x, y = C.batch(5)
with profile(activities=[ProfilerActivity.CPU]) as prof:
    MT.train_step(m, opt, sched, torch.from_numpy(x).long(), torch.from_numpy(y).long(), cfg["clip"])
ev = [e for e in prof.events() if e.name.startswith("aten::")]
ids = {e.id for e in ev}
top = [e for e in ev if e.cpu_parent is None or not e.cpu_parent.name.startswith("aten::")]
names = {}
for e in top:
    names[e.name] = names.get(e.name, 0) + 1
out = {"aten_calls_all": len(ev), "aten_calls_top_level": len(top), "distinct_top_level": len(names),
       "top10": sorted(names.items(), key=lambda kv: -kv[1])[:10], "torch": torch.__version__,
       "note": "one eager training step of the PyTorch twin on CPU, after 5 warm-up steps; foreach is off on CPU, so AdamW runs per tensor"}
json.dump(out, open(os.path.join(HERE, "out", "torch_ops.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
