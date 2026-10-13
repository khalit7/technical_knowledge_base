"""Which performance APIs exist in this torch/torchao install (deterministic, no timing)."""
import importlib, inspect, json, sys, warnings
warnings.filterwarnings("ignore")
import torch
out = {"torch": torch.__version__}
def has(path):
    mod, _, attr = path.rpartition(".")
    try:
        m = importlib.import_module(mod)
        return hasattr(m, attr)
    except Exception as e:
        return f"import error: {type(e).__name__}"
names = [
 "torch.nn.attention.sdpa_kernel", "torch.nn.attention.SDPBackend",
 "torch.nn.attention.flex_attention.flex_attention", "torch.nn.attention.flex_attention.create_block_mask",
 "torch.nn.attention.flex_attention.and_masks", "torch.nn.attention.flex_attention.or_masks",
 "torch.nn.attention.varlen.varlen_attn", "torch.nn.attention.varlen_attn",
 "torch.nn.LinearCrossEntropyLoss", "torch.nn.functional.linear_cross_entropy",
 "torch.utils.checkpoint.create_selective_checkpoint_contexts", "torch.utils.checkpoint.CheckpointPolicy",
 "torch._functorch.config.activation_memory_budget",
 "torch.cuda.memory._record_memory_history", "torch.cuda.memory._dump_snapshot",
 "torch.mps.current_allocated_memory", "torch.mps.driver_allocated_memory", "torch.mps.recommended_max_memory",
 "torch.mps.profiler.profile", "torch.mps.profiler.metal_capture",
 "torch.profiler._memory_profiler.Category", "torch.profiler.schedule", "torch.profiler.record_function",
 "torch.utils.benchmark.Timer", "torch.utils.data.DataLoader",
 "torch.accelerator.memory.max_memory_allocated", "torch.accelerator.max_memory_allocated",
 "torchao.quantization.Int8WeightOnlyConfig", "torchao.quantization.Int4WeightOnlyConfig",
 "torchao.quantization.Int8DynamicActivationInt8WeightConfig", "torchao.quantization.quantize_",
 "torchao.quantization.Float8DynamicActivationFloat8WeightConfig",
 "torchao.float8.convert_to_float8_training", "torchao.float8.Float8LinearConfig",
 "torchao.quantization.qat.QATConfig", "torchao.quantization.qat.IntXQuantizationAwareTrainingConfig",
 "torchao.prototype.mx_formats.MXLinearConfig", "torchao.optim.AdamW8bit", "torchao.optim.CPUOffloadOptimizer",
 "torchao.sparsity.sparsify_",
]
out["has"] = {n: has(n) for n in names}
from torch.nn.attention import SDPBackend
out["SDPBackend"] = [m for m in dir(SDPBackend) if m.isupper()]
try:
    from torch.profiler._memory_profiler import Category
    out["mem_categories"] = [c.name for c in Category]
except Exception as e:
    out["mem_categories"] = repr(e)
try:
    from torch.utils.checkpoint import CheckpointPolicy
    out["ckpt_policy"] = [c.name for c in CheckpointPolicy]
except Exception as e:
    out["ckpt_policy"] = repr(e)
try:
    out["record_memory_history_sig"] = str(inspect.signature(torch.cuda.memory._record_memory_history))
except Exception as e:
    out["record_memory_history_sig"] = repr(e)
try:
    import torch._functorch.config as fc
    out["activation_memory_budget_default"] = fc.activation_memory_budget
except Exception as e:
    out["activation_memory_budget_default"] = repr(e)
try:
    out["schedule_sig"] = str(inspect.signature(torch.profiler.schedule))
except Exception as e:
    out["schedule_sig"] = repr(e)
try:
    out["dataloader_sig"] = str(inspect.signature(torch.utils.data.DataLoader.__init__))
except Exception as e:
    out["dataloader_sig"] = repr(e)
import torch.nn.attention as A
out["nn_attention_dir"] = [n for n in dir(A) if not n.startswith("_")]
try:
    import torch.nn.attention.flex_attention as F
    out["flex_dir"] = [n for n in dir(F) if not n.startswith("_")]
    out["flex_sig"] = str(inspect.signature(F.flex_attention))
except Exception as e:
    out["flex_dir"] = repr(e)
try:
    import torchao; out["torchao"] = torchao.__version__
except Exception as e:
    out["torchao"] = repr(e)
print(json.dumps(out, indent=1, default=str))
