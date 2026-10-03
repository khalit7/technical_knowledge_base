"""Replay the toy's training in PyTorch (float64, autograd, torch.optim.Adam with betas 0.9/0.95, eps 1e-8) from the JS
engine's own initial weights and batches, and compare per-step losses, final weights and a 1-sqrt merge.
usage: node check_engine.mjs && uv run --with torch python check_engine.py  ->  model/check_engine.json"""
import json, torch
torch.set_num_threads(2); torch.set_default_dtype(torch.float64)
C = json.load(open('model/engine_case.json')); D, H, K = C['D'], C['H'], C['K']
p = torch.tensor(C['p0'], requires_grad=True)
def net(p, x):
    W1 = p[:H * D].view(H, D); b1 = p[H * D:H * D + H]; W2 = p[H * D + H:H * D + H + K * H].view(K, H); b2 = p[H * D + H + K * H:]
    return torch.tanh(x @ W1.T + b1) @ W2.T + b2
opt = torch.optim.Adam([p], lr=1.0, betas=(0.9, 0.95), eps=1e-8)
losses, cks = [], []
for s, b in enumerate(C['batches']):
    for gr in opt.param_groups: gr['lr'] = C['lrs'][s]
    x = torch.tensor(b['xs']); y = torch.tensor(b['ys'])
    L = torch.nn.functional.cross_entropy(net(p, x), y)
    opt.zero_grad(); L.backward(); opt.step(); losses.append(L.item())
    if (s + 1) % 20 == 0: cks.append(p.detach().clone())
merged = sum(c * w for c, w in zip(C['mergeC'], cks))
res = {'steps': len(losses), 'max_loss_diff': max(abs(a - b) for a, b in zip(losses, C['losses'])),
       'max_weight_diff': (p.detach() - torch.tensor(C['pN'])).abs().max().item(),
       'max_merged_diff': (merged - torch.tensor(C['merged'])).abs().max().item(),
       'weight_scale': p.detach().abs().max().item()}
res['pass'] = res['max_loss_diff'] < 1e-9 and res['max_weight_diff'] < 1e-9 and res['max_merged_diff'] < 1e-9
json.dump(res, open('model/check_engine.json', 'w'), indent=1); print(res)
