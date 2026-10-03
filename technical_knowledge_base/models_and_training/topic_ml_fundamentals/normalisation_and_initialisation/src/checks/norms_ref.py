"""Checks parts/22_js_normmath.js against torch.nn on the same inputs (written by `node checks/run_norms.mjs`).

Run from src/: node checks/run_norms.mjs && OMP_NUM_THREADS=2 uv run --with torch python checks/norms_ref.py
"""
import json, os
import torch, torch.nn as nn
torch.set_num_threads(2); torch.set_default_dtype(torch.float64)
HERE = os.path.dirname(os.path.abspath(__file__))
J = json.load(open(os.path.join(HERE, 'norms_js.json')))
E = 1e-5
worst = {}
def cmp(name, a, b):
    d = (torch.tensor(a) - b.reshape(-1)).abs().max().item()
    worst[name] = max(worst.get(name, 0), d)
for key, v in J.items():
    if key.startswith('img'):
        x = torch.tensor(v['x']).reshape(4, 6, 2, 2)
        cmp('BatchNorm2d', v['bn'], nn.BatchNorm2d(6, eps=E).train()(x).detach())
        cmp('LayerNorm([C,H,W])', v['ln'], nn.LayerNorm([6, 2, 2], eps=E)(x).detach())
        cmp('InstanceNorm2d', v['in'], nn.InstanceNorm2d(6, eps=E)(x).detach())
        cmp('GroupNorm(3 groups)', v['gn'], nn.GroupNorm(3, 6, eps=E)(x).detach())
        cmp('RMSNorm([C,H,W])', v['rms'], nn.RMSNorm([6, 2, 2], eps=E)(x).detach())
    elif key.startswith('tok'):
        x = torch.tensor(v['x']).reshape(3, 4, 6)
        cmp('BatchNorm1d over (B,T)', v['bn'], nn.BatchNorm1d(6, eps=E).train()(x.transpose(1, 2)).transpose(1, 2).detach())
        cmp('LayerNorm(D)', v['ln'], nn.LayerNorm(6, eps=E)(x).detach())
        cmp('RMSNorm(D)', v['rms'], nn.RMSNorm(6, eps=E)(x).detach())
    elif key.startswith('bn'):
        B = int(key[2:])
        bn = nn.BatchNorm1d(4, eps=E, momentum=0.1).train()
        for xb, yb in zip(v['batches'], v['train_y']):
            cmp('BatchNorm1d train, B=%d' % B, yb, bn(torch.tensor(xb).reshape(B, 4)).detach())
        cmp('running_mean, B=%d' % B, v['run_m'], bn.running_mean)
        cmp('running_var (unbiased), B=%d' % B, v['run_v'], bn.running_var)
        bn.eval()
        cmp('BatchNorm1d eval, B=%d' % B, v['eval_y'], bn(torch.tensor(v['test']).reshape(B, 4)).detach())
        cmp('LayerNorm rows, B=%d' % B, v['ln_y'], nn.LayerNorm(4, eps=E, elementwise_affine=False)(torch.tensor(v['test']).reshape(B, 4)))
for k, d in worst.items():
    print('%-28s max abs diff %.1e' % (k, d))
print('WORST %.1e' % max(worst.values()))
json.dump(worst, open(os.path.join(HERE, 'norms_ref_result.json'), 'w'), indent=1)
