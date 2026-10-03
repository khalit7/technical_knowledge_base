"""Re-run every JS trajectory (checks/js_traj.json, from dump_js.mjs) with the reference implementations and report the
largest difference. References: torch.optim (SGD, Adagrad, RMSprop, Adam, AdamW, Muon), lion-pytorch (Lion), soap.py from
github.com/nikhilvyas/SOAP (SOAP, precondition_1d=True), schedulefree (SGDScheduleFree, AdamWScheduleFree), and an
implementation of Shampoo's order-1 rule (full-matrix AdaGrad) written here from Gupta et al. 2018.
Run: OMP_NUM_THREADS=2 uv run --with torch --with numpy --with lion-pytorch --with schedulefree python checks/torch_ref.py"""
import json, math, os, sys, torch
torch.set_num_threads(2); torch.set_default_dtype(torch.float64)
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
from soap_ref import SOAP
from lion_pytorch import Lion
import schedulefree
import torch.optim._muon as M
D = json.load(open(os.path.join(here, 'js_traj.json')))
K = 100.0; CX = 1.0; CY = 0.6; R2 = math.sqrt(0.5)
def f(sk, p):
    x, y = p[0], p[1]
    if sk in ('ravine', 'noisy'): return 0.5 * ((x - CX) ** 2 + K * (y - CY) ** 2)
    if sk == 'rotated':
        u = R2 * ((x - CX) + (y - CY)); v = R2 * ((y - CY) - (x - CX)); return 0.5 * (u * u + K * v * v)
    if sk == 'rosen': return (1 - x) ** 2 + 100 * (y - x * x) ** 2
    if sk == 'saddle': return 0.5 * x * x + 0.25 * y ** 4 - 0.5 * y * y + 0.25
# Muon's Newton-Schulz exactly as torch writes it, but in float64 instead of bfloat16 (the JS runs float64)
orig_ns = M._zeropower_via_newtonschulz
def ns64(grad, ns_coefficients, ns_steps, eps):
    a, b, c = ns_coefficients
    X = grad.clone()
    if grad.size(0) > grad.size(1): X = X.T
    X = X / X.norm().clamp(min=eps)
    for _ in range(ns_steps):
        A = X @ X.T; B = torch.addmm(A, A, A, beta=b, alpha=c); X = torch.addmm(X, B, X, beta=a)
    if grad.size(0) > grad.size(1): X = X.T
    return X
class Shampoo1:
    """Order-1 Shampoo = full-matrix AdaGrad: H = eps I + sum g g^T, x -= lr H^(-1/2) g."""
    def __init__(self, p, lr): self.p = p; self.param_groups = [{'lr': lr}]; self.H = 1e-4 * torch.eye(2)
    def step(self):
        g = self.p.grad.detach(); self.H += torch.outer(g, g)
        w, V = torch.linalg.eigh(self.H); Mi = V @ torch.diag(w ** -0.5) @ V.T
        with torch.no_grad(): self.p -= self.param_groups[0]['lr'] * (Mi @ g)
def make(ok, p, lr):
    if ok == 'gd': return torch.optim.SGD([p], lr=lr)
    if ok == 'mom': return torch.optim.SGD([p], lr=lr, momentum=0.9)
    if ok == 'nes': return torch.optim.SGD([p], lr=lr, momentum=0.9, nesterov=True)
    if ok == 'adagrad': return torch.optim.Adagrad([p], lr=lr)
    if ok == 'rmsprop': return torch.optim.RMSprop([p], lr=lr)
    if ok == 'adam': return torch.optim.Adam([p], lr=lr)
    if ok == 'adamw': return torch.optim.AdamW([p], lr=lr, weight_decay=0.1)
    if ok == 'lion': return Lion([p], lr=lr, betas=(0.9, 0.99), weight_decay=0.0)
    if ok == 'soap': return SOAP([p], lr=lr, betas=(0.95, 0.95), weight_decay=0.0, precondition_frequency=10, precondition_1d=True)
    if ok == 'muon': return torch.optim.Muon([p], lr=lr, weight_decay=0.0, momentum=0.95, nesterov=True)
    if ok == 'sfsgd': o = schedulefree.SGDScheduleFree([p], lr=lr, momentum=0.9); o.train(); return o
    if ok == 'sfadamw': o = schedulefree.AdamWScheduleFree([p], lr=lr, betas=(0.9, 0.999)); o.train(); return o
    if ok == 'shampoo': return Shampoo1(p, lr)
def sched(kind, t, T):
    if kind == 'cosine': return 0.5 * (1 + math.cos(math.pi * t / T))
    if kind == 'wsd':
        Dd = round(0.2 * T); s = T - Dd
        return 1.0 if t < s else 1 - math.sqrt((t - s) / Dd)
    return 1.0
def run(r, bf16=False, nudge=0.0):
    sk, ok, lr, T, kind = r['sk'], r['ok'], r['lr'], r['T'], r['sch']
    start = [D['surf'][sk]['start'][0] + nudge, D['surf'][sk]['start'][1]]; sig = D['surf'][sk]['noise']; nz = D['noise']
    shape = (1, 2) if ok == 'muon' else (2,)
    p = torch.tensor(start, dtype=torch.float64).reshape(shape).clone().requires_grad_(True)
    M._zeropower_via_newtonschulz = orig_ns if bf16 else ns64
    o = make(ok, p, lr)
    xs = [D['surf'][sk]['start'][0]]; ys = [start[1]]
    for t in range(T):
        if hasattr(o, 'param_groups'):
            for gr in o.param_groups: gr['lr'] = lr * sched(kind, t, T)
        p.grad = None
        loss = f(sk, p.reshape(2)); loss.backward()
        if sig: p.grad += sig * torch.tensor([nz[2 * t], nz[2 * t + 1]]).reshape(shape)
        o.step()
        q = p.detach().reshape(2).clone()
        if ok in ('sfsgd', 'sfadamw'):
            o.eval(); q = p.detach().reshape(2).clone(); o.train()
        xs.append(q[0].item()); ys.append(q[1].item())
    return xs, ys
worst = {}; rows = []
for r in D['runs']:
    xs, ys = run(r)
    d = 0.0; n = 0
    for a, b, c, e in zip(xs, ys, r['xs'], r['ys']):
        if c is None or (isinstance(c, float) and math.isnan(c)): break
        scale = max(1.0, abs(a), abs(b)); d = max(d, abs(a - c) / scale, abs(b - e) / scale); n += 1
    rows.append((r['sk'], r['ok'], r['sch'], r['tag'], r['lr'], n, d)); worst[r['ok']] = max(worst.get(r['ok'], 0), d)
# Where JS and the reference part by more than 1e-9, measure how far the reference parts from itself when its start is nudged
# by 1e-12: if that is as large, the run is chaotic (rounding differences grow) and the difference is not a formula error.
chaos = []
for r, row in zip(D['runs'], rows):
    if row[-1] <= 1e-9: continue
    a = run(r); b = run(r, nudge=1e-12)
    dd = max(max(abs(p - q) for p, q in zip(a[0], b[0])), max(abs(p - q) for p, q in zip(a[1], b[1])))
    agree = next((i for i, (p, q) in enumerate(zip(a[0], r['xs'])) if abs(p - q) > 1e-9), len(a[0]))
    chaos.append(row + (agree, dd)); print('chaotic check', row, 'steps agreeing to 1e-9:', agree, 'reference vs itself nudged 1e-12:', f'{dd:.1e}')
for k, v in worst.items(): print(f'{k:8s} max relative difference over all surfaces and schedules {v:.2e}')
# Muon with torch's own bfloat16 Newton-Schulz, for the record
bf = 0.0
for r in D['runs']:
    if r['ok'] != 'muon': continue
    xs, ys = run(r, bf16=True)
    bf = max(bf, max(abs(a - c) for a, c in zip(xs, r['xs'])))
print(f'muon with torch default bfloat16 Newton-Schulz: max abs difference {bf:.2e}')
json.dump({'worst': worst, 'muon_bf16': bf, 'rows': rows, 'chaos': chaos}, open(os.path.join(here, 'torch_ref_result.json'), 'w'), indent=1)
