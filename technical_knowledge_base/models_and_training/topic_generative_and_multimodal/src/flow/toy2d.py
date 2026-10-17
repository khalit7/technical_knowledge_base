"""Flow lab, 2-D toy (CPU, seconds): noise N(0, I) in the plane -> a ring of 8 Gaussians.

Trains four tiny MLP velocity / noise fields that the page then runs live in the browser (weights embedded, int8):
  cfm    flow matching with independent pairs (noise and data drawn separately): straight conditional paths, curved marginal ones
  reflow the 2-rectified flow: retrained on (z, ODE(z)) pairs made by cfm, so the pairing no longer crosses
  ot     flow matching with minibatch optimal-transport pairs (Tong et al. 2023): straighter without a second stage
  ddpm   a noise-predicting diffusion model (linear betas 1e-4..0.02, T = 1000, as in the Diffusion lab), sampled by DDIM
Then scores every model x solver x steps with the DEQUANTISED weights (exactly what the browser runs):
  on-mode share, W2 distance to target samples, error against a 512-step reference, and straightness.
Writes out/toy2d.json.  Run: nice -n 15 $GM_SCRATCH/venv/bin/python -I toy2d.py
"""
import json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
import numpy as np
import torch
import torch.nn as nn
from scipy.optimize import linear_sum_assignment

torch.set_num_threads(4)
R, SD, K = 3.0, 0.25, 8          # ring radius, mode std, number of modes
CEN = torch.tensor([[R * math.cos(2 * math.pi * k / K), R * math.sin(2 * math.pi * k / K)] for k in range(K)])
H = 48                            # hidden width (48 keeps the embedded int8 weights near 7 KB per model)
STEPS, BS, LR = 12000, 512, 2e-3


def data(n, g):
    k = torch.randint(0, K, (n,), generator=g)
    return CEN[k] + SD * torch.randn(n, 2, generator=g)


class MLP(nn.Module):
    """(x, y, t) -> 2 numbers; three linear layers with SiLU between."""
    def __init__(self):
        super().__init__()
        self.l = nn.ModuleList([nn.Linear(3, H), nn.Linear(H, H), nn.Linear(H, H), nn.Linear(H, 2)])

    def forward(self, x, t):
        h = torch.cat([x, t.view(-1, 1)], 1)
        for i, l in enumerate(self.l):
            h = l(h)
            if i < len(self.l) - 1:
                h = h * torch.sigmoid(h)
        return h


# linear DDPM schedule, as in the Diffusion lab
BETAS = torch.linspace(1e-4, 0.02, 1000, dtype=torch.float64)
ABAR = torch.cumprod(1 - BETAS, 0).float()


def train(kind, pairs=None, init=None, steps=STEPS, seed=0):
    torch.manual_seed(seed); g = torch.Generator().manual_seed(seed + 100)
    net = MLP()
    if init is not None:
        net.load_state_dict(init.state_dict())
    opt = torch.optim.Adam(net.parameters(), lr=LR)
    sch = torch.optim.lr_scheduler.CosineAnnealingLR(opt, steps)
    log = []
    for s in range(steps):
        if kind == "reflow":
            j = torch.randint(0, len(pairs[0]), (BS,), generator=g)
            x0, x1 = pairs[0][j], pairs[1][j]
        else:
            x0, x1 = torch.randn(BS, 2, generator=g), data(BS, g)
        if kind == "ot":      # minibatch OT: re-pair noise and data inside each block of 256 to minimise total squared distance
            parts = []
            for b in range(0, BS, 256):
                c = torch.cdist(x0[b:b + 256], x1[b:b + 256]) ** 2
                r, cidx = linear_sum_assignment(c.numpy())
                parts.append(x1[b:b + 256][torch.from_numpy(cidx)])
            x1 = torch.cat(parts)
        if kind == "ddpm":
            ti = torch.randint(0, 1000, (BS,), generator=g)
            ab = ABAR[ti].view(-1, 1)
            xt = ab.sqrt() * x1 + (1 - ab).sqrt() * x0
            loss = ((net(xt, ti.float() / 1000) - x0) ** 2).mean()
        else:
            t = torch.rand(BS, generator=g)
            xt = (1 - t.view(-1, 1)) * x0 + t.view(-1, 1) * x1
            loss = ((net(xt, t) - (x1 - x0)) ** 2).mean()
        opt.zero_grad(); loss.backward(); opt.step(); sch.step()
        if s % 200 == 0 or s == steps - 1:
            log.append([s, round(loss.item(), 4)])
    return net, log


def quantise(net):
    """int8 per output row: w = q * scale. Returns the JSON blob and a net loaded with the dequantised weights."""
    blob, q_net = [], MLP()
    sd = {}
    for i, l in enumerate(net.l):
        w = l.weight.detach(); b = l.bias.detach()
        sc = (w.abs().amax(1) / 127).clamp(min=1e-8)
        sc_l = [float(f"{v:.4g}") for v in sc.numpy()]          # 4 significant digits: what the page stores
        b_l = [float(f"{v:.4g}") for v in b.numpy()]
        q = torch.round(w / torch.tensor(sc_l).view(-1, 1)).clamp(-127, 127).to(torch.int8)
        sc32, b32 = torch.tensor(sc_l), torch.tensor(b_l)
        sd[f"l.{i}.weight"] = q.float() * sc32.view(-1, 1); sd[f"l.{i}.bias"] = b32
        import base64
        blob.append({"o": w.shape[0], "i": w.shape[1], "q": base64.b64encode(q.numpy().tobytes()).decode(),
                     "s": sc_l, "b": b_l})
    q_net.load_state_dict(sd)
    return blob, q_net


@torch.no_grad()
def flow_solve(net, z, n, solver, keep=False):
    """Integrate dx/dt = v(x, t) from t = 0 (noise) to t = 1 (data); n steps; returns the end point (and the path)."""
    x, path, h = z.clone(), [z.clone()], 1.0 / n
    for k in range(n):
        t = torch.full((len(x),), k * h)
        v = net(x, t)
        if solver == "euler":
            x = x + h * v
        elif solver == "heun":          # predictor (Euler) then the average of the two slopes
            xe = x + h * v
            x = x + h * 0.5 * (v + net(xe, t + h))
        elif solver == "midpoint":
            x = x + h * net(x + 0.5 * h * v, t + 0.5 * h)
        if keep:
            path.append(x.clone())
    return (x, torch.stack(path)) if keep else x


@torch.no_grad()
def ddim_solve(net, z, n, keep=False):
    """DDIM (eta = 0) with trailing spacing, as in the Diffusion lab's samplers.py."""
    ts = [int(round(1000 - k * 1000 / n)) - 1 for k in range(n)]
    x, path = z.clone(), [z.clone()]
    for i, t in enumerate(ts):
        ab = ABAR[t]; abp = ABAR[ts[i + 1]] if i + 1 < n else torch.tensor(1.0)
        eps = net(x, torch.full((len(x),), t / 1000))
        x0 = (x - (1 - ab).sqrt() * eps) / ab.sqrt()
        x = abp.sqrt() * x0 + (1 - abp).sqrt() * eps
        if keep:
            path.append(x.clone())
    return (x, torch.stack(path)) if keep else x


def solve(kind, net, z, n, solver, keep=False):
    return ddim_solve(net, z, n, keep) if kind == "ddpm" else flow_solve(net, z, n, solver, keep)


def on_mode(x):
    return float((torch.cdist(x, CEN).min(1).values < 3 * SD).float().mean())


def w2(x, y):
    c = (torch.cdist(x, y) ** 2).numpy()
    r, ci = linear_sum_assignment(c)
    return float(np.sqrt(c[r, ci].mean()))


if __name__ == "__main__":
    t0 = time.time()
    secs = {}
    nets, logs, blobs, qnets = {}, {}, {}, {}
    for kind in ["cfm", "ot", "ddpm"]:
        t1 = time.time(); nets[kind], logs[kind] = train(kind); secs[kind] = round(time.time() - t1, 1); print(kind, logs[kind][-1], round(time.time() - t0, 1), "s", flush=True)
        blobs[kind], qnets[kind] = quantise(nets[kind])
    # reflow pairs from the (dequantised) cfm model: 20,000 noises pushed through a 256-step Heun solve
    gz = torch.Generator().manual_seed(7)
    z = torch.randn(20000, 2, generator=gz)
    x1 = flow_solve(qnets["cfm"], z, 256, "heun")
    t1 = time.time(); nets["reflow"], logs["reflow"] = train("reflow", pairs=(z, x1), init=nets["cfm"]); secs["reflow"] = round(time.time() - t1, 1)
    blobs["reflow"], qnets["reflow"] = quantise(nets["reflow"])
    print("reflow", logs["reflow"][-1], round(time.time() - t0, 1), "s", flush=True)
    # scores
    ge = torch.Generator().manual_seed(11)
    zE = torch.randn(2000, 2, generator=ge); tgt = data(2000, ge)
    res, straight = [], {}
    for kind in ["cfm", "reflow", "ot", "ddpm"]:
        ref = solve(kind, qnets[kind], zE, 512, "heun")
        for solver in (["euler"] if kind == "ddpm" else ["euler", "heun", "midpoint"]):
            for n in [1, 2, 3, 4, 6, 8, 16, 32, 64]:
                x = solve(kind, qnets[kind], zE, n, solver)
                nfe = n if solver == "euler" or kind == "ddpm" else 2 * n
                res.append({"model": kind, "solver": "ddim" if kind == "ddpm" else solver, "steps": n, "nfe": nfe,
                            "on_mode": round(on_mode(x), 4), "w2": round(w2(x, tgt), 4),
                            "err_ref": round(float((x - ref).norm(dim=1).mean()), 4)})
        # straightness: end-to-end distance / path length, from a 256-step solve (1.0 is a straight line; the Math page's definition)
        _, P = solve(kind, qnets[kind], zE[:500], 256, "heun", keep=True)
        seg = (P[1:] - P[:-1]).norm(dim=2).sum(0); d = (P[-1] - P[0]).norm(dim=1)
        straight[kind] = {"straightness": round(float((d / seg).mean()), 4), "on_mode_ref": round(on_mode(ref), 4),
                          "w2_ref": round(w2(ref, tgt), 4)}
        print(kind, straight[kind], flush=True)
    w2_floor = w2(data(2000, ge), tgt)
    out = {"date": time.strftime("%Y-%m-%d"), "machine": "Apple M1 Pro, CPU (4 threads)", "torch": torch.__version__,
           "seconds": round(time.time() - t0, 1), "train_seconds": secs,
           "setup": {"ring_radius": R, "mode_std": SD, "modes": K, "hidden": H, "layers": 4, "train_steps": STEPS, "batch": BS,
                     "lr": LR, "reflow_pairs": 20000, "reflow_solver": "heun 256 steps", "eval_n": 2000, "ref": "heun 512 steps (ddim 512 for ddpm)",
                     "on_mode_radius": 3 * SD},
           "w2_floor": round(w2_floor, 4), "results": res, "straight": straight, "logs": logs, "nets": blobs}
    json.dump(out, open(os.path.join(HERE, "out", "toy2d.json"), "w"))
    print("done", round(time.time() - t0, 1), "s", flush=True)
