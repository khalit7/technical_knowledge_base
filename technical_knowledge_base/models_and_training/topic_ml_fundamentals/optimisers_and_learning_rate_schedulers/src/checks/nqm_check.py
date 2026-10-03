"""Monte Carlo check of the noisy-quadratic recursions in parts/32_js_nqm.js: 4,000 seeded runs (one per row of a
(4000, 10) parameter) with torch.optim.SGD under the same LR multiplier, and with schedulefree.SGDScheduleFree
(momentum 0.9, evaluated at x after optimizer.eval()). Prints the exact expected loss (from node) against the sample mean
and its standard error at a few steps. Run: OMP_NUM_THREADS=2 uv run --with torch --with numpy --with schedulefree python checks/nqm_check.py"""
import json, math, os, subprocess, torch, schedulefree
torch.set_num_threads(2); torch.set_default_dtype(torch.float64); torch.manual_seed(0)
here = os.path.dirname(os.path.abspath(__file__))
D = 10; H = torch.tensor([10 ** (-2 * i / (D - 1)) for i in range(D)]); SIG = 0.3; N = 4000
def mult(kind, t, T):
    if kind == 'cosine': return 0.5 * (1 + math.cos(math.pi * t / T))
    if kind == 'wsd':
        Dd = round(0.2 * T); s = T - Dd
        return 1.0 if t < s else 1 - math.sqrt((t - s) / Dd)
    return 1.0
def mc(kind, T, lr):
    x = torch.ones(N, D, requires_grad=True)
    if kind == 'sf': o = schedulefree.SGDScheduleFree([x], lr=lr, momentum=0.9); o.train()
    else: o = torch.optim.SGD([x], lr=lr)
    out = {}
    for t in range(T):
        if kind != 'sf':
            for g in o.param_groups: g['lr'] = lr * mult(kind, t, T)
        x.grad = H * x.detach() + SIG * H.sqrt() * torch.randn(N, D)
        o.step()
        if (t + 1) in (10, T // 4, T // 2, T):
            if kind == 'sf': o.eval()
            l = 0.5 * (H * x.detach() ** 2).sum(1)
            out[t + 1] = (l.mean().item(), (l.std() / math.sqrt(N)).item())
            if kind == 'sf': o.train()
    return out
js = r"""const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('%s','utf8'),c);
const N=c.NQM;const o={};for(const [k,T,lr] of %s){const L=k==='sf'?N.sf(T,lr):N.sgd(k,T,lr);o[k+T]=[...L]}console.log(JSON.stringify(o))"""
cases = [('cosine', 400, 0.5), ('wsd', 400, 0.3), ('const', 400, 0.1), ('sf', 400, 0.4)]
ex = json.loads(subprocess.check_output(['node', '-e', js % (os.path.join(here, '../parts/32_js_nqm.js'), json.dumps(cases))]))
worst = 0
for k, T, lr in cases:
    m = mc(k, T, lr)
    for t, (mean, se) in m.items():
        e = ex[k + str(T)][t]; z = (mean - e) / se; worst = max(worst, abs(z))
        print(f'{k:6s} lr {lr} step {t:4d}: exact {e:.5f}  sampled {mean:.5f} +/- {se:.5f}  z {z:+.2f}')
print('largest |z|', round(worst, 2))
