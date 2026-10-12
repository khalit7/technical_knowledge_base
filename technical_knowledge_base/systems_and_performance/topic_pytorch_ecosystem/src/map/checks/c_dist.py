"""Run with: torchrun --nproc_per_node 2 c_dist.py  (CPU, gloo). Which core class does each library hand back?"""
from common import *
import torch, torch.distributed as dist
torch.set_num_threads(1)
from model import GPTConfig, make_model, get_batch, make_optimizer
cfg = GPTConfig()
res = {}
# accelerate: plain prepare -> DDP
from accelerate import Accelerator
acc = Accelerator(cpu=True)
m = make_model(cfg, "cpu"); opt = make_optimizer(m)
pm, popt = acc.prepare(m, opt)
x, y = get_batch(cfg, acc.process_index)
_, loss = pm(x, y); acc.backward(loss); popt.step(); popt.zero_grad()
res["accelerate_ddp"] = {"distributed_type": str(acc.distributed_type), "num_processes": acc.num_processes,
    "backend": dist.get_backend(), "prepared_model_type": type(pm).__module__ + "." + type(pm).__name__,
    "loss_rank": round(loss.item(), 5)}
# accelerate FSDP2 on CPU
try:
    from accelerate.utils import FullyShardedDataParallelPlugin
    from accelerate.state import AcceleratorState
    AcceleratorState._reset_state(True)
    plug = FullyShardedDataParallelPlugin(fsdp_version=2, auto_wrap_policy="transformer_based_wrap", transformer_cls_names_to_wrap=["Block"], reshard_after_forward=True)
    acc2 = Accelerator(cpu=True, fsdp_plugin=plug)
    m2 = make_model(cfg, "cpu"); opt2 = make_optimizer(m2)
    pm2, popt2 = acc2.prepare(m2, opt2)
    res["accelerate_fsdp2_request"] = {"distributed_type": str(acc2.distributed_type), "prepared_model_type": type(pm2).__module__ + "." + type(pm2).__name__,
        "note": "accelerate/state.py picks DistributedType.FSDP only inside the branch for multi-accelerator types (MULTI_GPU, MULTI_NPU, ...); MULTI_CPU is not in that list, so on CPU the FSDP plugin is ignored and prepare() returns DDP"}
    if not hasattr(pm2, "blocks"): raise RuntimeError("not sharded on CPU")
    from torch.distributed.tensor import DTensor
    w = pm2.blocks[0].mlp.fc.weight
    _, l2 = pm2(x, y); acc2.backward(l2); popt2.step()
    res["accelerate_fsdp2"] = {"ok": True, "model_type": type(pm2).__name__, "mro": [c.__name__ for c in type(pm2).__mro__[:3]],
        "block_type": type(pm2.blocks[0]).__name__, "weight_is_dtensor": isinstance(w, DTensor),
        "placements": str(getattr(w, "placements", None)), "local_shape": list(w.to_local().shape) if isinstance(w, DTensor) else None,
        "global_shape": list(w.shape), "loss_rank": round(l2.item(), 5)}
except Exception as e:
    res["accelerate_fsdp2"] = {"ok": False, "error": repr(e)[:400]}
# Lightning with devices=2 would launch its own processes; under torchrun it detects the environment.
try:
    import lightning as L
    from lightning.fabric import Fabric
    fab = Fabric(accelerator="cpu", devices=2, strategy="ddp")
    fab.launch()
    m3 = make_model(cfg, "cpu"); o3 = make_optimizer(m3)
    fm, fo = fab.setup(m3, o3)
    _, l3 = fm(x, y); fab.backward(l3); fo.step()
    res["lightning_fabric_ddp"] = {"strategy": type(fab.strategy).__name__, "inner_module_type": type(fm._forward_module).__module__ + "." + type(fm._forward_module).__name__,
        "loss_rank": round(l3.item(), 5)}
except Exception as e:
    res["lightning_fabric_ddp"] = {"error": repr(e)[:400]}
if dist.get_rank() == 0:
    save("dist_wrappers", res)
