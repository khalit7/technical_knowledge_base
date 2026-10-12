"""torchao 0.18.0 on the running example, CPU: int8 weight-only quantize_ swaps nn.Linear weights for a tensor subclass."""
from common import *
import torch, torchao
torch.set_num_threads(2)
from model import GPTConfig, make_model, get_batch
from torchao.quantization import quantize_
cfg = GPTConfig(); m = make_model(cfg, "cpu").eval()
x, y = get_batch(cfg, 0)
with torch.no_grad(): ref, ref_loss = m(x, y)
w0 = m.blocks[0].mlp.fc.weight
res = {"torchao": torchao.__version__, "before_type": type(w0.data).__name__, "before_bytes_linear": 0}
lin = [mod for mod in m.modules() if isinstance(mod, torch.nn.Linear)]
res["n_linear"] = len(lin)
res["before_bytes_linear"] = sum(l.weight.numel() * l.weight.element_size() for l in lin if l is not m.head)
tried = []
cfgs = []
try:
    from torchao.quantization import Int8WeightOnlyConfig; cfgs.append(("Int8WeightOnlyConfig", Int8WeightOnlyConfig()))
except Exception as e: tried.append(("Int8WeightOnlyConfig import", repr(e)))
# skip the tied head (its weight is the embedding): filter
flt = lambda mod, fqn: isinstance(mod, torch.nn.Linear) and fqn != "head"
for name, qc in cfgs:
    try:
        quantize_(m, qc, filter_fn=flt)
        w = m.blocks[0].mlp.fc.weight
        res["config"] = name
        res["after_type"] = type(w).__name__
        res["after_type_mro"] = [c.__name__ for c in type(w).__mro__][:5]
        res["is_tensor_subclass"] = isinstance(w, torch.Tensor) and type(w) is not torch.Tensor and type(w) is not torch.nn.Parameter
        res["has_torch_dispatch"] = "__torch_dispatch__" in type(w).__dict__ or any("__torch_dispatch__" in c.__dict__ for c in type(w).__mro__[:-3])
        inner = {}
        for attr in ("qdata", "int_data", "tensor_impl", "scale"):
            if hasattr(w, attr):
                v = getattr(w, attr)
                if isinstance(v, torch.Tensor): inner[attr] = [str(v.dtype), list(v.shape)]
                else: inner[attr] = type(v).__name__
        res["inner"] = inner
        with torch.no_grad(): out, loss = m(x, y)
        res["loss_fp32"] = round(ref_loss.item(), 5); res["loss_int8wo"] = round(loss.item(), 5)
        res["max_abs_logit_diff"] = float((out - ref).abs().max())
        break
    except Exception as e:
        tried.append((name, repr(e)[:300]))
res["errors"] = tried
save("torchao", res)
