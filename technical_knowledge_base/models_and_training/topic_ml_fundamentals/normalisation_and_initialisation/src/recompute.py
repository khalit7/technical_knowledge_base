"""Recomputes the initialisation numbers the page quotes, and the QK-norm logit ceilings of Qwen3-0.6B.

Run from src/: OMP_NUM_THREADS=2 uv run --with torch --with transformers --with safetensors python recompute.py
Writes recompute_output.json. The page's JS (parts/45_js_init.js) uses the same closed forms as the "formula" values here.
"""
import json, math, os
import torch, torch.nn as nn

torch.set_num_threads(2)
torch.manual_seed(0)
HERE = os.path.dirname(os.path.abspath(__file__))
out = {'torch': torch.__version__}

# 1. Every scheme's variance, from its formula and from torch.nn.init on a 1024 x 1024 tensor (fan_in = fan_out = 1024)
fi = fo = 1024
W = torch.empty(fo, fi)
def emp(f):
    f(W); return W.var().item()
schemes = {
    'xavier_normal': (2 / (fi + fo), lambda w: nn.init.xavier_normal_(w)),
    'xavier_uniform': (2 / (fi + fo), lambda w: nn.init.xavier_uniform_(w)),
    'he_normal_fan_in': (2 / fi, lambda w: nn.init.kaiming_normal_(w, nonlinearity='relu')),
    'he_uniform_fan_in': (2 / fi, lambda w: nn.init.kaiming_uniform_(w, nonlinearity='relu')),
    'lecun_normal': (1 / fi, lambda w: nn.init.kaiming_normal_(w, nonlinearity='linear')),
    'pytorch_linear_default': (1 / (3 * fi), lambda w: nn.init.kaiming_uniform_(w, a=math.sqrt(5))),
    'normal_0.02': (0.02 ** 2, lambda w: nn.init.normal_(w, 0, 0.02)),
}
out['schemes'] = {k: dict(formula=v, empirical=emp(f)) for k, (v, f) in schemes.items()}
for k, d in out['schemes'].items():
    print('%-24s formula %.4e  torch %.4e' % (k, d['formula'], d['empirical']))
# nn.Linear itself uses the default
lin = nn.Linear(fi, fo)
out['nn_linear_weight_var'] = lin.weight.var().item()
print('nn.Linear(1024,1024).weight.var() %.4e (1/(3*1024) = %.4e)' % (out['nn_linear_weight_var'], 1 / 3072))

# 2. A deep ReLU MLP with each init, no normalisation: mean square of the activation after each layer (width 512, 20 layers)
def deep(init, L=20, d=512, act='relu', bias=False):
    torch.manual_seed(1)
    x = torch.randn(1024, d)
    ms = [x.pow(2).mean().item()]
    for _ in range(L):
        lin = nn.Linear(d, d, bias=bias)
        if init == 'he': nn.init.kaiming_normal_(lin.weight, nonlinearity='relu')
        elif init == 'xavier': nn.init.xavier_normal_(lin.weight)
        elif init == 'lecun': nn.init.normal_(lin.weight, 0, 1 / math.sqrt(d))
        elif init == 'n002': nn.init.normal_(lin.weight, 0, 0.02)
        # 'default' leaves PyTorch's own init
        with torch.no_grad():
            x = lin(x)
            x = torch.relu(x) if act == 'relu' else (torch.tanh(x) if act == 'tanh' else x)
        ms.append(x.pow(2).mean().item())
    return ms
prop = {}
for init in ['he', 'xavier', 'lecun', 'default', 'n002']:
    m = deep(init)
    prop[init] = dict(ms=m, per_layer=(m[-1] / m[1]) ** (1 / 19))
    print('ReLU, %-8s per-layer second-moment factor %.4f  after 20 layers %.3e' % (init, prop[init]['per_layer'], m[-1]))
out['relu_mlp'] = prop
# theory: factor per layer = fan_in * Var(w) * 1/2 for ReLU
out['relu_theory'] = {'he': 1.0, 'xavier': 512 * (2 / 1024) / 2, 'lecun': 0.5, 'default': 1 / 6, 'n002': 512 * 0.0004 / 2}

# 3. GPT-2's residual scaling, as Hugging Face implements it: c_proj std = 0.02 / sqrt(2 * n_layer)
from transformers import GPT2Config, GPT2LMHeadModel
torch.manual_seed(0)
g = GPT2LMHeadModel(GPT2Config(n_layer=12, n_embd=768, n_head=12))
out['gpt2_init'] = dict(c_attn=g.transformer.h[0].attn.c_attn.weight.std().item(),
                        attn_c_proj=g.transformer.h[0].attn.c_proj.weight.std().item(),
                        mlp_c_proj=g.transformer.h[0].mlp.c_proj.weight.std().item(),
                        formula=0.02 / math.sqrt(24))
print('GPT-2 (HF) init std: c_attn %.5f, c_proj %.5f / %.5f, 0.02/sqrt(2*12) = %.5f' % (
    out['gpt2_init']['c_attn'], out['gpt2_init']['attn_c_proj'], out['gpt2_init']['mlp_c_proj'], out['gpt2_init']['formula']))

# 4. QK-norm ceilings in Qwen3-0.6B: after RMSNorm with gain g, |q| <= sqrt(d_h) * max|g| (RoPE preserves the norm),
# so a logit q.k / sqrt(d_h) <= sqrt(d_h) * max|g_q| * max|g_k|.
from huggingface_hub import snapshot_download
from safetensors import safe_open
p = snapshot_download('Qwen/Qwen3-0.6B', allow_patterns=['*.safetensors', 'config.json'])
cfg = json.load(open(os.path.join(p, 'config.json')))
dh = cfg['head_dim']
fs = [os.path.join(p, f) for f in os.listdir(p) if f.endswith('.safetensors')]
gq, gk = {}, {}
for f in fs:
    with safe_open(f, 'pt') as h:
        for k in h.keys():
            if k.endswith('q_norm.weight'): gq[int(k.split('.')[2])] = h.get_tensor(k).float()
            if k.endswith('k_norm.weight'): gk[int(k.split('.')[2])] = h.get_tensor(k).float()
real = json.load(open(os.path.join(HERE, 'real', 'real_streams.json')))
meas = [L['logit_max'] for L in real['Qwen/Qwen3-0.6B']['layers']]
ceil = []
for l in range(cfg['num_hidden_layers']):
    c = math.sqrt(dh) * gq[l].abs().max().item() * gk[l].abs().max().item()
    ceil.append(dict(layer=l + 1, ceiling=c, measured=meas[l], gq_max=gq[l].abs().max().item(), gk_max=gk[l].abs().max().item()))
out['qwen3_qk'] = dict(head_dim=dh, layers=ceil)
print('Qwen3-0.6B QK-norm ceilings (first 5):', [(round(c['ceiling'], 1), round(c['measured'], 1)) for c in ceil[:5]])
print('  max ceiling %.1f, max measured %.1f' % (max(c['ceiling'] for c in ceil), max(c['measured'] for c in ceil)))
json.dump(out, open(os.path.join(HERE, 'recompute_output.json'), 'w'), indent=1)
