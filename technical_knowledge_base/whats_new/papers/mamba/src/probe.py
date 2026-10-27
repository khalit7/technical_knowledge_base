"""Which selective parameter does the trained toy rely on? Freeze one of Delta_t, B_t, C_t at its average over held-out
sequences (per channel, per position kind) and measure accuracy again; also per-layer statistics of Delta on data vs noise.
Writes model/probe.json.   uv run --with torch --with numpy python probe.py"""
import json, os, sys, torch, torch.nn.functional as F
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import train as T


def forward(m, x, freeze=None, stats=None):
    h = m.emb(x)
    for l, (nm, b) in enumerate(zip(m.norms, m.blocks)):
        u = nm(h); xz = b.in_proj(u); xx, z = xz.chunk(2, -1); xc = F.silu(T.causal_conv(xx, b.conv.weight, b.conv.bias))
        dt, Bm, Cm = b.x_proj(xc).split([T.R, T.N, T.N], -1); delta = F.softplus(b.dt_proj(dt))
        if stats is not None: stats.append(dict(delta=delta, B=Bm, C=Cm))
        if freeze and freeze[1] == l:
            ref = freeze[2][l]
            if freeze[0] == 'delta': delta = ref['delta'].mean((0, 1), keepdim=True).expand_as(delta)
            if freeze[0] == 'B': Bm = ref['B'].mean((0, 1), keepdim=True).expand_as(Bm)
            if freeze[0] == 'C': Cm = ref['C'].mean((0, 1), keepdim=True).expand_as(Cm)
        A = -torch.exp(b.A_log); dA = torch.exp(delta[..., None] * A); dBx = delta[..., None] * Bm[:, :, None, :] * xc[..., None]
        hs = T.ScanFn.apply(dA, dBx); y = (hs * Cm[:, :, None, :]).sum(-1) + xc * b.Dskip
        h = h + b.out_proj(y * F.silu(z))
    return m.nf(h) @ m.emb.weight.T


def acc(lg, y):
    k = y >= 0; return ((lg.argmax(-1) == y) & k).sum().item() / k.sum().item()


def main():
    torch.set_num_threads(2); out = {}
    m = T.build('sc_s6'); m.load_state_dict(torch.load(os.path.join(T.HERE, 'model', 'sc_s6_q.pt'), weights_only=False)['state']); m.eval()
    x, y = T.test_set('sc', n=500)
    with torch.no_grad():
        st = []; base = acc(forward(m, x, stats=st), y); out['base'] = round(base, 4)
        data = x[:, :48] > 0
        out['delta'] = [dict(data=round(s['delta'][:, :48][data].mean().item(), 4), noise=round(s['delta'][:, :48][~data].mean().item(), 4),
                             markers=round(s['delta'][:, 48:].mean().item(), 4)) for s in st]
        ind = ((x > 0) & (x < 9)).float(); feats = dict(is_data=ind, position=torch.arange(x.shape[1]).float().expand_as(ind), marker=(x == 9).float())
        for l, s in enumerate(st):
            d = s['delta'].reshape(-1, s['delta'].shape[-1]); d = d - d.mean(0)
            for k, f in feats.items():
                a = f[..., None].expand_as(s['delta']).reshape(-1, d.shape[-1]); a = a - a.mean(0)
                c = (a * d).sum(0) / (a.norm(dim=0) * d.norm(dim=0) + 1e-9)
                out['corr_%s_layer%d' % (k, l + 1)] = round(c.abs().max().item(), 2)
        for what in ('delta', 'B', 'C'):
            for l in range(T.LAYERS):
                out['freeze_%s_layer%d' % (what, l + 1)] = round(acc(forward(m, x, freeze=(what, l, st)), y), 4)
    json.dump(out, open(os.path.join(T.HERE, 'model', 'probe.json'), 'w'), indent=1); print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
