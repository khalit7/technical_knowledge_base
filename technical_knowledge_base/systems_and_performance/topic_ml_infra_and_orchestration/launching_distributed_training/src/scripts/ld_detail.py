"""ld_detail.py: which part of a step crashes under TORCH_DISTRIBUTED_DEBUG=DETAIL (gloo, CPU, torch 2.14.1)?
--what allreduce : one all_reduce of a scalar, no DDP
--what mismatch  : rank 0 all-reduces shape [1], the others shape [2] (no DDP)
--what ddp       : wrap the running example's model in DDP and run one forward/backward
Run under torchrun with PYTHONFAULTHANDLER=1 so a segfault prints the Python stack.
"""
import argparse, datetime, importlib.util, json, os, time
import torch, torch.distributed as dist, torch.nn as nn, torch.nn.functional as F

p = argparse.ArgumentParser(); p.add_argument("--what", default="allreduce"); a = p.parse_args()
rank = int(os.environ["RANK"])
dist.init_process_group("gloo", timeout=datetime.timedelta(seconds=30))
print(json.dumps({"ev": "init", "rank": rank, "debug": os.environ.get("TORCH_DISTRIBUTED_DEBUG", "OFF"),
                  "backend": str(dist.get_backend()), "pg": type(dist.distributed_c10d._get_default_group()).__name__}), flush=True)
try:
    if a.what == "allreduce":
        t = torch.ones(1); dist.all_reduce(t); print(json.dumps({"ev": "ok", "rank": rank, "sum": t.item()}), flush=True)
    elif a.what == "mismatch":
        t = torch.ones(1 if rank == 0 else 2); dist.all_reduce(t); print(json.dumps({"ev": "ok", "rank": rank}), flush=True)
    elif a.what == "ddp":
        spec = importlib.util.spec_from_file_location("mi_train", os.environ.get("LD_TRAIN", "/opt/mi/train.py"))
        T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T); ta = T.parse([])
        data, vocab = T.load_text(ta.data); torch.manual_seed(ta.seed)
        m = T.GPT(vocab, ta.d, ta.layers, ta.heads, ta.ctx)
        print(json.dumps({"ev": "ddp_wrap", "rank": rank}), flush=True)
        ddp = nn.parallel.DistributedDataParallel(m)
        print(json.dumps({"ev": "ddp_ok", "rank": rank}), flush=True)
        x, y = T.get_batch(data, 0, ta, rank, dist.get_world_size())
        F.cross_entropy(ddp(x).view(-1, vocab), y.view(-1)).backward()
        print(json.dumps({"ev": "step_ok", "rank": rank}), flush=True)
    dist.destroy_process_group()
except Exception as e:  # noqa
    print(json.dumps({"ev": "error", "rank": rank, "type": type(e).__name__, "msg": str(e)[:1500]}), flush=True)
    raise
