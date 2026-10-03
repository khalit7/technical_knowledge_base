# Seq2seq with and without attention on the same toy task: copy a string of digits.
# Same GRU encoder, same GRU decoder, same sizes, same training; the only difference is the context
# vector fed to the decoder at each step:
#   "fixed"     c_t = h_T, the encoder's last state (Cho et al. 2014; Sutskever et al. 2014's bottleneck)
#   "attention" c_t = sum_j a_tj h_j, a_t = softmax_j( v . tanh(W s_{t-1} + U h_j) )  (Bahdanau et al. 2014)
# Run: uv run --with torch python train_seq2seq.py   (threads capped at 2)
import json, math, os, time, base64
import torch, torch.nn as nn
import numpy as np
torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
V, BOS, EOS = 12, 10, 11
E, H, A = 16, 32, 32
LMIN, LMAX = 3, 20
STEPS, BATCH, LR = 6000, 128, 3e-3


class S2S(nn.Module):
    def __init__(s, att, rev=False):
        super().__init__()
        s.att = att
        s.rev = rev  # Sutskever et al. 2014's trick: feed the source reversed, target unchanged
        s.emb = nn.Embedding(V, E)
        s.enc = nn.GRU(E, H, batch_first=True)
        s.dec = nn.GRUCell(E + H, H)
        if att:
            s.W = nn.Linear(H, A, bias=False)
            s.U = nn.Linear(H, A)
            s.v = nn.Linear(A, 1, bias=False)
        s.out = nn.Linear(H + H + E, V)

    def encode(s, x):
        if s.rev: x = x.flip(1)
        hs, hT = s.enc(s.emb(x))
        return hs, hT[0]

    def step(s, y_prev, st, hs, hT, Uh):
        e = s.emb(y_prev)
        if s.att:
            sc = s.v(torch.tanh(s.W(st)[:, None] + Uh))[..., 0]
            a = torch.softmax(sc, 1)
            c = (a[..., None] * hs).sum(1)
        else:
            a = None; c = hT
        st = s.dec(torch.cat([e, c], 1), st)
        logit = s.out(torch.cat([st, c, e], 1))
        return logit, st, a

    def forward(s, x, y_in):
        hs, hT = s.encode(x)
        Uh = s.U(hs) if s.att else None
        st = hT; logits = []
        for t in range(y_in.shape[1]):
            lg, st, _ = s.step(y_in[:, t], st, hs, hT, Uh)
            logits.append(lg)
        return torch.stack(logits, 1)

    @torch.no_grad()
    def greedy(s, x, maxlen):
        hs, hT = s.encode(x)
        Uh = s.U(hs) if s.att else None
        st = hT; y = torch.full((x.shape[0],), BOS); outs = []; atts = []
        for t in range(maxlen):
            lg, st, a = s.step(y, st, hs, hT, Uh)
            y = lg.argmax(1); outs.append(y)
            if a is not None: atts.append(a)
        return torch.stack(outs, 1), (torch.stack(atts, 1) if atts else None)


def batch(L, B, g):
    x = torch.randint(0, 10, (B, L), generator=g)
    y_in = torch.cat([torch.full((B, 1), BOS), x], 1)
    y_out = torch.cat([x, torch.full((B, 1), EOS)], 1)
    return x, y_in, y_out


def train(att, seed, rev=False):
    torch.manual_seed(seed); g = torch.Generator().manual_seed(500 + seed)
    m = S2S(att, rev); opt = torch.optim.Adam(m.parameters(), lr=LR)
    hist = []
    for step in range(STEPS):
        L = int(torch.randint(LMIN, LMAX + 1, (1,), generator=g))
        x, yi, yo = batch(L, BATCH, g)
        lg = m(x, yi)
        loss = nn.functional.cross_entropy(lg.reshape(-1, V), yo.reshape(-1))
        opt.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
        if step % 200 == 0 or step == STEPS - 1:
            hist.append([step, round(loss.item(), 4)])
    return m, hist


@torch.no_grad()
def evaluate(m, L, n=1000):
    g = torch.Generator().manual_seed(77 + L)
    x, yi, yo = batch(L, n, g)
    out, _ = m.greedy(x, L + 1)
    tok = (out == yo).float()
    return round(tok[:, :L].mean().item(), 4), round(tok.all(1).float().mean().item(), 4), \
        [round(v, 4) for v in tok[:, :L].mean(0).tolist()]


def quantise(m):
    # int8 per tensor, symmetric; returns {name: [shape, scale, base64]} and loads the dequantised weights back
    q = {}
    for k, t in m.state_dict().items():
        a = t.numpy().astype(np.float64)
        sc = float(np.abs(a).max()) / 127 or 1.0
        qi = np.clip(np.round(a / sc), -127, 127).astype(np.int8)
        q[k] = [list(a.shape), sc, base64.b64encode(qi.tobytes()).decode()]
        t.copy_(torch.tensor(qi.astype(np.float32) * sc))
    return q


def main():
    os.makedirs(os.path.join(HERE, 'runs'), exist_ok=True)
    LENS = list(range(2, 31))
    res = {'task': 'copy a string of digits', 'E': E, 'H': H, 'A': A, 'train_lengths': [LMIN, LMAX],
           'steps': STEPS, 'batch': BATCH, 'lr': LR, 'eval_lengths': LENS, 'runs': []}
    export = {}
    t0 = time.time()
    for seed in [0, 1]:
        for name, att, rev in [('fixed', False, False), ('attention', True, False), ('fixed_reversed', False, True)]:
            m, hist = train(att, seed, rev)
            ev = [evaluate(m, L) for L in LENS]
            r = {'model': name, 'seed': seed, 'params': sum(p.numel() for p in m.parameters()), 'loss': hist,
                 'tok_acc': [e[0] for e in ev], 'seq_acc': [e[1] for e in ev],
                 'pos_acc_L20': ev[LENS.index(20)][2], 'pos_acc_L30': ev[LENS.index(30)][2]}
            if seed == 0 and name != 'fixed_reversed':
                export[name] = quantise(m)
                evq = [evaluate(m, L) for L in LENS]
                r['tok_acc_int8'] = [e[0] for e in evq]; r['seq_acc_int8'] = [e[1] for e in evq]
                # reference outputs for the JS check (dequantised weights)
                g = torch.Generator().manual_seed(4242)
                refs = []
                for L in [5, 12, 20, 27]:
                    x = torch.randint(0, 10, (1, L), generator=g)
                    out, at = m.greedy(x, L + 1)
                    hs, hT = m.encode(x)
                    refs.append({'x': x[0].tolist(), 'out': out[0].tolist(), 'hT': [round(v, 5) for v in hT[0].tolist()],
                                 'att': (None if at is None else [[round(v, 5) for v in row] for row in at[0].tolist()])})
                export[name + '_refs'] = refs
            res['runs'].append(r)
            print(name, seed, r['params'], 'seq_acc', r['seq_acc'][::4], '%.0fs' % (time.time() - t0), flush=True)
    json.dump(res, open(os.path.join(HERE, 'runs', 'seq2seq_results.json'), 'w'))
    json.dump(export, open(os.path.join(HERE, 'runs', 'seq2seq_weights.json'), 'w'))


if __name__ == '__main__':
    main()
