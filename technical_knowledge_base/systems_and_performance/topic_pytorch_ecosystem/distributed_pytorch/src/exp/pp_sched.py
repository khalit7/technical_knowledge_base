"""Every pipeline schedule in torch.distributed.pipelining at 2.14.1 on the running example, CPU gloo ranks.

    sh run.sh 2 pp_sched.py --schedule GPipe --mb 4          (single-stage schedules: GPipe, 1F1B)
    sh run.sh 2 pp_sched.py --schedule Interleaved1F1B --mb 4 (2 stages per rank: Interleaved1F1B, LoopedBFS,
                                                              InterleavedZeroBubble, ZBVZeroBubble, DualPipeV)
    sh run.sh 4 pp_sched.py --schedule 1F1B --mb 8           (one block per rank)

Stages: 4 pieces of the model (embeddings + block 0 | block 1 | block 2 | block 3 + ln_f + head); single-stage
schedules on 2 ranks get two pieces each. Loop-style multi-stage schedules put stages r and r + 2 on rank r;
V-style (ZBVZeroBubble, DualPipeV) put 0 and 3 on rank 0, 1 and 2 on rank 1, so the tied embedding and head share
a rank. Every compute action is timed by wrapping the stage's forward_one_chunk / backward_one_chunk /
backward_weight_one_chunk; the bubble of a rank = 1 - (time in actions) / (step time). Gradients are checked
against one process on the same batch after the tied-weight all-reduce (when the two copies are on different ranks).
Timing: run under the bench lock (--repeats 5 keeps every repeat; the page uses the median step).
"""
import argparse, statistics
import torch.nn as nn
import torch.nn.functional as F
from dptc import *
import torch.distributed.pipelining as PPL
from torch.distributed.pipelining import PipelineStage
from torch.distributed.pipelining.schedules import get_schedule_class, PipelineScheduleSingle
from model import GPTConfig, make_model, get_batch

ap = argparse.ArgumentParser(); ap.add_argument("--schedule", default="GPipe"); ap.add_argument("--mb", type=int, default=4)
ap.add_argument("--repeats", type=int, default=3); ap.add_argument("--tag"); ap.add_argument("--layers", type=int, default=4)
ap.add_argument("--d", type=int, default=256)
a = ap.parse_args()
rank, world = init(timeout_s=120)
cfg = GPTConfig(n_layer=a.layers, d_model=a.d)
full = make_model(cfg)
L = cfg.n_layer


class Piece(nn.Module):
    """A contiguous run of blocks, with the embeddings if it starts at 0 and ln_f + head if it ends at L."""
    def __init__(self, m, lo, hi):
        super().__init__()
        self.lo, self.hi = lo, hi
        if lo == 0: self.tok, self.pos = m.tok, m.pos
        self.blocks = nn.ModuleList(m.blocks[lo:hi])
        if hi == L: self.ln_f, self.head = m.ln_f, m.head
    def forward(self, x):
        if self.lo == 0: x = self.tok(x) + self.pos(torch.arange(x.shape[1]))
        for b in self.blocks: x = b(x)
        if self.hi == L: x = self.head(self.ln_f(x))
        return x


Sched = get_schedule_class(a.schedule)
single = issubclass(Sched, PipelineScheduleSingle)
v_style = a.schedule in ("ZBVZeroBubble", "DualPipeV")
if single:
    n_stages = world; per = L // world
    my = [rank]
    bounds = {s: (s * per, (s + 1) * per) for s in range(n_stages)}
else:
    n_stages = 2 * world; per = L // n_stages
    bounds = {s: (s * per, (s + 1) * per) for s in range(n_stages)}
    my = [rank, n_stages - 1 - rank] if v_style else [rank, rank + world]
mods = {s: Piece(full, *bounds[s]) for s in my}
stages = [PipelineStage(mods[s], s, n_stages, torch.device("cpu")) for s in my]

acts = []
def wrap(stage):
    sid = stage.stage_index
    for meth, kind in (("forward_one_chunk", "F"), ("backward_one_chunk", "B"), ("backward_weight_one_chunk", "W")):
        orig = getattr(stage, meth)
        def w(*args, _o=orig, _k=kind, **kw):
            k = _k
            if _k == "B" and kw.get("full_backward", True) is False: k = "I"
            t0 = now(); r = _o(*args, **kw); t1 = now()
            acts.append([k, sid, int(args[0]), t0, t1])
            return r
        setattr(stage, meth, w)
for st in stages: wrap(st)
loss_fn = lambda logits, y: F.cross_entropy(logits.reshape(-1, logits.size(-1)), y.reshape(-1))
sched = Sched(stages[0] if single else stages, n_microbatches=a.mb, loss_fn=loss_fn)
x, y = get_batch(cfg, 0)
has_first, has_last = 0 in my, (n_stages - 1) in my

records = []
for it in range(a.repeats + 1):        # iteration 0 also infers shapes and is not kept
    acts.clear()
    for m in mods.values(): m.zero_grad(set_to_none=True)
    losses = []
    dist.barrier()
    t0 = now()
    kw = {}
    if has_last: kw.update(target=y, losses=losses)
    if has_first: sched.step(x, **kw)
    else: sched.step(**kw)
    t1 = now()
    if it == 0: continue
    busy = sum(e[4] - e[3] for e in acts)
    records.append({"t0": t0, "t1": t1, "step_ms": (t1 - t0) / 1e6, "busy_ms": busy / 1e6, "bubble": 1 - busy / (t1 - t0),
                    "acts": [[k, s, m, (s0 - t0) / 1e6, (s1 - t0) / 1e6] for k, s, m, s0, s1 in acts],
                    "losses": [l.item() for l in losses]})
# memory of one more step
def run():
    kw = {}
    if has_last: kw.update(target=y, losses=[])
    sched.step(x, **kw) if has_first else sched.step(**kw)
for m in mods.values(): m.zero_grad(set_to_none=True)
_, mem = profile_memory(run)
# gradients against one process (after summing the tied weight's two copies when they live on different ranks)
for m in mods.values(): m.zero_grad(set_to_none=True)
acts.clear(); run()
tied = full.tok.weight
tied_local = tied.grad if tied.grad is not None else torch.zeros_like(tied)
tied_split = not v_style and not (world == 1)
g = tied_local.clone()
if tied_split:
    dist.all_reduce(g)
ref = make_model(cfg); _, rl = ref(x, y); rl.backward()
rp = dict(ref.named_parameters())
diff = 0.0
for s, m in mods.items():
    for n, p in m.named_parameters():
        if p.grad is None or n.endswith("tok.weight") or n.endswith("head.weight"): continue
        if n.startswith("blocks."):
            i = int(n.split(".")[1]) + bounds[s][0]; rn = f"blocks.{i}." + n.split(".", 2)[2]
        else:
            rn = n
        diff = max(diff, (p.grad - rp[rn].grad).abs().max().item())
tied_diff = (g - ref.tok.weight.grad).abs().max().item() if (has_first or has_last) else None
rg = ref.tok.weight.grad
tied_ratio = ((g * rg).sum() / (rg * rg).sum()).item() if (has_first or has_last) else None   # 1.0 = right; 0.25 = scaled twice by 1/4
order = None
po = getattr(sched, "pipeline_order", None)
if po:
    order = [str(x_) for x_ in po.get(rank, []) if x_ is not None]
med = sorted(records, key=lambda r: r["step_ms"])[len(records) // 2]
import os as _os
dump(a.tag or f"pps_{a.schedule}_w{world}_m{a.mb}", rank, {
    "schedule": a.schedule, "single_stage": single, "v_style": v_style, "world": world, "n_microbatches": a.mb,
    "n_stages": n_stages, "my_stages": my, "stage_blocks": {s: list(bounds[s]) for s in my},
    "records": records, "median": med, "step_ms_all": [r["step_ms"] for r in records], "bubble_all": [r["bubble"] for r in records],
    "mem_peak_delta": mem["peak_delta"], "max_grad_diff_untied": diff, "tied_grad_diff": tied_diff, "tied_grad_ratio_to_reference": tied_ratio, "tied_needed_allreduce": tied_split,
    "loss_ref": rl.item(), "pipeline_order": order, "loadavg": _os.getloadavg()})
merge(a.tag or f"pps_{a.schedule}_w{world}_m{a.mb}", world)
dist.destroy_process_group()
