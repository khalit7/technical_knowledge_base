"""DDP's gradient buckets, observed on CPU (Gloo, 2 ranks), PyTorch 2.14.1.

The same mechanism as on GPUs with NCCL, minus the GPU: DDP registers a hook on every parameter's
gradient; when every gradient of a bucket is ready it launches that bucket's all-reduce
asynchronously, while autograd keeps computing earlier layers. A communication hook lets us
record when each bucket is handed over and when its all-reduce finishes.

Modes, same model and same data:
  overlap : plain DDP (buckets all-reduced during backward)
  serial  : DDP inside no_sync(), then one all-reduce per bucket-sized group after backward ends
Writes out/ddp_<mode>_run<r>.json with rank 0's timeline (seconds from the start of backward).
"""
import json, os, sys, time
import torch, torch.distributed as dist, torch.multiprocessing as mp
from torch.nn.parallel import DistributedDataParallel as DDP

L, H, BATCH, STEPS, CAP_MB = 12, 1024, 512, 6, 8


def model():
    torch.manual_seed(0)
    return torch.nn.Sequential(*[torch.nn.Sequential(torch.nn.Linear(H, H), torch.nn.GELU()) for _ in range(L)])


def worker(rank, world, mode, run, outdir):
    os.environ.update(MASTER_ADDR="127.0.0.1", MASTER_PORT=str(29561 + run))
    torch.set_num_threads(2)
    dist.init_process_group("gloo", rank=rank, world_size=world)
    m = model()
    ddp = DDP(m, bucket_cap_mb=CAP_MB)
    events, t0 = [], [0.0]

    def hook(state, bucket):
        t_ready = time.perf_counter() - t0[0]
        idx, nbytes = bucket.index(), bucket.buffer().numel() * 4
        fut = dist.all_reduce(bucket.buffer(), async_op=True).get_future()

        def done(f):
            events.append(dict(bucket=idx, mb=round(nbytes / 2**20, 2), ready=t_ready,
                               done=time.perf_counter() - t0[0]))
            return f.value()[0].div_(world)
        return fut.then(done)

    ddp.register_comm_hook(None, hook)
    last = [0.0]   # when the first layer's weight gradient (the last one autograd computes) is accumulated
    m[0][0].weight.register_post_accumulate_grad_hook(lambda p: last.__setitem__(0, time.perf_counter() - t0[0]))
    x = torch.randn(BATCH, H, generator=torch.Generator().manual_seed(rank))
    steps = []
    for step in range(STEPS):
        events.clear()
        if mode == "overlap":
            loss = ddp(x).square().mean()
        else:
            with ddp.no_sync():                 # no_sync must wrap the forward too
                loss = ddp(x).square().mean()
        dist.barrier()
        t0[0] = time.perf_counter()
        if mode == "overlap":
            loss.backward()                     # hooks fire during backward
            t_bwd = time.perf_counter() - t0[0]  # backward() returns after DDP waits for its buckets
        else:
            loss.backward()
            t_bwd = time.perf_counter() - t0[0]
            # all-reduce the same bucket sizes after backward, one after another
            grads = [p.grad for p in reversed(list(m.parameters()))]
            cap, group, gi = CAP_MB * 2**20, [], 0
            for g in grads + [None]:
                if g is not None:
                    group.append(g)
                if g is None or sum(t.numel() * 4 for t in group) >= cap:
                    if group:
                        flat = torch.cat([t.flatten() for t in group])
                        tr = time.perf_counter() - t0[0]
                        dist.all_reduce(flat)
                        events.append(dict(bucket=gi, mb=round(flat.numel() * 4 / 2**20, 2), ready=tr,
                                           done=time.perf_counter() - t0[0]))
                        gi, group = gi + 1, []
        t_end = time.perf_counter() - t0[0]
        steps.append(dict(step=step, compute_end=last[0], backward_returned=t_bwd, end=t_end, buckets=sorted(events, key=lambda e: e["ready"])))
    if rank == 0:
        with open(os.path.join(outdir, f"ddp_{mode}_run{run}.json"), "w") as f:
            json.dump(dict(mode=mode, run=run, torch=torch.__version__, world=world, layers=L, hidden=H,
                           batch=BATCH, bucket_cap_mb=CAP_MB, threads_per_rank=2,
                           load=os.getloadavg(), steps=steps), f, indent=1)
    dist.destroy_process_group()


if __name__ == "__main__":
    mode, run, outdir = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    mp.spawn(worker, args=(2, mode, run, outdir), nprocs=2, join=True)
