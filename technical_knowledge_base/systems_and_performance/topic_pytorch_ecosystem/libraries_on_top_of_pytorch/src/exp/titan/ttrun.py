"""Run torchtitan 0.3.0's own trainer (torchtitan.train) on a Mac CPU. It does not run unmodified; four patches,
each the smallest that gets past one failure seen here (the failure is quoted in ../../README.md):

 1. torchtitan.distributed.minimal_async_ep.kernels does `import triton` at import time (through
    models/common/decoder.py -> moe.py -> token_dispatcher.py) and Triton has no macOS wheels: the module is
    replaced by a stub whose functions raise. The dense Llama 3 debug model never calls them.
 2. The device: torchtitan takes it from torch._utils._get_available_device_type() at import (MPS here) and then
    calls a CUDA-style API on it (set_device, get_device_name, memory_stats, barrier(device_ids=...)). We report
    "cpu", give torch.cpu the few memory functions it calls (returning zeros), and drop barrier's device_ids.
 3. Attention: language models must use FlexAttention or varlen ("sdpa is no longer supported for language
    models") and FlexAttention has no backward on CPU at torch 2.14.1. FlexAttention.compiled_flex_attn is
    replaced by SDPA with the same block mask made dense (create_mask on the BlockMask's mask_mod).
    TT_CHECK=1 compares the two in forward on the first calls.
 4. Gloo has no ReduceOp.PREMUL_SUM, which FSDP2 picks for its gradient reduce-scatter once torchtitan sets the
    gradient divide factor to 1.0 (it divides by the global token count itself). We ask FSDP2 for a plain SUM
    (force_sum_reduction_for_comms), which then divides by 1.0 afterwards: the same numbers.
 5. Nothing else: the trainer, the parallelisms, the loss, the optimizer, the schedule and clipping are torchtitan's.

Env: TT_TRACE=<json path> records library-to-torch calls (../apitrace.py) on rank 0; TT_CHECK=<json path>.
Run through run_titan.sh."""
import json, os, sys, types, runpy

# 1. Triton-only kernel module
def _missing(name):
    if name.startswith("__"):
        raise AttributeError(name)
    def f(*a, **k):
        raise RuntimeError(f"stub: Triton kernel {name} is unavailable on this machine")
    return f
m = types.ModuleType("torchtitan.distributed.minimal_async_ep.kernels"); m.__getattr__ = _missing
sys.modules[m.__name__] = m

# 2. CPU device
import collections, torch, torch._utils, torch.distributed as _d
torch._utils._get_available_device_type = lambda: "cpu"
c = torch.cpu
c.get_device_name = lambda *a: "cpu"
c.current_device = lambda: 0
c.get_device_properties = lambda *a: types.SimpleNamespace(total_memory=32 * 2**30)
c.reset_peak_memory_stats = lambda *a: None
c.empty_cache = lambda *a: None
c.memory_stats = lambda *a: collections.defaultdict(int)
_barrier = _d.barrier
_d.barrier = lambda *a, device_ids=None, **k: _barrier(*a, **k)

# 3. Attention: dense block mask + SDPA
import torch.nn.functional as F
from torch.nn.attention.flex_attention import create_mask, flex_attention
import torchtitan.models.common.attention as A
_checks = []


def _math_flex(q, k, v, *, score_mod, block_mask, scale, enable_gqa, return_aux, kernel_options):
    assert score_mod is None and not return_aux.lse
    B, H, L, _ = q.shape
    mask = create_mask(block_mask.mask_mod, B, 1, L, k.shape[2], device=q.device)
    out = F.scaled_dot_product_attention(q, k, v, attn_mask=mask, scale=scale, enable_gqa=enable_gqa)
    if os.environ.get("TT_CHECK") and len(_checks) < 6:
        with torch.no_grad():
            ref = flex_attention(q.detach(), k.detach(), v.detach(), block_mask=block_mask, scale=scale, enable_gqa=enable_gqa)
            f64 = F.scaled_dot_product_attention(q.detach().double(), k.detach().double(), v.detach().double(), attn_mask=mask,
                                                 scale=scale, enable_gqa=enable_gqa)
        _checks.append({"shape": list(q.shape), "dtype": str(q.dtype), "max_abs_diff": float((ref - out.detach()).abs().max()),
                        "sdpa_vs_f64": float((out.detach().double() - f64).abs().max()), "flex_vs_f64": float((ref.double() - f64).abs().max()),
                        "masked_fraction": round(1 - mask.float().mean().item(), 4)})
        if int(os.environ.get("RANK", 0)) == 0:
            json.dump(_checks, open(os.environ["TT_CHECK"], "w"), indent=1)
    return out, None


A.FlexAttention.compiled_flex_attn = staticmethod(_math_flex)

# 4. FSDP2 on gloo: SUM instead of PREMUL_SUM(1.0)
import torch.distributed.fsdp._fully_shard._fsdp_collectives as _fc
_gdf = _fc._get_gradient_divide_factors
def _gdf_sum(rs_group, ar_group, reduce_dtype, device_type="", factor=None, force_sum=False):
    return _gdf(rs_group, ar_group, reduce_dtype, device_type, factor, True)
_fc._get_gradient_divide_factors = _gdf_sum

# optional: the API-level trace
tracer = None
if os.environ.get("TT_TRACE"):
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    from apitrace import Tracer
    import torchtitan.trainer as TT
    tracer = Tracer()
    _train = TT.Trainer.train
    def _train_traced(self, *a, **k):
        tracer.phase = "loop"
        return _train(self, *a, **k)
    TT.Trainer.train = _train_traced
    tracer.__enter__()

sys.argv = ["torchtitan.train"] + sys.argv[1:]
try:
    runpy.run_module("torchtitan.train", run_name="__main__")
finally:
    if tracer is not None:
        tracer.__exit__()
        if int(os.environ.get("RANK", 0)) == 0:
            json.dump({"edges": tracer.result()}, open(os.environ["TT_TRACE"], "w"), indent=1)
