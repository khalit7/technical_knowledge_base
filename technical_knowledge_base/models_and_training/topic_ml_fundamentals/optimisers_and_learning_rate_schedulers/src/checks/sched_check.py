"""Compare the schedule sparklines (parts/43_js_sched.js) with torch.optim.lr_scheduler where PyTorch has the schedule.
Run: OMP_NUM_THREADS=2 uv run --with torch --with numpy python checks/sched_check.py"""
import json, os, subprocess, torch
here = os.path.dirname(os.path.abspath(__file__))
js = "const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('%s','utf8'),c);const o={};for(const k in c.SCHED_SHAPES){o[k]=[];for(let t=0;t<100;t++)o[k].push(c.SCHED_SHAPES[k](t))}console.log(JSON.stringify(o))" % os.path.join(here, '../parts/43_js_sched.js')
J = json.loads(subprocess.check_output(['node', '-e', js]))
S = torch.optim.lr_scheduler
def lrs(make, lr=1.0):
    p = torch.zeros(1, requires_grad=True); o = torch.optim.SGD([p], lr=lr); s = make(o); out = []
    for _ in range(100):
        out.append(o.param_groups[0]['lr']); o.step(); s.step()
    return out
ref = {'step': lrs(lambda o: S.MultiStepLR(o, [50, 75], 0.1)), 'exp': lrs(lambda o: S.ExponentialLR(o, 0.97)),
       'linear': lrs(lambda o: S.LinearLR(o, 1.0, 0.0, 100)), 'cosine': lrs(lambda o: S.CosineAnnealingLR(o, 100)),
       'sgdr': lrs(lambda o: S.CosineAnnealingWarmRestarts(o, 25)), 'onecycle': lrs(lambda o: S.OneCycleLR(o, max_lr=1.0, total_steps=100))}
for k, v in ref.items():
    print(f'{k:9s} max |JS - torch| = {max(abs(a - b) for a, b in zip(v, J[k])):.2e}')
