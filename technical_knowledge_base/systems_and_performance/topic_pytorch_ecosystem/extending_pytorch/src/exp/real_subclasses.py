"""How the real subclasses are built (DTensor, torchao's NF4, Float8 and Int8 tensors) and three dispatch
modes on the running example (FlopCounterMode, FakeTensorMode, a counting TorchDispatchMode).
Deterministic. One process; DTensor uses a one-rank gloo group on 127.0.0.1:29550.
Writes src/inputs/real_subclasses.json.
"""
import contextlib, io, os, re, warnings
import torch
import torch.nn as nn
from common import clean, save
from model import GPTConfig, make_model, get_batch, n_params

warnings.simplefilter("ignore")
torch.set_num_threads(2)
cfg = GPTConfig()
xi, yi = get_batch(cfg, 0)
out = {"torch": torch.__version__}


def describe(t, label):
    d = {"label": label, "class": type(t).__module__ + "." + type(t).__name__,
         "mro": [c.__name__ for c in type(t).__mro__][:4], "shape": list(t.shape), "dtype": str(t.dtype)}
    try:
        names, ctx = t.__tensor_flatten__()
        d["inner"] = []
        tot = 0
        for n in names:
            it = getattr(t, n)
            if isinstance(it, torch.Tensor) and not type(it).__name__ in ("DTensor",):
                b = it.numel() * it.element_size()
                tot += b
                d["inner"].append({"name": n, "shape": list(it.shape), "dtype": str(it.dtype), "bytes": b})
            else:
                d["inner"].append({"name": n, "type": type(it).__name__})
        d["inner_bytes"] = tot
        d["ctx"] = clean(repr(ctx), 240)
    except Exception as e:
        d["flatten_error"] = clean(e, 200)
    try:
        ks = str(torch._C._dispatch_keys(t))
        d["keyset"] = ks
    except Exception:
        pass
    return d


m = make_model(cfg)
W = m.blocks[0].mlp.fc.weight.detach()          # (1024, 256) float32, 1 MiB
REAL = []
REAL.append(describe(W, "plain fc.weight"))

# DTensor on a one-rank mesh
import torch.distributed as dist
os.environ.update(MASTER_ADDR="127.0.0.1", MASTER_PORT="29550")
dist.init_process_group("gloo", rank=0, world_size=1)
from torch.distributed.device_mesh import init_device_mesh
from torch.distributed.tensor import distribute_tensor, Shard, Replicate
mesh = init_device_mesh("cpu", (1,))
dt = distribute_tensor(W, mesh, [Shard(0)])
REAL.append(describe(dt, "DTensor, Shard(0) on a 1-rank mesh"))
try:
    dt @ torch.randn(256, 4)
except Exception as e:
    REAL[-1]["mixed_error"] = clean(f"{type(e).__name__}: {e}", 240)
y = dt @ distribute_tensor(torch.randn(256, 4), mesh, [Replicate()])
REAL[-1]["matmul_result_type"] = type(y).__name__
REAL[-1]["matmul_result_placements"] = str(y.placements)

# torchao
from torchao.quantization.quantize_.workflows.nf4.nf4_tensor import to_nf4
nf = to_nf4(W.clone(), block_size=64, scaler_block_size=256)
REAL.append(describe(nf, "torchao NF4Tensor (block 64)"))
REAL[-1]["dequant_max_err"] = (nf.get_original_weight() - W).abs().max().item()

try:
    from torchao.quantization import quantize_, Int8WeightOnlyConfig
    lin = nn.Linear(256, 1024)
    lin.weight.data.copy_(W)
    quantize_(lin, Int8WeightOnlyConfig())
    REAL.append(describe(lin.weight, "torchao Int8WeightOnlyConfig weight"))
    # which aten op the int8 linear calls on CPU
    from torch.utils._python_dispatch import TorchDispatchMode
    seen = []

    class Rec(TorchDispatchMode):
        def __torch_dispatch__(self, func, types, args=(), kwargs=None):
            seen.append(str(func))
            return func(*args, **(kwargs or {}))
    with torch.no_grad(), Rec():
        lin(torch.randn(4, 256))
    REAL[-1]["aten_calls"] = seen
except Exception as e:
    REAL.append({"label": "torchao Int8WeightOnlyConfig weight", "error": clean(e, 300)})

try:
    from torchao.float8.float8_training_tensor import Float8TrainingTensor
    from torchao.float8.float8_scaling_utils import hp_tensor_to_float8_dynamic
    from torchao.float8.config import ScalingGranularity
    from torchao.float8.float8_training_tensor import LinearMMConfig, GemmInputRole
    f8 = hp_tensor_to_float8_dynamic(W, torch.float8_e4m3fn, LinearMMConfig(), gemm_input_role=GemmInputRole.WEIGHT)
    REAL.append(describe(f8, "torchao Float8TrainingTensor (e4m3, tensorwise)"))
    try:
        a = hp_tensor_to_float8_dynamic(torch.randn(16, 256), torch.float8_e4m3fn, LinearMMConfig(),
                                        gemm_input_role=GemmInputRole.INPUT)
        r = torch.mm(a, f8.t())
        REAL[-1]["mm_on_cpu"] = "ran: " + type(r).__name__ + " " + str(r.dtype)
    except Exception as e:
        REAL[-1]["mm_on_cpu"] = clean(f"{type(e).__name__}: {e}", 260)
except Exception as e:
    REAL.append({"label": "torchao Float8TrainingTensor", "error": clean(f"{type(e).__name__}: {e}", 300)})
out["real"] = REAL
dist.destroy_process_group()

# ---------- modes ----------
MODES = {}
from torch.utils.flop_counter import FlopCounterMode
fc = FlopCounterMode(display=False, depth=2)
m = make_model(cfg)
with fc:
    _, loss = m(xi, yi)
    loss.backward()
tot = fc.get_total_flops()
per = fc.get_flop_counts()
MODES["flops_total"] = tot
MODES["flops_by_module"] = {k: {str(op).replace("aten.", ""): v for op, v in d.items()} for k, d in per.items()
                            if k.count(".") <= 1}
N = n_params(m)
tokens = cfg.batch_size * cfg.block_size
MODES["six_n_t"] = 6 * N * tokens
# non-embedding parameters (tok and pos embedding lookups do no matmul flops, but tok is also the head)
MODES["n_params"] = N
# the same with attention written out (attn="manual"): the CPU SDPA kernel has no flop formula
from torch.utils._python_dispatch import TorchDispatchMode
sdpa_ops = set()


class OpNames(TorchDispatchMode):
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        if "attention" in str(func):
            sdpa_ops.add(str(func))
        return func(*args, **(kwargs or {}))


with OpNames():
    _, l2 = make_model(cfg)(xi, yi)
    l2.backward()
MODES["sdpa_ops_on_cpu"] = sorted(sdpa_ops)
from model import GPTConfig as _C
cfgm = _C(attn="manual")
fc2 = FlopCounterMode(display=False)
mm_ = make_model(cfgm)
with fc2:
    _, l3 = mm_(xi, yi)
    l3.backward()
MODES["flops_total_manual_attn"] = fc2.get_total_flops()
MODES["flops_manual_by_op"] = {str(op).replace("aten.", ""): v for op, v in fc2.get_flop_counts()["Global"].items()}
MODES["tokens"] = tokens

from torch._subclasses.fake_tensor import FakeTensorMode
with FakeTensorMode() as fm:
    from model import GPT
    mf = GPT(cfg)          # make_model's .to() fails under FakeTensorMode (tied weight swap; see the sibling page)
    xf, yf = fm.from_tensor(xi), fm.from_tensor(yi)     # the real batch, as fake tensors
    lf, lossf = mf(xf, yf)
    MODES["fake"] = {"logits": list(lf.shape), "loss_shape": list(lossf.shape), "logits_type": type(lf).__name__,
                     "params_type": type(next(mf.parameters())).__name__}
    try:
        lossf.item()
    except Exception as e:
        MODES["fake"]["item_error"] = clean(f"{type(e).__name__}: {e}", 240)
out["modes"] = MODES
save("real_subclasses.json", out)
for r in REAL:
    print({k: v for k, v in r.items() if k not in ("aten_calls",)})
print(MODES["flops_total"], MODES["six_n_t"], MODES["fake"])
