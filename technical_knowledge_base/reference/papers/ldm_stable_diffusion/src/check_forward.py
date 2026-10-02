"""Reference outputs of the dequantised toy models (exactly the weights the page ships) for check_forward.mjs.
  OMP_NUM_THREADS=2 uv run --with torch --with numpy python check_forward.py [bits]   -> model/check_ref.json
Then: node check_forward.mjs  -> model/check_forward.json (JS against PyTorch)."""
import json, math, os, sys
import numpy as np, torch
import toy as Y, train as TR, export as E
torch.set_num_threads(2)
bits = int(sys.argv[1]) if len(sys.argv) > 1 else 8
MD = TR.OUT
rng = np.random.default_rng(0)
ref = {'bits': bits, 'unet': {}, 'ae': {}, 'chain': {}}
for f in E.SHIP_AE:
    ck = torch.load(TR.ae_path(f)); _, deq = E.quantise(ck['state'], bits)
    m = Y.AE(f, *TR.AE_CFG[f]); m.load_state_dict(deq); m.eval()
    P = Y.sample_params(3, rng, Y.all_combos())
    X = torch.tensor(Y.render(P), dtype=torch.float32).permute(0, 3, 1, 2) * 2 - 1
    with torch.no_grad():
        mu, lv = m.encode(X); xr = m.decode(mu)
    ref['ae'][f] = dict(x=X.reshape(3, -1).tolist(), mu=mu.reshape(3, -1).tolist(), lv=lv.reshape(3, -1).tolist(), rec=xr.reshape(3, -1).tolist())
_, ab = Y.schedule()
for name in E.SHIP_DM:
    ck = torch.load(os.path.join(MD, 'dm_%s.pt' % name)); _, deq = E.quantise(ck['state'], bits)
    m, f, c = TR.dm_model(name); m.load_state_dict(deq); m.eval()
    shp = (m.cin, m.res, m.res)
    xs = torch.randn(4, *shp, generator=torch.Generator().manual_seed(3))
    ts = torch.tensor([1, 250, 600, 999]); ids = torch.tensor([[0, 4, 7], [1, 5, 11], [3, 6, 15], [Y.NULL] * 3])
    with torch.no_grad():
        out = m(xs, ts, ids)
    ref['unet'][name] = dict(x=xs.reshape(4, -1).tolist(), t=ts.tolist(), ids=ids.tolist(), out=out.reshape(4, -1).tolist())
    # a full guided DDIM chain from given noise (20 steps, s = 3), decoded
    S, s = 20, 3.0
    x = torch.randn(1, *shp, generator=torch.Generator().manual_seed(9)); x_init = x.clone()
    st = Y.ddim_steps(S)[::-1]; y = torch.tensor([[2, 6, 10]]); null = torch.full_like(y, Y.NULL)
    with torch.no_grad():
        for j, t in enumerate(st):
            a = float(ab[t]); ap = float(ab[st[j + 1]]) if j + 1 < len(st) else float(ab[0])
            tt = torch.tensor([int(t)])
            ec = m(x, tt, y); eu = m(x, tt, null); e = eu + s * (ec - eu)
            x0 = (x - math.sqrt(1 - a) * e) / math.sqrt(a); x = math.sqrt(ap) * x0 + math.sqrt(1 - ap) * e
        if f > 1:
            ae = Y.AE(f, *TR.AE_CFG[f]); _, dq = E.quantise(torch.load(TR.ae_path(f))['state'], bits); ae.load_state_dict(dq); ae.eval()
            img = ae.decode(x / ck['scale'])
        else:
            img = x
    r = Y.check(((img.clamp(-1, 1) + 1) / 2).permute(0, 2, 3, 1).numpy())
    ref['chain'][name] = dict(x_init=x_init.reshape(-1).tolist(), ids=[2, 6, 10], S=S, scale=s, z=x.reshape(-1).tolist(), img=img.reshape(-1).tolist(),
                              check=[int(r['valid'][0]), int(r['colour'][0]), int(r['shape'][0]), int(r['pos'][0])])
json.dump(ref, open(os.path.join(MD, 'check_ref.json'), 'w'))
print('wrote check_ref.json')
