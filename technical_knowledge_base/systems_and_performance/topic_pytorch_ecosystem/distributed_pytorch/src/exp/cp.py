"""Context parallel (ring attention) on 2 CPU ranks at the attention level: the real q, k, v of the running
example's block 0 (batch 0), sequence split across ranks.

    sh run.sh 2 cp.py
(1) the public API, torch.distributed.tensor.experimental.context_parallel, around F.scaled_dot_product_attention;
(2) PyTorch's ring template (_templated_ring_attention) called with the CPU flash kernel, which the public API does
not route (its handlers cover the CUDA flash, efficient and cuDNN ops only); compared with full attention.
"""
import torch.nn.functional as F
from dptc import *
from model import GPTConfig, make_model, get_batch

rank, world = init()
mesh = cpu_mesh((world,), ("cp",))
cfg = GPTConfig(); m = make_model(cfg); x, _ = get_batch(cfg, 0)
cap = {}
def grab(mod, inp, out):
    B, T, C3 = out.shape; C = C3 // 3
    q, k, v = out.split(C, dim=2)
    cap["qkv"] = [t.view(B, T, cfg.n_head, C // cfg.n_head).transpose(1, 2).contiguous() for t in (q, k, v)]
m.blocks[0].attn.qkv.register_forward_hook(grab)
with torch.no_grad():
    m(x)
q, k, v = cap["qkv"]
full = F.scaled_dot_product_attention(q, k, v, is_causal=True)
out = {"shape_qkv": list(q.shape)}


def err(e):
    return type(e).__name__ + ": " + " ".join(str(e).split())[:400]


# (1) public API
from torch.distributed.tensor.experimental import context_parallel
qa, ka, va = q.clone(), k.clone(), v.clone()
w = FRWindow().start()
try:
    with context_parallel(mesh, buffers=[qa, ka, va], buffer_seq_dims=[2, 2, 2]):
        local_shape = list(qa.shape)
        o = F.scaled_dot_product_attention(qa, ka, va, is_causal=True)
        res = {"ok": True, "local_q_shape": local_shape, "out_type": type(o).__name__}
except Exception as e:
    res = {"ok": False, "error": err(e)}
res["coll"] = [[(e["profiling_name"] or "").replace("gloo:", ""), e["in_bytes"]] for e in w.stop()]
out["public_api"] = res

# (2) the ring template with the CPU flash kernel, no load balancing: rank r holds positions r*T/2 .. (r+1)*T/2 - 1
from torch.distributed.tensor.experimental._context_parallel._attention import _templated_ring_attention, _cp_options
T = q.shape[2]; n = T // world
ql, kl, vl = (t[:, :, rank * n:(rank + 1) * n].contiguous() for t in (q, k, v))
_cp_options.enable_load_balance = False
w = FRWindow().start()
try:
    o, *_ = _templated_ring_attention(mesh.get_group(), 2, torch.ops.aten._scaled_dot_product_flash_attention_for_cpu,
                                      ql, kl, vl, is_causal=True)
    ref = full[:, :, rank * n:(rank + 1) * n]
    out["ring_cpu_flash"] = {"ok": True, "max_abs_diff_vs_full": (o - ref).abs().max().item(), "local_out_shape": list(o.shape)}
except Exception as e:
    out["ring_cpu_flash"] = {"ok": False, "error": err(e)}
out["ring_cpu_flash"]["coll"] = [[(e["profiling_name"] or "").replace("gloo:", ""), e["in_bytes"], e["out_bytes"]] for e in w.stop()]
# the same with the ring rotated by all_to_all (pass K and V to the next rank, world - 1 times) instead of one all-gather
from torch.distributed.tensor.experimental._context_parallel._attention import set_rotate_method
set_rotate_method("alltoall")
w = FRWindow().start()
try:
    o, *_ = _templated_ring_attention(mesh.get_group(), 2, torch.ops.aten._scaled_dot_product_flash_attention_for_cpu,
                                      ql, kl, vl, is_causal=True)
    out["ring_alltoall"] = {"ok": True, "max_abs_diff_vs_full": (o - full[:, :, rank * n:(rank + 1) * n]).abs().max().item()}
except Exception as e:
    out["ring_alltoall"] = {"ok": False, "error": err(e)}
out["ring_alltoall"]["coll"] = [[(e["profiling_name"] or "").replace("gloo:", ""), e["in_bytes"], e["out_bytes"]] for e in w.stop()]
out["kv_bytes_per_rank"] = (kl.numel() + vl.numel()) * 4
dump("cp", rank, out)
merge("cp", world)
dist.destroy_process_group()
