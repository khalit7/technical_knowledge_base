"""torch.compile on a DDP-wrapped running example, 2 CPU processes on gloo: how many graphs Dynamo's DDPOptimizer
splits the model into for several bucket sizes, against optimize_ddp=False. Deterministic (graph counts and sizes).
Usage: MASTER_ADDR=127.0.0.1 torchrun --nproc_per_node 2 --master_addr 127.0.0.1 --master_port 29521 ddp_compile.py"""
import os
from common import *
import torch.distributed as dist
import torch._dynamo.config as dc
from torch.nn.parallel import DistributedDataParallel as DDP
dist.init_process_group("gloo")
rank = dist.get_rank(); torch.set_num_threads(1)
cfg = GPTConfig(); x, y = get_batch(cfg, rank)
R = {"world": dist.get_world_size(), "runs": []}
for opt_ddp, cap in [(True, 25), (True, 4), (True, 1), (False, 1)]:
    torch._dynamo.reset(); dc.optimize_ddp = opt_ddp
    graphs = []
    def be(gm, ex):
        graphs.append(sum(1 for n in gm.graph.nodes if n.op in ("call_function", "call_method", "call_module")))
        return gm.forward
    m = DDP(make_model(cfg), bucket_cap_mb=cap)
    with quiet():
        _, loss = torch.compile(m, backend=be)(x, y); loss.backward()
    R["runs"].append({"optimize_ddp": opt_ddp, "bucket_cap_mb": cap, "graphs": len(graphs), "ops_per_graph": graphs})
    if rank == 0: print(R["runs"][-1], flush=True)
if rank == 0:
    save("ddp_compile.json", R)
dist.destroy_process_group()
