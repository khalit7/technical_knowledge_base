"""Pipeline parallelism with torch.distributed.pipelining on the running example: 2 stages, 4 micro-batches,
GPipe against 1F1B. Stage 0 = embeddings + blocks 0-1, stage 1 = blocks 2-3 + ln_f + head.

    sh run.sh 2 pp.py --schedule gpipe
    sh run.sh 2 pp.py --schedule 1f1b

The head is tied to the token embedding, which now lives on both stages: each stage gets a gradient for its
copy and the two must be summed (an extra all-reduce, as Megatron does for its embedding group) or the copies
drift apart. Checked against one process's gradients on the same batch.
"""
import argparse
import torch.nn as nn
import torch.nn.functional as F
from common import *
from torch.distributed.pipelining import PipelineStage, ScheduleGPipe, Schedule1F1B
from model import GPTConfig, make_model, get_batch

ap = argparse.ArgumentParser(); ap.add_argument("--schedule", default="gpipe"); ap.add_argument("--mb", type=int, default=4)
a = ap.parse_args()
rank, world = init()
assert world == 2
cfg = GPTConfig()
full = make_model(cfg, "cpu")


class Stage0(nn.Module):
    def __init__(self, m):
        super().__init__(); self.tok, self.pos, self.blocks = m.tok, m.pos, nn.ModuleList(m.blocks[:2])
    def forward(self, idx):
        x = self.tok(idx) + self.pos(torch.arange(idx.shape[1]))
        for b in self.blocks: x = b(x)
        return x


class Stage1(nn.Module):
    def __init__(self, m):
        super().__init__(); self.blocks, self.ln_f, self.head = nn.ModuleList(m.blocks[2:]), m.ln_f, m.head
    def forward(self, x):
        for b in self.blocks: x = b(x)
        return self.head(self.ln_f(x))


mod = Stage0(full) if rank == 0 else Stage1(full)
events = []
mod.register_forward_pre_hook(lambda m, i: events.append(["F", now()]))
mod.register_forward_hook(lambda m, i, o: events.append(["F_end", now()]))
mod.register_full_backward_pre_hook(lambda m, g: events.append(["B", now()]))
mod.register_full_backward_hook(lambda m, gi, go: events.append(["B_end", now()]))
stage = PipelineStage(mod, rank, world, torch.device("cpu"))
loss_fn = lambda logits, y: F.cross_entropy(logits.reshape(-1, logits.size(-1)), y.reshape(-1))
Sched = {"gpipe": ScheduleGPipe, "1f1b": Schedule1F1B}[a.schedule]
sched = Sched(stage, n_microbatches=a.mb, loss_fn=loss_fn)
import torch.distributed.pipelining.schedules as S_
p2p = []
_orig = S_._batch_p2p
def _logged(ops, desc=None):
    t = now()
    for p in ops:
        p2p.append({"desc": desc, "op": "send" if p.op is dist.isend else "recv", "shape": list(p.tensor.shape),
                    "bytes": p.tensor.numel() * p.tensor.element_size(), "peer": p.group_peer, "t": t})
    return _orig(ops, desc)
S_._batch_p2p = _logged
x, y = get_batch(cfg, 0)
for it in range(2):            # step 0 also infers shapes; step 1 is the one recorded
    events.clear(); p2p.clear(); mod.zero_grad(set_to_none=True)
    losses = []
    def run():
        if rank == 0:
            sched.step(x)
        else:
            sched.step(target=y, losses=losses)
    w = FRWindow().start()
    t0 = now()
    if it == 1:
        _, mem = profile_memory(run)
    else:
        run()
    t1 = now()
    coll = w.stop()
# the tied weight: sum the two stages' gradients
tied = full.tok.weight
g_before = tied.grad.detach().clone() if tied.grad is not None else torch.zeros_like(tied)
w2 = FRWindow().start()
g = g_before.clone(); dist.all_reduce(g)
tied_coll = w2.stop()
ref = make_model(cfg, "cpu"); _, rl = ref(x, y); rl.backward()
names = [n for n, _ in mod.named_parameters()]
rp = dict(ref.named_parameters())
key = {"tok.weight": "tok.weight", "pos.weight": "pos.weight", "ln_f.weight": "ln_f.weight", "ln_f.bias": "ln_f.bias", "head.weight": "tok.weight"}
def refname(n):
    if n.startswith("blocks."):
        i = int(n.split(".")[1]) + (0 if rank == 0 else 2)
        return "blocks." + str(i) + "." + n.split(".", 2)[2]
    return key[n]
diff = max((p.grad - rp[refname(n)].grad).abs().max().item() for n, p in mod.named_parameters() if p.grad is not None and refname(n) != "tok.weight")
tied_diff_before = (g_before - ref.tok.weight.grad).abs().max().item()
tied_diff_after = (g - ref.tok.weight.grad).abs().max().item()
dump(f"pp_{a.schedule}", rank, {"schedule": a.schedule, "n_microbatches": a.mb, "t0": t0, "t1": t1, "events": events,
     "coll": coll, "p2p": p2p, "mem": mem, "losses": [l.item() for l in losses], "ref_loss": rl.item(), "max_grad_diff_untied": diff,
     "tied_grad_diff_before_allreduce": tied_diff_before, "tied_grad_diff_after_allreduce": tied_diff_after,
     "tied_coll": tied_coll, "stage_params": sum(p.numel() for p in mod.parameters()), "stage_param_names": names})
merge(f"pp_{a.schedule}", world)
dist.destroy_process_group()
