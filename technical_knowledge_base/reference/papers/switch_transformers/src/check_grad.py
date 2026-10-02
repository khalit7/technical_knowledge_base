"""Check the JS Switch layer (parts/20_js_switch_core.js) against an independent PyTorch implementation.
For each case dumped by dump_case.cjs: recompute the forward pass (router softmax, top-1 or top-2, capacity
by cumulative sum in batch order, drops through the residual, gate-scaled expert output, Eq. 4 loss) in
float64 with autograd, then compare the loss, the drop counts and every gradient with the JS values.
usage: node dump_case.cjs && uv run --with torch python check_grad.py   (writes model/check_grad.json)"""
import json, math, torch
torch.set_num_threads(2)
cases = json.load(open('model/grad_cases.json'))
out = []
for c in cases:
    cfg = c['cfg']; d, h, N, T, k = cfg['d'], cfg['h'], cfg['N'], cfg['T'], cfg['k']
    Wr = torch.tensor(c['P']['Wr'], dtype=torch.float64).view(d, N).requires_grad_()
    W1 = torch.tensor(c['P']['W1'], dtype=torch.float64).view(N, h, d).requires_grad_()
    W2 = torch.tensor(c['P']['W2'], dtype=torch.float64).view(N, d, h).requires_grad_()
    X = torch.tensor(c['X'], dtype=torch.float64).view(T, d); Y = torch.tensor(c['Y'], dtype=torch.float64).view(T, d)
    xr = X * torch.tensor(c['jit'], dtype=torch.float64).view(T, d) if c['jit'] else X
    p = torch.softmax(xr @ Wr, dim=-1)                      # [T, N]
    C = math.ceil(T / N * cfg['cf'] * k - 1e-9)
    top = torch.topk(p, k, dim=-1).indices                  # [T, k]: first and second choice
    first = torch.nn.functional.one_hot(top[:, 0], N).double()
    # capacity: first choices in batch order, then second choices (GShard priority), Code Block 15's cumsum
    pos1 = torch.cumsum(first, 0) * first
    keep1 = first * (pos1 <= C)
    masks = [keep1]
    if k == 2:
        sec = torch.nn.functional.one_hot(top[:, 1], N).double()
        used = keep1.sum(0)
        pos2 = (torch.cumsum(sec, 0) + used) * sec
        masks.append(sec * (pos2 <= C))
    a = torch.relu(torch.einsum('nhd,td->tnh', W1, X)); E = torch.einsum('ndh,tnh->tnd', W2, a)   # every expert on every token
    y = X.clone()
    for m in masks:
        y = y + torch.einsum('tn,tnd->td', m * p, E)
    mse = ((y - Y) ** 2).mean()
    f = first.mean(0); P = p.mean(0)
    aux = cfg['alpha'] * N * (f * P).sum()
    loss = mse + aux; loss.backward()
    js = c['js']
    def md(t, v): return float((t.detach().reshape(-1) - torch.tensor(v, dtype=torch.float64).reshape(-1)).abs().max())
    def mx(t): return float(t.detach().abs().max())
    r = {'cfg': {kk: cfg[kk] for kk in ('k', 'cf', 'alpha', 'jitter', 'N', 'T')},
         'loss_torch': float(loss), 'loss_js': js['loss'], 'loss_diff': abs(float(loss) - js['loss']),
         'dropped_torch': int(T - keep1.sum()), 'dropped_js': js['dropped'], 'C': C, 'C_js': js['C'],
         'grad_max_abs_diff': {'Wr': md(Wr.grad, js['G']['Wr']), 'W1': md(W1.grad, js['G']['W1']), 'W2': md(W2.grad, js['G']['W2'])},
         'grad_max_abs': {'Wr': mx(Wr.grad), 'W1': mx(W1.grad), 'W2': mx(W2.grad)}}
    if k == 2: r['dropped2_torch'] = int(T - masks[1].sum()); r['dropped2_js'] = js['dropped2']
    out.append(r); print(json.dumps(r))
ok = all(r['loss_diff'] < 1e-12 and r['dropped_torch'] == r['dropped_js'] and r['C'] == r['C_js'] and max(r['grad_max_abs_diff'].values()) < 1e-12 for r in out)
json.dump({'pass': ok, 'cases': out, 'torch': torch.__version__}, open('model/check_grad.json', 'w'), indent=1)
print('PASS' if ok else 'FAIL')
