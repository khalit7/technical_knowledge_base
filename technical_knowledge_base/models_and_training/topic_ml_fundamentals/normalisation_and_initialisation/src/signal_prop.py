"""Signal propagation additions for the Reading tab's hero and section 2 (run from src/, seconds on CPU):
OMP_NUM_THREADS=2 uv run --with torch python signal_prop.py  ->  signal_output.json
1. The same 20-layer, width-512 ReLU MLP as recompute.py (same seed, same input), with orthogonal init (gain sqrt 2),
   and with PyTorch's default init plus a LayerNorm before every ReLU: mean square after each layer.
2. Singular values of the input-output map of a 20-layer *linear* network of width 512 at init:
   Gaussian with Var 1/n (LeCun) against orthogonal (gain 1). Both preserve the mean square on average; only orthogonal
   preserves every direction.
"""
import json, math, torch
from torch import nn

def deep(init, L=20, d=512, norm=False):
    torch.manual_seed(1)
    x = torch.randn(1024, d)
    ms = [x.pow(2).mean().item()]
    for _ in range(L):
        lin = nn.Linear(d, d, bias=False)
        if init == 'orth': nn.init.orthogonal_(lin.weight, gain=math.sqrt(2))
        with torch.no_grad():
            x = lin(x)
            if norm: x = nn.functional.layer_norm(x, (d,))
            x = torch.relu(x)
        ms.append(x.pow(2).mean().item())
    return ms

out = {'torch': torch.__version__}
for k, (init, norm) in {'orth': ('orth', False), 'default_ln': ('default', True)}.items():
    m = deep(init, norm=norm)
    out[k] = dict(ms=m, per_layer=(m[-1] / m[1]) ** (1 / 19))
    print('%-11s per-layer %.4f  after 20 layers %.4e' % (k, out[k]['per_layer'], m[-1]))

def svals(init, L=20, d=512):
    torch.manual_seed(2)
    P = torch.eye(d, dtype=torch.float64)
    for _ in range(L):
        W = torch.empty(d, d, dtype=torch.float64)
        if init == 'orth': nn.init.orthogonal_(W)
        else: nn.init.normal_(W, 0, 1 / math.sqrt(d))
        P = W @ P
    s = torch.linalg.svdvals(P)
    return dict(max=s.max().item(), min=s.min().item(), median=s.median().item(), cond=(s.max() / s.min()).item(),
                mean_sq=(s.pow(2).mean()).item())
for init in ['gauss', 'orth']:
    out['sv_' + init] = svals(init)
    print(init, {k: '%.3e' % v for k, v in out['sv_' + init].items()})
json.dump(out, open('signal_output.json', 'w'), indent=1)
