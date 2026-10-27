"""Train the toy latent diffusion models (toy.py) the paper's way: stage 1 autoencoders, then diffusion in their latent space
(and one in pixel space with a matched parameter count), the same number of steps and batch size for every space (Sec. 4.1).

usage (one at a time, in the background; logs go to model/):
  OMP_NUM_THREADS=2 uv run --with torch --with numpy python train.py ae 4          # autoencoder f = 4 (also 2, 8, 16)
  OMP_NUM_THREADS=2 uv run --with torch --with numpy python train.py dm f4         # diffusion in the f = 4 latent (pix, f2, f4, f8, f16)
  OMP_NUM_THREADS=2 uv run --with torch --with numpy python train.py eval          # held-out scores for every trained model
Checkpoints are saved as model/<name>.pt and reused when the config matches.
"""
import json, math, os, sys, time
import numpy as np
import torch
import torch.nn.functional as F
from toy import *

torch.set_num_threads(int(os.environ.get('OMP_NUM_THREADS', '2')))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
os.makedirs(OUT, exist_ok=True)

AE_CFG = {2: (2, 20), 4: (3, 20), 8: (4, 20), 16: (8, 20)}       # f: (latent channels c as in the paper's Table 8, width C)
DM_CFG = {'pix': dict(f=1, chs=[8, 8, 16, 24]), 'f2': dict(f=2, chs=[12, 16, 24]), 'f4': dict(f=4, chs=[16, 28]),
          'f8': dict(f=8, chs=[20, 24]), 'f16': dict(f=16, chs=[40]),
          'f4long': dict(f=4, chs=[16, 28])}   # the f = 4 model trained for the pixel model's wall-clock time (as Figure 17's fixed V100-days)
N_TRAIN = 40000
AE_STEPS = int(os.environ.get('AE_STEPS', 3000))
DM_STEPS = int(os.environ.get('DM_STEPS', 8000))
BATCH = 64
EVAL_EVERY = int(os.environ.get('EVAL_EVERY', 1000))


def train_set():
    rng = np.random.default_rng(1)
    held = set(heldout_combos())
    seen = [c for c in all_combos() if c not in held]
    P = sample_params(N_TRAIN, rng, seen)
    X = render(P)
    return torch.tensor(X, dtype=torch.float32).permute(0, 3, 1, 2) * 2 - 1, torch.tensor([tokens(tuple(c)) for c in P['combo']])


def ae_path(f):
    return os.path.join(OUT, 'ae%d.pt' % f)


def load_ae(f):
    c, C = AE_CFG[f]
    m = AE(f, c, C)
    ck = torch.load(ae_path(f))
    m.load_state_dict(ck['state'])
    return m.eval(), ck['scale']


def train_ae(f):
    c, C = AE_CFG[f]
    X, _ = train_set()
    torch.manual_seed(0)
    m = AE(f, c, C)
    opt = torch.optim.Adam(m.parameters(), 2e-3)
    log, t0 = [], time.time()
    g = torch.Generator().manual_seed(0)
    for step in range(1, AE_STEPS + 1):
        lr = 2e-3 * 0.5 * (1 + math.cos(math.pi * step / AE_STEPS))
        for pg in opt.param_groups:
            pg['lr'] = lr
        x = X[torch.randint(0, N_TRAIN, (BATCH,), generator=g)]
        mu, lv = m.encode(x)
        z = mu + torch.exp(0.5 * lv) * torch.randn_like(mu)
        xr = m.decode(z)
        rec = (x - xr).abs().flatten(1).sum(1).mean()                  # L1, summed per image as in LPIPSWithDiscriminator
        kl = 0.5 * (mu ** 2 + lv.exp() - 1 - lv).flatten(1).sum(1).mean()
        loss = rec + 1e-6 * kl                                         # kl_weight 0.000001 (configs/autoencoder/*.yaml)
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 100 == 0:
            log.append(dict(step=step, rec_l1_per_px=float(rec) / 3072, kl=float(kl), sec=round(time.time() - t0, 1)))
            print('ae', f, log[-1], flush=True)
    m.eval()
    with torch.no_grad():
        mu, lv = m.encode(X[:BATCH])
        z = mu + torch.exp(0.5 * lv) * torch.randn_like(mu)
        scale = float(1 / z.flatten().std())                            # Appendix G: 1 / sigma-hat from the first batch
    torch.save(dict(state=m.state_dict(), scale=scale, cfg=[f, c, C], steps=AE_STEPS), ae_path(f))
    json.dump(dict(log=log, scale=scale, params=sum(p.numel() for p in m.parameters()), sec=time.time() - t0),
              open(os.path.join(OUT, 'ae%d_log.json' % f), 'w'))


def dm_model(name):
    cfg = DM_CFG[name]
    f = cfg['f']
    c = 3 if f == 1 else AE_CFG[f][0]
    return UNet(32 // f, c, cfg['chs']), f, c


def eval_dm(model, name, f, ae, scale, combos, n_per, S=50, cfg_scale=3.0, seed=123):
    """Generate n_per samples per prompt with DDIM, decode, check. Returns the score dict."""
    ids = torch.tensor([tokens(c) for c in combos for _ in range(n_per)])
    cb = [c for c in combos for _ in range(n_per)]
    shape = (model.cin, model.res, model.res)
    outs = []
    for i in range(0, len(ids), 128):
        z = ddim(model, ids[i:i + 128], shape, S=S, scale=cfg_scale, seed=seed + i)
        with torch.no_grad():
            x = z if f == 1 else ae.decode(z / scale)
        outs.append(((x.clamp(-1, 1) + 1) / 2).permute(0, 2, 3, 1).numpy())
    return score(np.concatenate(outs), cb)


def train_dm(name):
    model, f, c = dm_model(name)
    X, ids = train_set()
    ae, scale = (None, 1.0) if f == 1 else load_ae(f)
    if ae is not None:                                                   # z_t comes cheaply from E: encode the set once
        t0 = time.time()
        with torch.no_grad():
            mus, sds = [], []
            for i in range(0, N_TRAIN, 500):
                mu, lv = ae.encode(X[i:i + 500])
                mus.append(mu); sds.append(torch.exp(0.5 * lv))
            MU, SD = torch.cat(mus), torch.cat(sds)
        enc_sec = time.time() - t0
    else:
        enc_sec = 0.0
    _, ab = schedule()
    ab = torch.tensor(ab, dtype=torch.float32)
    torch.manual_seed(0)
    model, f, c = dm_model(name)
    ema = [p.detach().clone() for p in model.parameters()]
    opt = torch.optim.AdamW(model.parameters(), 1e-3, weight_decay=0.0)
    held = heldout_combos()
    seen = [cc for cc in all_combos() if cc not in set(held)]
    rs = np.random.default_rng(5)
    seen_eval = [seen[i] for i in rs.choice(len(seen), 24, replace=False)]
    g = torch.Generator().manual_seed(1)
    log, evals, t0, train_sec = [], [], time.time(), 0.0
    for step in range(1, DM_STEPS + 1):
        ts0 = time.time()
        lr = 1e-3 * min(1, step / 300) * (0.5 * (1 + math.cos(math.pi * step / DM_STEPS)) * 0.9 + 0.1)
        for pg in opt.param_groups:
            pg['lr'] = lr
        idx = torch.randint(0, N_TRAIN, (BATCH,), generator=g)
        x0 = X[idx] if f == 1 else (MU[idx] + SD[idx] * torch.randn(BATCH, *MU.shape[1:], generator=g)) * scale
        y = ids[idx].clone()
        drop = torch.rand(BATCH, generator=g) < 0.1                     # 10% null prompts for classifier-free guidance
        y[drop] = NULL
        t = torch.randint(0, TSTEPS, (BATCH,), generator=g)
        e = torch.randn(x0.shape, generator=g)
        a = ab[t][:, None, None, None]
        xt = a.sqrt() * x0 + (1 - a).sqrt() * e
        loss = F.mse_loss(model(xt, t, y), e)                            # Eq. 2 / Eq. 3: || eps - eps_theta(z_t, t, tau(y)) ||^2
        opt.zero_grad(); loss.backward(); opt.step()
        with torch.no_grad():
            dec = min(0.999, (1 + step) / (10 + step))                    # EMA with the usual warm-up
            for pe, p in zip(ema, model.parameters()):
                pe.mul_(dec).add_(p.detach(), alpha=1 - dec)
        train_sec += time.time() - ts0
        if step % 100 == 0:
            log.append(dict(step=step, loss=float(loss), sec=round(train_sec, 1)))
            print('dm', name, log[-1], flush=True)
        if step % EVAL_EVERY == 0 or step == DM_STEPS:
            em, _, _ = dm_model(name)
            with torch.no_grad():
                for pe, p in zip(em.parameters(), ema):
                    pe.copy_(p)
            em.eval()
            r = dict(step=step, train_sec=round(train_sec, 1), seen=eval_dm(em, name, f, ae, scale, seen_eval, 2),
                     held=eval_dm(em, name, f, ae, scale, held, 4))
            evals.append(r)
            print('eval', name, r, flush=True)
            torch.save(dict(state=em.state_dict(), cfg=DM_CFG[name], f=f, scale=scale, step=step), os.path.join(OUT, 'dm_%s.pt' % name))
            json.dump(dict(name=name, cfg=DM_CFG[name], params=sum(p.numel() for p in model.parameters()),
                           macs=macs(em, (em.cin, em.res, em.res)), enc_sec=enc_sec, sec_per_step=train_sec / step,
                           log=log, evals=evals), open(os.path.join(OUT, 'dm_%s_log.json' % name), 'w'))


def evaluate():
    """model/eval_report.json: every trained model on seen and held-out prompts at guidance 1 and 3 (50 DDIM steps), sampling
    time per image, the checker on real data, and each autoencoder's reconstruction PSNR and checker agreement."""
    import export as E
    rep = {'real': None, 'ae': {}, 'dm': {}}
    rng = np.random.default_rng(42)
    held = heldout_combos()
    seen = [c for c in all_combos() if c not in set(held)]
    P = sample_params(1000, rng, all_combos())
    rep['real'] = score(render(P), [tuple(c) for c in P['combo']])
    X, P2 = E.test_images(400)
    for f in AE_CFG:
        if os.path.exists(ae_path(f)):
            m, sc = load_ae(f)
            rep['ae'][f] = dict(E.ae_eval(m, X, P2), scale=sc, numbers=AE_CFG[f][0] * (32 // f) ** 2)
            print('ae', f, rep['ae'][f], flush=True)
    rs = np.random.default_rng(5)
    seen_eval = [seen[i] for i in rs.choice(len(seen), 24, replace=False)]
    for name in DM_CFG:
        p = os.path.join(OUT, 'dm_%s.pt' % name)
        if not os.path.exists(p):
            continue
        ck = torch.load(p)
        m, f, c = dm_model(name)
        m.load_state_dict(ck['state']); m.eval()
        ae = None if f == 1 else load_ae(f)[0]
        r = {'step': ck['step']}
        for s in (1.0, 3.0):
            t0 = time.time()
            r['held_s%g' % s] = eval_dm(m, name, f, ae, ck['scale'], held, 8, cfg_scale=s)
            r['sec_per_image_s%g' % s] = (time.time() - t0) / (len(held) * 8)
            r['seen_s%g' % s] = eval_dm(m, name, f, ae, ck['scale'], seen_eval, 4, cfg_scale=s)
        rep['dm'][name] = r
        print('dm', name, r, flush=True)
    json.dump(rep, open(os.path.join(OUT, 'eval_report.json'), 'w'), indent=1)


if __name__ == '__main__':
    if sys.argv[1] == 'ae':
        train_ae(int(sys.argv[2]))
    elif sys.argv[1] == 'dm':
        train_dm(sys.argv[2])
    elif sys.argv[1] == 'eval':
        evaluate()
    elif sys.argv[1] == 'params':
        for k in DM_CFG:
            m, f, c = dm_model(k)
            print(k, sum(p.numel() for p in m.parameters()), macs(m, (m.cin, m.res, m.res)))
        for f in AE_CFG:
            m = AE(f, *AE_CFG[f])
            print('ae', f, sum(p.numel() for p in m.parameters()))
