"""Measure MFU on a real GPU: one training step (forward + backward) of two Llama 3.1 8B decoder layers on the
Apple M1 Pro GPU (PyTorch MPS backend, float16), and predict the same step bottom-up from its operators.

Measured: wall-clock time of forward + backward, median of ITERS iterations after warm-up, synchronised.
Predicted: every aten operator the step dispatches is recorded (FLOPs from PyTorch's flop registry, bytes read plus
written from tensor sizes), and each is given time max(FLOPs / peak, bytes / bandwidth) with the M1 Pro's measured
peak and bandwidth; the sum is the roofline prediction for unfused eager execution.
The 128,256-token embedding and output head are left out (they would need about 8 GB on a shared laptop): two
decoder layers with the real 8B shapes, 436 million parameters. No optimizer step.

usage: python m1_step.py <cfg.json> <out.json> [seqs comma-separated] [iters]
"""
import json, sys, time, statistics, platform, subprocess
import torch
from torch.utils._python_dispatch import TorchDispatchMode
from torch.utils.flop_counter import flop_registry
import transformers
from transformers import LlamaConfig
from transformers.models.llama.modeling_llama import LlamaDecoderLayer, LlamaRotaryEmbedding

cfg_path, OUT = sys.argv[1], sys.argv[2]
SEQS = [int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "512,1024,2048").split(",")]
ITERS = int(sys.argv[4]) if len(sys.argv) > 4 else 8
c = json.load(open(cfg_path))
for k in ("unsloth_fixed", "_name_or_path", "transformers_version", "architectures", "torch_dtype"):
    c.pop(k, None)
cfg = LlamaConfig(**c)
cfg._attn_implementation = "sdpa"
dev, dt = torch.device("mps"), torch.float16
torch.manual_seed(0)
layers = torch.nn.ModuleList([LlamaDecoderLayer(cfg, i) for i in range(2)]).to(dev, dt)
for p in layers.parameters():
    torch.nn.init.normal_(p, std=0.02) if p.dim() > 1 else torch.nn.init.ones_(p)
rope = LlamaRotaryEmbedding(cfg).to(dev)
N = sum(p.numel() for p in layers.parameters())


def step(x, pos, pe):
    h = x
    for l in layers:
        h = l(h, attention_mask=None, position_ids=pos, position_embeddings=pe)
        h = h[0] if isinstance(h, tuple) else h
    h.float().square().mean().backward()


def tens(v):
    out = []
    def w(u):
        if isinstance(u, torch.Tensor): out.append(u)
        elif isinstance(u, (list, tuple)): [w(z) for z in u]
        elif isinstance(u, dict): [w(z) for z in u.values()]
    w(v)
    return out


class Ledger(TorchDispatchMode):
    def __init__(self):
        super().__init__(); self.ops = []
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        kwargs = kwargs or {}
        out = func(*args, **kwargs)
        pk = func.overloadpacket
        fl = flop_registry[pk](*args, **kwargs, out_val=out) if pk in flop_registry else 0
        if pk is torch.ops.aten.linear:  # MPS runs nn.Linear as one native op: 2 M K N
            w = args[1]; fl = 2 * (args[0].numel() // w.shape[1]) * w.shape[1] * w.shape[0]
        elif pk is torch.ops.aten.linear_backward:  # (input, grad_output, weight, mask): grad_input and grad_weight, 2 M K N each
            w = args[2]; m = args[0].numel() // w.shape[1]; mask = args[3]
            fl = 2 * m * w.shape[1] * w.shape[0] * (int(bool(mask[0])) + int(bool(mask[1])))
        view = False
        try: view = bool(func.is_view)
        except Exception: pass
        by = 0 if view or pk in (torch.ops.aten.detach, torch.ops.aten.alias) else \
            sum(t.numel() * t.element_size() for t in tens(args) + tens(kwargs) + tens(out))
        self.ops.append((str(pk), fl, by))
        return out


res = dict(device="Apple M1 Pro GPU (16-core), PyTorch MPS", torch=torch.__version__, transformers=transformers.__version__,
           macos=platform.mac_ver()[0], dtype="float16", params=N, layers=2, cases=[])
for T in SEQS:
    x = torch.randn(1, T, cfg.hidden_size, device=dev, dtype=dt, requires_grad=True)
    pos = torch.arange(T, device=dev)[None]
    pe = rope(x, pos)
    for _ in range(3):
        step(x, pos, pe); layers.zero_grad(set_to_none=True); x.grad = None
    torch.mps.synchronize()
    ts = []
    for _ in range(ITERS):
        t0 = time.perf_counter(); step(x, pos, pe); torch.mps.synchronize(); ts.append(time.perf_counter() - t0)
        layers.zero_grad(set_to_none=True); x.grad = None
    led = Ledger()
    with led:
        step(x, pos, pe)
    torch.mps.synchronize()
    layers.zero_grad(set_to_none=True); x.grad = None
    agg = {}
    for op, fl, by in led.ops:
        a = agg.setdefault(op, [0, 0, 0]); a[0] += 1; a[1] += fl; a[2] += by
    try:
        load = subprocess.run(["sysctl", "-n", "vm.loadavg"], capture_output=True, text=True).stdout.strip()
    except Exception:
        load = ""
    res["cases"].append(dict(seq=T, times_s=ts, median_s=statistics.median(ts), min_s=min(ts), max_s=max(ts),
                             flops=sum(o[1] for o in led.ops), bytes=sum(o[2] for o in led.ops), n_ops=len(led.ops),
                             ops=agg, calls=[[o[0], o[1], o[2]] for o in led.ops if o[1] or o[2]], loadavg=load))
    print(T, "median", round(statistics.median(ts), 4), "TFLOP/s", round(res["cases"][-1]["flops"] / statistics.median(ts) / 1e12, 3), load, flush=True)
json.dump(res, open(OUT, "w"), indent=1)
