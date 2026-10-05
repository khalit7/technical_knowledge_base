"""Count every FLOP and every byte of one real training step of Llama 3.1 8B (and 70B), on the meta device.

The meta device runs PyTorch's real operators on shapes only: no memory is allocated and nothing is computed,
so the full 8B model (and 70B) can be traced on a laptop. For one forward and one backward pass we record, per aten
operator: FLOPs (PyTorch's own torch.utils.flop_counter registry, the formulas FlopCounterMode uses) and bytes read
plus written (sum of input and output tensor sizes; views move nothing and are skipped). That is the traffic of
unfused eager execution, an upper bound on what a fused kernel moves.

Saved activations: torch.autograd.graph.saved_tensors_hooks sees every tensor autograd keeps for the backward pass;
we sum them per layer, counting each underlying tensor once and excluding parameters.

Attention backends: 'eager' (transformers' matmul + softmax path: saves the score matrix) and 'flash' (a registered
attention function that calls aten._scaled_dot_product_flash_attention, the op PyTorch runs on NVIDIA GPUs; its autograd
saves q, k, v, the output and the log-sum-exp only).

usage: python trace_llama.py <cfg.json> <seq> <eager|flash> <out.json> [layers|0] [ckpt]
"""
import json, sys, math, time, traceback
import torch
from torch.utils._python_dispatch import TorchDispatchMode
from torch.utils.flop_counter import flop_registry
import transformers
from transformers import LlamaConfig, LlamaForCausalLM
from transformers import AttentionInterface

cfg_path, SEQ, ATTN, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
LAYERS = int(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != "0" else None
CKPT = len(sys.argv) > 6 and sys.argv[6] == "ckpt"
torch.manual_seed(0)
c = json.load(open(cfg_path))
for k in ("unsloth_fixed", "_name_or_path", "transformers_version", "architectures", "torch_dtype"):
    c.pop(k, None)
if LAYERS:
    c["num_hidden_layers"] = LAYERS
cfg = LlamaConfig(**c)


class FlashGQA(torch.autograd.Function):
    """Saves exactly what the flash-attn library's FlashAttnFunc saves for backward (q, k, v with their own KV heads,
    the output and the log-sum-exp; flash_attn/flash_attn_interface.py), and runs PyTorch's flash kernels (the ops
    PyTorch dispatches to on NVIDIA GPUs) on K and V broadcast to the query heads."""
    @staticmethod
    def forward(ctx, q, k, v, scale):
        rep = q.shape[1] // k.shape[1]
        ke, ve = (k.repeat_interleave(rep, 1), v.repeat_interleave(rep, 1)) if rep > 1 else (k, v)
        o, lse, cq, ck, mq, mk, seed, off, _ = torch.ops.aten._scaled_dot_product_flash_attention(q, ke, ve, 0.0, True, False, scale=scale)
        ctx.save_for_backward(q, k, v, o, lse, seed, off)
        ctx.misc = (cq, ck, mq, mk, scale, rep)
        return o

    @staticmethod
    def backward(ctx, do):
        q, k, v, o, lse, seed, off = ctx.saved_tensors
        cq, ck, mq, mk, scale, rep = ctx.misc
        ke, ve = (k.repeat_interleave(rep, 1), v.repeat_interleave(rep, 1)) if rep > 1 else (k, v)
        dq, dk, dv = torch.ops.aten._scaled_dot_product_flash_attention_backward(do, q, ke, ve, o, lse, cq, ck, mq, mk, 0.0, True, seed, off, scale=scale)
        if rep > 1:
            B, H, T, D = dk.shape
            dk = dk.view(B, H // rep, rep, T, D).sum(2)
            dv = dv.view(B, H // rep, rep, T, D).sum(2)
        return dq, dk, dv, None


def flash_attention(module, query, key, value, attention_mask, scaling=None, dropout=0.0, **kw):
    out = FlashGQA.apply(query, key, value, scaling)
    return out.transpose(1, 2).contiguous(), None


AttentionInterface.register("pm_fa", flash_attention)
import transformers.masking_utils as _mu
_mu.find_packed_sequence_indices = lambda position_ids: None  # data-dependent check that cannot run on meta tensors
cfg._attn_implementation = "eager" if ATTN == "eager" else "pm_fa"

with torch.device("meta"):
    model = LlamaForCausalLM(cfg).to(torch.bfloat16)
model.train()
if CKPT:
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
params = {id(p) for p in model.parameters()}
N = sum(p.numel() for p in model.parameters())
N_emb_in = model.model.embed_tokens.weight.numel()

VIEW_LIKE = set()


def is_view(func):
    try:
        return bool(func.is_view)
    except Exception:
        return False


def tensors(x):
    out = []
    def walk(v):
        if isinstance(v, torch.Tensor):
            out.append(v)
        elif isinstance(v, (list, tuple)):
            for u in v:
                walk(u)
        elif isinstance(v, dict):
            for u in v.values():
                walk(u)
    walk(x)
    return out


class Ledger(TorchDispatchMode):
    def __init__(self):
        super().__init__()
        self.phase = "fwd"
        self.rows = {}

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        kwargs = kwargs or {}
        out = func(*args, **kwargs)
        pk = func.overloadpacket
        fl = 0
        if pk in flop_registry:
            fl = flop_registry[pk](*args, **kwargs, out_val=out)
        if is_view(func) or pk in (torch.ops.aten.detach, torch.ops.aten.alias, torch.ops.aten.lift_fresh):
            by = 0
        else:
            by = sum(t.numel() * t.element_size() for t in tensors(args) + tensors(kwargs)) + \
                 sum(t.numel() * t.element_size() for t in tensors(out))
        cat = categorize(func, args, out)
        key = (self.phase, cat, str(pk))
        r = self.rows.setdefault(key, [0, 0, 0])
        r[0] += 1; r[1] += fl; r[2] += by
        return out


h, f, V = cfg.hidden_size, cfg.intermediate_size, cfg.vocab_size
nkv, hd, nh = cfg.num_key_value_heads, cfg.head_dim, cfg.num_attention_heads


def categorize(func, args, out):
    pk = str(func.overloadpacket)
    if pk in ("aten.mm", "aten.addmm", "aten.bmm", "aten.matmul"):
        dims = set()
        for t in tensors(args):
            dims.update(t.shape[-2:])
        if V in dims:
            return "lm_head"
        if f in dims:
            return "mlp"
        if pk == "aten.bmm":
            return "attn_core"
        return "attn_proj"
    if "flash_attention" in pk or "scaled_dot_product" in pk:
        return "attn_core"
    if "embedding" in pk:
        return "embedding"
    if "softmax" in pk and any(t.dim() == 4 for t in tensors(args)):
        return "attn_core"
    if "nll_loss" in pk or "log_softmax" in pk:
        return "loss"
    return "other"


saved = {}
layer_ix = [None]


def pack(t):
    base = t._base if t._base is not None else t
    if id(base) in params or isinstance(base, torch.nn.Parameter):
        return t
    k = id(base)
    if k not in saved:
        where = ""
        for fr in reversed(traceback.extract_stack()[:-1]):
            if "modeling_llama" in fr.filename or "trace_llama" in fr.filename:
                where = fr.name + ": " + (fr.line or "").strip()
                break
        saved[k] = (base, layer_ix[0], base.numel() * base.element_size(), tuple(base.shape), str(base.dtype), where)
    return t


def unpack(t):
    return t


hooks = []
for i, layer in enumerate(model.model.layers):
    hooks.append(layer.register_forward_pre_hook(lambda m, a, i=i: layer_ix.__setitem__(0, i)))
    hooks.append(layer.register_forward_hook(lambda m, a, o: layer_ix.__setitem__(0, "post")))

ids = torch.zeros(1, SEQ, dtype=torch.long, device="meta")
t0 = time.time()
led = Ledger()
with torch.autograd.graph.saved_tensors_hooks(pack, unpack):
    with led:
        layer_ix[0] = "pre"
        out = model(input_ids=ids, labels=ids, use_cache=False)
        loss = out.loss
# who saved what: walk the autograd graph and read each node's _saved_* attributes
users = {}
seen, stack = set(), [loss.grad_fn]
while stack:
    nd = stack.pop()
    if nd is None or nd in seen:
        continue
    seen.add(nd)
    for an in dir(nd):
        if an.startswith("_saved_"):
            try:
                v = getattr(nd, an)
            except Exception:
                continue
            for t in (v if isinstance(v, (list, tuple)) else [v]):
                if isinstance(t, torch.Tensor):
                    base = t._base if t._base is not None else t
                    users.setdefault(id(base), set()).add(nd.name() + "." + an[7:])
    for nx, _ in nd.next_functions:
        stack.append(nx)
led.phase = "bwd"
with led:
    loss.backward()

agg = {}
for (ph, cat, op), (n, fl, by) in led.rows.items():
    a = agg.setdefault(ph, {}).setdefault(cat, {"flops": 0, "bytes": 0, "ops": {}})
    a["flops"] += fl; a["bytes"] += by
    o = a["ops"].setdefault(op, [0, 0, 0]); o[0] += n; o[1] += fl; o[2] += by

per_layer = {}
shapes0 = []
for k, (base, li, nb, shp, dt, where) in saved.items():
    per_layer[str(li)] = per_layer.get(str(li), 0) + nb
    if li == 0:
        shapes0.append([list(shp), dt, nb, where])
shapes0.sort(key=lambda r: -r[2])

res = dict(cfg=cfg_path.split("/")[-1], seq=SEQ, batch=1, attn=ATTN, ckpt=CKPT, layers=cfg.num_hidden_layers, N=N,
           N_emb_in=N_emb_in, torch=torch.__version__, transformers=transformers.__version__,
           flops_fwd=sum(v["flops"] for v in agg["fwd"].values()), flops_bwd=sum(v["flops"] for v in agg["bwd"].values()),
           bytes_fwd=sum(v["bytes"] for v in agg["fwd"].values()), bytes_bwd=sum(v["bytes"] for v in agg["bwd"].values()),
           by_cat=agg, saved_per_layer=per_layer, saved_layer0_tensors=shapes0, secs=round(time.time() - t0, 1))
json.dump(res, open(OUT, "w"), indent=1)
print(OUT, "N", N, "fwd", res["flops_fwd"], "bwd", res["flops_bwd"], "saved L0", per_layer.get("0"), "secs", res["secs"])
