"""Check the weight-decay animation (parts/26_js_wd_sim.js) against torch.optim.Adam (L2 via weight_decay) and AdamW.
Runs the page's JS in Node for its frames, replays the same seeded noise through PyTorch in float64, writes check/wd.json.
Run from this folder: uv run --with torch --with numpy python check_wd.py"""
import json, math, subprocess
import torch

js = subprocess.run(["node", "-e", "global.window=global;eval(require('fs').readFileSync('parts/26_js_wd_sim.js','utf8'));"
                     "process.stdout.write(JSON.stringify(RGW.sim(true)))"], capture_output=True, text=True, check=True).stdout
J = json.loads(js)

def mulberry32(seed):
    a = seed & 0xffffffff
    def r():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xffffffff; t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xffffffff
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return r

r = mulberry32(77); SIG = J["sig"]
noise = []
for t in range(J["N"]):
    row = []
    for s in SIG:
        u1, u2 = 1 - r(), r(); row.append(math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2) * s)
    noise.append(row)
dn = max(abs(a - b) for ra, rb in zip(noise, J["noise"]) for a, b in zip(ra, rb))

def run(opt_cls):
    w = torch.ones(len(SIG), dtype=torch.float64, requires_grad=True)
    opt = opt_cls([w], lr=J["lr"], betas=(0.9, 0.999), eps=1e-8, weight_decay=J["lam"])
    frames = [w.detach().clone().tolist()]
    for t in range(J["N"]):
        w.grad = torch.tensor(noise[t], dtype=torch.float64); opt.step()
        if (t + 1) % 100 == 0: frames.append(w.detach().clone().tolist())
    return frames

out = {"noise_max_abs_diff": dn}
for k, cls in (("l2", torch.optim.Adam), ("adamw", torch.optim.AdamW)):
    T = run(cls)
    out[k + "_max_abs_diff"] = max(abs(a - b) for fa, fb in zip(T, J["frames"][k]) for a, b in zip(fa, fb))
    out[k + "_final_torch"] = [round(v, 4) for v in T[-1]]
out["torch"] = torch.__version__
ok = all(out[k] < 1e-8 for k in ("noise_max_abs_diff", "l2_max_abs_diff", "adamw_max_abs_diff"))
out["pass"] = ok
json.dump(out, open("check/wd.json", "w"), indent=1)
print(json.dumps(out)); raise SystemExit(0 if ok else 1)
