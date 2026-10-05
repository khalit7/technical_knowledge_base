"""The running job's checkpoint (the root page's 256-128-10 MLP and SGD state) written three ways, for strace.
usage: ckpt_small.py naive|safe|dcp <dir>"""
import os, sys, torch
from torch import nn
mode, d = sys.argv[1], sys.argv[2]
torch.manual_seed(0)
model = nn.Sequential(nn.Linear(256, 128), nn.ReLU(), nn.Linear(128, 10))
opt = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9)
model(torch.randn(4, 256)).sum().backward(); opt.step()
obj = {"step": 20, "model": model.state_dict(), "opt": opt.state_dict()}
P = os.path.join(d, "ckpt.pt")
if mode == "dcp":
    import torch.distributed as dist, torch.distributed.checkpoint as dcp
    os.environ.update(MASTER_ADDR="127.0.0.1", MASTER_PORT="29533"); dist.init_process_group("gloo", rank=0, world_size=1)
    dcp.save(obj, storage_writer=dcp.FileSystemWriter(os.path.join(d, "step_20")))   # warm-up: imports, first save
    os.access("/phase/ckpt_begin", os.F_OK)
    dcp.save(obj, storage_writer=dcp.FileSystemWriter(os.path.join(d, "step_20")))   # traced: overwrite in place
    os.access("/phase/ckpt_end", os.F_OK); dist.destroy_process_group(); sys.exit()
torch.save(obj, P)                     # an older checkpoint exists, and torch.save's imports are done
os.access("/phase/ckpt_begin", os.F_OK)
if mode == "naive":
    torch.save(obj, P)
else:
    tmp = P + ".tmp"
    with open(tmp, "wb") as f:
        torch.save(obj, f); f.flush(); os.fsync(f.fileno())
    os.replace(tmp, P)
    dfd = os.open(d, os.O_RDONLY); os.fsync(dfd); os.close(dfd)
os.access("/phase/ckpt_end", os.F_OK)
