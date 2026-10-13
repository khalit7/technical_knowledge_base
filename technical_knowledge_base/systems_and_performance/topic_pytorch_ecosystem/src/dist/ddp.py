"""DDP on the running example: buckets, the all-reduce per bucket, and when each fires during backward.

    sh run.sh 2 ddp.py --tag ddp_w2                 # default buckets (first 1 MiB, then 25 MiB)
    sh run.sh 2 ddp.py --bucket-mb 1 --tag ddp_w2_b1
    sh run.sh 4 ddp.py --tag ddp_w4
    sh run.sh 2 ddp.py --as-view --tag ddp_w2_view  # gradient_as_bucket_view=True

Rank r trains on batch s*world + r at step s. Records 3 steps: step 0 (buckets in reverse parameter order),
then DDP rebuilds its buckets in the order gradients arrived, steps 1 and 2 use them.
Checks that the averaged gradient equals a single process's gradient on all ranks' batches together.
"""
import argparse, time
from common import *
from torch.nn.parallel import DistributedDataParallel as DDP
from model import GPTConfig, make_model, get_batch, make_optimizer

ap = argparse.ArgumentParser()
ap.add_argument("--bucket-mb", type=float, default=None)
ap.add_argument("--as-view", action="store_true")
ap.add_argument("--tag", required=True)
ap.add_argument("--steps", type=int, default=3)
ap.add_argument("--layers", type=int, default=4)
ap.add_argument("--d", type=int, default=256)
a = ap.parse_args()

rank, world = init()
cfg = GPTConfig(n_layer=a.layers, d_model=a.d)
model = make_model(cfg, "cpu")
names = {id(p): n for n, p in model.named_parameters()}
opt_model = model
fr = FRWindow().start()
ddp = DDP(model, bucket_cap_mb=a.bucket_mb, gradient_as_bucket_view=a.as_view)
init_coll = fr.stop()
opt = make_optimizer(ddp.module)


def bucket_layout():
    bks = ddp.reducer._get_zeros_like_grad_buckets()
    return [{"index": b.index(), "numel": b.buffer().numel(), "bytes": b.buffer().numel() * 4,
             "params": [names[id(p)] for p in b.parameters()]} for b in bks]


ready = []
for n, p in model.named_parameters():
    p.register_post_accumulate_grad_hook(lambda p, n=n: ready.append((n, now())))

steps = []
for s in range(a.steps):
    x, y = get_batch(cfg, s * world + rank)
    layout = bucket_layout()
    ready.clear()
    w = FRWindow().start()
    t0 = now()
    _, loss = ddp(x, y)
    t1 = now()
    loss.backward()
    t2 = now()
    grads = {n: p.grad.detach().clone() for n, p in model.named_parameters()} if s == 0 else None
    opt.step(); opt.zero_grad(set_to_none=True)
    t3 = now()
    coll = w.stop()
    steps.append({"step": s, "loss": loss.item(), "buckets": layout, "buckets_after": bucket_layout(), "coll": coll,
                  "t": {"fwd0": t0, "fwd1": t1, "bwd1": t2, "opt1": t3},
                  "ready": [[n, t] for n, t in ready]})
    if s == 0:
        g0 = grads

# check: the averaged gradient equals one process's gradient over all ranks' batches together
chk = None
if rank == 0:
    ref = make_model(cfg, "cpu")
    xs, ys = zip(*[get_batch(cfg, r) for r in range(world)])
    _, l = ref(torch.cat(xs), torch.cat(ys)); l.backward()
    diff = max((g0[n] - p.grad).abs().max().item() for n, p in ref.named_parameters())
    chk = {"max_abs_grad_diff_vs_single_process_full_batch": diff, "full_batch_loss": l.item()}

# memory: persistent state and the profiler's peak over one more step
x, y = get_batch(cfg, a.steps * world + rank)
def one():
    _, l = ddp(x, y); mark("fwd"); l.backward(); mark("bwd"); opt.step(); opt.zero_grad(set_to_none=not a.as_view)
_, mem = profile_memory(one)
buf = ddp.reducer._get_zeros_like_grad_buckets()
state = {"params": live_bytes_of(list(model.parameters())),
         "opt_state": live_bytes_of([v for st in opt.state.values() for v in st.values() if torch.is_tensor(v)]),
         "bucket_buffers": sum(b.buffer().numel() * 4 for b in buf)}
log = ddp._get_ddp_logging_data()
logk = {k: log.get(k) for k in ("bucket_sizes", "rebuilt_bucket_sizes", "bucket_cap_bytes", "gradient_as_bucket_view",
                               "num_parameter_tensors", "total_parameter_size_bytes", "rebuilt_per_bucket_param_indices", "comm_hook")}
dump(a.tag, rank, {"args": vars(a), "init_coll": init_coll, "steps": steps, "check": chk, "mem": mem, "state": state,
                   "ddp_logging": logk, "param_order": [n for n, _ in model.named_parameters()],
                   "param_numel": {n: p.numel() for n, p in model.named_parameters()}})
merge(a.tag, world)
dist.destroy_process_group()
