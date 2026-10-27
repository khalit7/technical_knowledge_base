"""A toy DiffusionGemma: block-autoregressive discrete diffusion with a shared-weights causal encoder and
bidirectional decoder, self-conditioning, and the paper's sampler (Algorithm 1), at toy scale.

  uv run --with torch --with numpy python train.py train <variant> [steps]   # trains model/<variant>.pt
  uv run --with torch --with numpy python train.py eval                      # sampler sweeps -> model/results.json
  uv run --with torch --with numpy python train.py export                    # 6-bit export -> parts/20_model_data.js

Variants (identical except for the corruption process):
  multinomial  each canvas token is replaced by a uniformly random vocabulary token with probability t
               (the paper's choice, §2.1.1 Eq. 1 and §4)
  masked       each canvas token is replaced by a [mask] token with probability t (the alternative the paper
               argues against in §3.2 "Multinomial diffusion": visible tokens are then always clean, so the
               model learns to copy them and cannot revise them)

The tasks are the two of Appendix G.2 (Figures 24 and 25), with a 3-token window instead of 2 so that there are
256 rule tables, 32 of which are held out entirely for testing:
  seq   continue a bit sequence: each new bit is rule[previous three bits of the sequence itself]
        (each output depends on the model's own earlier outputs: the "hard", sequential case)
  conv  map an input string: output bit n is rule[input bits n-2, n-1, n] (bits before the start are 0)
        (every output depends only on the prompt: the "easy", parallel case)
Each answer is 24 bits, generated as 3 canvases of 8 tokens (the paper: canvases of 256).

Training (§4 and §8): the full clean sequence is run through the causal encoder (next-token loss on every
position, Eq. 13 left), and one uniformly chosen canvas is corrupted at t ~ U[0,1] and denoised by the decoder,
which attends bidirectionally inside the canvas and to the encoder's keys and values of everything before it
(Eq. 13 right, Eq. 11). Half the batch is self-conditioned on a first, gradient-free pass (§8). The loss is the
sum of the two.
"""
import base64, json, math, os, random, sys, time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(HERE, 'model'), exist_ok=True)
WIN = ['000', '001', '010', '011', '100', '101', '110', '111']  # window tokens of the rule table: '011' -> bit
VOCAB = ['0', '1', '<p>', '<b>', 'seq', 'conv', 'rule', 'in', '<a>'] + WIN + ['[m]']
IDX = {w: i for i, w in enumerate(VOCAB)}
PAD, BOS, SEQ, CONV, RULE, IN, ANS, MASK = (IDX[w] for w in ['<p>', '<b>', 'seq', 'conv', 'rule', 'in', '<a>', '[m]'])
VN = 17           # the multinomial model's vocabulary (noise is uniform over these 17 tokens); [m] is the masked model's
NB = 24           # answer bits
C = 8             # canvas length
K = NB // C       # canvases per answer
P = 45            # prompt length (conv prompt: <b> conv rule 000 r0 .. 111 r7 in b1..b24 <a>; seq prompts are left-padded)
T = P + NB        # full sequence length
CFG = dict(d=48, h=4, L=3, ff=128, steps=3000, batch=192, lr=2e-3, warmup=400, wd=0.01, seed=7)
TEST_RULES = list(range(0, 256, 8))  # 32 held-out rule tables (every 8th), never seen in training
TRAIN_RULES = [r for r in range(256) if r not in TEST_RULES]


def rule_bits(r): return [(r >> i) & 1 for i in range(8)]  # entry i = output for window value i (4a + 2b + c)


def rule_toks(rb): return [t for i in range(8) for t in (IDX[WIN[i]], rb[i])]  # 000 r0 001 r1 ... 111 r7


def make_problem(task, r, rng):
    rb = rule_bits(r)
    if task == 'seq':
        s = [rng.randrange(2) for _ in range(3)]
        x = list(s)
        for _ in range(NB): x.append(rb[4 * x[-3] + 2 * x[-2] + x[-1]])
        prompt = [BOS, SEQ, RULE] + rule_toks(rb) + [IN] + s + [ANS]
        ans = x[3:]
    else:
        b = [rng.randrange(2) for _ in range(NB)]
        z = [0, 0] + b
        ans = [rb[4 * z[n] + 2 * z[n + 1] + z[n + 2]] for n in range(NB)]
        prompt = [BOS, CONV, RULE] + rule_toks(rb) + [IN] + b + [ANS]
    prompt = [PAD] * (P - len(prompt)) + prompt
    return prompt, ans


def check_answer(task, prompt, out):
    """Exact-match grading from the prompt alone (the page's JavaScript uses the same rule)."""
    p = [t for t in prompt if t != PAD]
    rb = p[4:19:2]
    if task == 'seq':
        x = p[20:23]
        for _ in range(NB): x.append(rb[4 * x[-3] + 2 * x[-2] + x[-1]])
        return out == x[3:]
    z = [0, 0] + p[20:20 + NB]
    return out == [rb[4 * z[n] + 2 * z[n + 1] + z[n + 2]] for n in range(NB)]


class RMS(nn.Module):
    def __init__(s, d):
        super().__init__(); s.weight = nn.Parameter(torch.ones(d))
    def forward(s, x): return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + 1e-6) * s.weight


def rope(x, pos, base=100.0):
    """Rotary position embedding (rotate_half pairing). x: (B, H, N, hd); pos: (B, N) absolute positions."""
    hd = x.shape[-1]
    inv = 1.0 / (base ** (torch.arange(0, hd, 2, dtype=torch.float64) / hd))
    ang = pos.double()[:, None, :, None] * inv
    cos = torch.cat([ang.cos(), ang.cos()], -1).float(); sin = torch.cat([ang.sin(), ang.sin()], -1).float()
    x1, x2 = x[..., :hd // 2], x[..., hd // 2:]
    return x * cos + torch.cat([-x2, x1], -1) * sin


class Block(nn.Module):
    def __init__(s, c):
        super().__init__(); d, ff = c['d'], c['ff']; s.c = c
        s.n1 = RMS(d); s.n2 = RMS(d)
        s.q = nn.Linear(d, d, bias=False); s.k = nn.Linear(d, d, bias=False); s.v = nn.Linear(d, d, bias=False); s.o = nn.Linear(d, d, bias=False)
        s.up = nn.Linear(d, ff, bias=False); s.dn = nn.Linear(ff, d, bias=False)
    def forward(s, x, allow, pos):
        B, N, d = x.shape; h = s.c['h']; hd = d // h
        y = s.n1(x)
        q = s.q(y).view(B, N, h, hd).transpose(1, 2); k = s.k(y).view(B, N, h, hd).transpose(1, 2); v = s.v(y).view(B, N, h, hd).transpose(1, 2)
        q, k = rope(q, pos), rope(k, pos)
        a = (q @ k.transpose(-1, -2)) / math.sqrt(hd)
        a = a.masked_fill(~allow[:, None], float('-inf')).softmax(-1)
        x = x + s.o((a @ v).transpose(1, 2).reshape(B, N, d))
        return x + s.dn(F.gelu(s.up(s.n2(x)), approximate='tanh'))


class TinyDG(nn.Module):
    """One set of weights used two ways: causal encoder over the clean sequence, bidirectional decoder over one canvas."""
    def __init__(s, c):
        super().__init__(); s.c = c; d = c['d']
        s.emb = nn.Embedding(len(VOCAB), d)
        s.blocks = nn.ModuleList(Block(c) for _ in range(c['L'])); s.nf = RMS(d)
        s.sc1 = nn.Linear(d, 2 * d, bias=False); s.sc2 = nn.Linear(2 * d, d, bias=False)  # self-conditioning FFW (§3.2, Eq. 6)
        nn.init.normal_(s.emb.weight, std=0.3); nn.init.zeros_(s.sc2.weight)

    def selfcond(s, p):  # p: (B, C, V) clean-token probabilities -> z = FFW(p E)
        return s.sc2(F.gelu(s.sc1(p @ s.emb.weight), approximate='tanh'))

    def forward(s, ctx, canvas=None, start=None, z=None):
        """ctx (B, T') clean tokens at positions 0..T'-1, causal. canvas (B, C) noisy tokens at positions start..start+C-1,
        attending to ctx[:start] and to the whole canvas. Returns (encoder logits (B, T', V), decoder logits (B, C, V))."""
        B, Tc = ctx.shape
        x = s.emb(ctx)
        pos = torch.arange(Tc)[None].expand(B, Tc)
        allow = torch.tril(torch.ones(Tc, Tc, dtype=torch.bool))[None].expand(B, Tc, Tc)
        if canvas is not None:
            pos = torch.cat([pos, start[:, None] + torch.arange(C)[None]], 1)
            xc = s.emb(canvas)
            if z is not None: xc = xc + z
            x = torch.cat([x, xc], 1)
            N = Tc + C
            al = torch.zeros(B, N, N, dtype=torch.bool)
            al[:, :Tc, :Tc] = allow
            al[:, Tc:, :Tc] = torch.arange(Tc)[None, None, :] < start[:, None, None]
            al[:, Tc:, Tc:] = True
            allow = al
        for b in s.blocks: x = b(x, allow, pos)
        lg = s.nf(x) @ s.emb.weight.t()
        return lg[:, :Tc], (lg[:, Tc:] if canvas is not None else None)


def corrupt(x0, t, variant, gen):
    flip = torch.rand(x0.shape, generator=gen) < t[:, None]
    if variant == 'masked': noise = torch.full_like(x0, MASK)
    else: noise = torch.randint(0, VN, x0.shape, generator=gen)
    return torch.where(flip, noise, x0)


def batch(rng, B, rules):
    ctx, task = [], []
    for _ in range(B):
        tk = 'seq' if rng.random() < 0.5 else 'conv'
        p, a = make_problem(tk, rng.choice(rules), rng)
        ctx.append(p + a); task.append(tk)
    return torch.tensor(ctx), task


def lr_at(step, c):
    if step < c['warmup']: return c['lr'] * (step + 1) / c['warmup']
    return c['lr'] * 0.5 * (1 + math.cos(math.pi * (step - c['warmup']) / (c['steps'] - c['warmup'])))


def train(variant, steps=None):
    torch.set_num_threads(2)
    c = dict(CFG)
    if steps: c['steps'] = int(steps)
    torch.manual_seed(c['seed']); rng = random.Random(c['seed']); gen = torch.Generator().manual_seed(c['seed'])
    m = TinyDG(c)
    opt = torch.optim.AdamW(m.parameters(), lr=c['lr'], betas=(0.9, 0.98), weight_decay=c['wd'])
    logp = os.path.join(HERE, 'model', variant + '.log'); lf = open(logp, 'w')
    nparam = sum(p.numel() for p in m.parameters())
    print('variant', variant, 'params', nparam, 'cfg', c, file=lf, flush=True)
    t0 = time.time(); B = c['batch']
    for step in range(c['steps']):
        for g in opt.param_groups: g['lr'] = lr_at(step, c)
        ctx, task_ = batch(rng, B, TRAIN_RULES)
        k = torch.randint(0, K, (B,), generator=gen); start = P + C * k
        x0 = torch.stack([ctx[i, start[i]:start[i] + C] for i in range(B)])
        t = torch.rand(B, generator=gen)
        xt = corrupt(x0, t, variant, gen)
        z = None
        use = torch.rand(B, generator=gen) < 0.5
        if use.any():
            with torch.no_grad():
                _, d0 = m(ctx, xt, start)
            z = m.selfcond(d0.softmax(-1)) * use[:, None, None]
        enc, dec = m(ctx, xt, start, z)
        le = F.cross_entropy(enc[:, :-1].reshape(-1, len(VOCAB)), ctx[:, 1:].reshape(-1))
        ld = F.cross_entropy(dec.reshape(-1, len(VOCAB)), x0.reshape(-1))
        loss = le + ld
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
        if step % 200 == 0 or step == c['steps'] - 1:
            # answer-token encoder loss (the AR mode's loss on the 24 answer bits) for reference
            sq = torch.tensor([tk == 'seq' for tk in task_])
            ce = F.cross_entropy(enc[:, P - 1:-1].reshape(-1, len(VOCAB)), ctx[:, P:].reshape(-1), reduction='none').view(B, -1).mean(1)
            cd = F.cross_entropy(dec.reshape(-1, len(VOCAB)), x0.reshape(-1), reduction='none').view(B, -1).mean(1)
            print('step %d loss %.4f enc %.4f | AR answer loss seq %.4f conv %.4f | denoise loss seq %.4f conv %.4f | lr %.2e time %.0fs' % (step, loss.item(), le.item(), ce[sq].mean(), ce[~sq].mean(), cd[sq].mean(), cd[~sq].mean(), lr_at(step, c), time.time() - t0), file=lf, flush=True)
    torch.save({'cfg': c, 'state': m.state_dict(), 'variant': variant, 'params': nparam}, os.path.join(HERE, 'model', variant + '.pt'))
    print('saved', file=lf, flush=True)


# ---- the sampler: Algorithm 1 of the paper, batched over prompts that share nothing but the step clock ----
def entropy(p): return -(p * torch.log(p.clamp_min(1e-30))).sum(-1)


@torch.no_grad()
def sample(m, prompts, variant, N=48, b=0.1, e_stop=0.005, tmax=0.8, tmin=0.4, selfcond=True, seed=0, trace=False):
    """prompts: (B, P). Returns answers (B, NB), steps per canvas (B, K), revisions count (B,), optional trace."""
    gen = torch.Generator().manual_seed(seed)
    B = prompts.shape[0]; ctx = prompts.clone()
    steps = torch.zeros(B, K, dtype=torch.long); revis = torch.zeros(B, dtype=torch.long); tr = []
    V = VN if variant == 'multinomial' else len(VOCAB)
    for k in range(K):
        start = torch.full((B,), P + C * k)
        x = torch.randint(0, VN, (B, C), generator=gen) if variant == 'multinomial' else torch.full((B, C), MASK)
        z = None; prev = None; done = torch.zeros(B, dtype=torch.bool); out = torch.zeros(B, C, dtype=torch.long)
        acc_prev = torch.full((B, C), -1)
        dt = 1.0 / N
        for n in range(1, N + 1):
            t = 1 - (n - 1) * dt
            _, L = m(ctx, x, start, z if selfcond else None)
            if V < len(VOCAB): L = L.masked_fill(torch.arange(len(VOCAB)) >= V, float('-inf'))
            xhat = L.argmax(-1)
            tau = (tmax - tmin) * t + tmin
            p = (L / tau).softmax(-1)
            e = entropy(p); ebar = e.mean(-1)
            live = ~done
            steps[live, k] += 1
            stop = live & (n > 1) & (ebar <= e_stop) & (prev == xhat).all(-1) if prev is not None else torch.zeros(B, dtype=torch.bool)
            out[stop] = xhat[stop]; done |= stop
            prev = xhat
            if n == N:
                out[~done] = xhat[~done]; done[:] = True
                break
            z = m.selfcond(p) if selfcond else None
            xD = torch.multinomial(p.reshape(-1, len(VOCAB)), 1, generator=gen).view(B, C)
            order = torch.sort(e + torch.arange(C)[None] * 1e-9, -1).indices  # ties by position index
            es = torch.gather(e, 1, order)
            cum = torch.cumsum(es, -1) - es  # sum of the entropies before position j in the order
            kk = (cum <= b).sum(-1)          # k = max m with sum_{j<m} e <= b (at least 1)
            inU = torch.zeros(B, C, dtype=torch.bool)
            for i in range(B): inU[i, order[i, :kk[i]]] = True
            if variant == 'multinomial': rest = torch.randint(0, VN, (B, C), generator=gen)
            else: rest = torch.full((B, C), MASK)
            newx = torch.where(inU, xD, rest)
            # revisions: a position accepted at the previous step whose newly accepted value differs
            ch = live[:, None] & inU & (acc_prev >= 0) & (acc_prev != xD)
            revis += ch.sum(-1)
            acc_prev = torch.where(inU, xD, torch.full_like(xD, -1))
            if trace: tr.append({'n': n, 'x': x[0].tolist(), 'xhat': xhat[0].tolist(), 'e': e[0].tolist(), 'U': inU[0].tolist()})
            x = torch.where(done[:, None], x, newx)
            if done.all(): break
        ctx = torch.cat([ctx, out], 1)  # "encode and append": the next canvas attends to it through the causal encoder
    return ctx[:, P:], steps, revis, tr


@torch.no_grad()
def ar_decode(m, prompts):
    ctx = prompts.clone()
    for _ in range(NB):
        enc, _ = m(ctx)
        ctx = torch.cat([ctx, enc[:, -1, :2].argmax(-1, keepdim=True)], 1)  # restricted to the bits, as the task demands
    return ctx[:, P:]


def test_set(per=256, seed=12345):
    rng = random.Random(seed); out = []
    for task in ('seq', 'conv'):
        for i in range(per):
            p, a = make_problem(task, TEST_RULES[i % len(TEST_RULES)], rng); out.append((task, p, a))
    return out


def load(variant, quant=False):
    ck = torch.load(os.path.join(HERE, 'model', variant + ('_q' if quant else '') + '.pt'), weights_only=False)
    m = TinyDG(ck['cfg']); m.load_state_dict(ck['state']); m.eval(); return m


def evaluate():
    torch.set_num_threads(2)
    ts = test_set()
    res = {'test': 'held-out rule tables %s (32 of 256, never trained on); 256 problems per task, seeded' % TEST_RULES[:4], 'runs': []}
    for variant in ('multinomial', 'masked'):
        m = load(variant, quant=True)
        for task in ('seq', 'conv'):
            rows = [x for x in ts if x[0] == task]
            pr = torch.tensor([r[1] for r in rows])
            ar = ar_decode(m, pr)
            ar_acc = np.mean([check_answer(task, r[1], ar[i].tolist()) for i, r in enumerate(rows)])
            for N in (4, 8, 16, 24, 48):
                for b in (0.1, 1.0):
                    for sc in ([True, False] if (N, b) == (48, 0.1) else [True]):
                        out, st, rv, _ = sample(m, pr, variant, N=N, b=b, selfcond=sc, seed=1)
                        acc = np.mean([check_answer(task, r[1], out[i].tolist()) for i, r in enumerate(rows)])
                        bit = float((out == torch.tensor([r[2] for r in rows])).float().mean())
                        tot = st.sum(1).float()
                        tpf = float((NB / (tot + K - 1)).mean())
                        run = dict(variant=variant, task=task, N=N, b=b, selfcond=sc, acc=round(float(acc), 4), bit_acc=round(bit, 4),
                                   steps_per_canvas=round(float(st.float().mean()), 3), tpf=round(tpf, 3), revisions=round(float(rv.float().mean()), 3), ar_acc=round(float(ar_acc), 4))
                        res['runs'].append(run); print(run, flush=True)
    # the same sampler on rule tables seen in training (fresh inputs), to separate rule-following from memorised tables
    res['train_rules'] = {}
    rng = random.Random(3)
    for variant in ('multinomial', 'masked'):
        m = load(variant, quant=True)
        for task in ('seq', 'conv'):
            rows = [make_problem(task, rng.choice(TRAIN_RULES), rng) for _ in range(256)]
            out, st, rv, _ = sample(m, torch.tensor([r[0] for r in rows]), variant, seed=1)
            res['train_rules'][variant + '_' + task] = round(float(np.mean([check_answer(task, r[0], out[i].tolist()) for i, r in enumerate(rows)])), 4)
    print(res['train_rules'])
    json.dump(res, open(os.path.join(HERE, 'model', 'results.json'), 'w'), indent=1)


# ---- export: matrices 6-bit per row (one base64 character per weight), vectors float16 (reference page's format) ----
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'


def tensor_order(c):
    names = ['emb.weight']
    for i in range(c['L']):
        p = 'blocks.%d.' % i
        names += [p + x + '.weight' for x in ('n1', 'q', 'k', 'v', 'o', 'n2', 'up', 'dn')]
    return names + ['nf.weight', 'sc1.weight', 'sc2.weight']


def quantise(state, c):
    mq, sq, vb, tmax, deq = [], [], bytearray(), [], {}
    for n in tensor_order(c):
        w = state[n].float().numpy()
        if w.ndim == 2:
            amax = max(float(np.abs(w).max()), 1e-12); tm = float('%.5g' % (amax * 1.0001)); tmax.append(tm)
            rows = []
            for row in w:
                ra = max(float(np.abs(row).max()), 1e-12)
                code = min(63, max(0, int(math.floor(-8 * math.log2(ra / tm)))))
                while code > 0 and tm * 2 ** (-code / 8) < ra: code -= 1
                s = tm * 2 ** (-code / 8) / 31
                q = np.clip(np.round(row / s), -31, 31).astype(int)
                sq.append(B64[code]); mq.append(''.join(B64[v + 32] for v in q))
                rows.append(q * s)
            deq[n] = torch.tensor(np.array(rows), dtype=torch.float32)
        else:
            h = w.astype(np.float16); vb += h.tobytes()
            deq[n] = torch.tensor(h.astype(np.float32))
    assert set(deq) == set(state), set(state) ^ set(deq)
    return ''.join(mq), ''.join(sq), base64.b64encode(bytes(vb)).decode(), tmax, deq


def export():
    out = {'vocab': VOCAB, 'cfg': {k: CFG[k] for k in ('d', 'h', 'L', 'ff')}, 'P': P, 'C': C, 'K': K, 'NB': NB, 'VN': VN,
           'test_rules': TEST_RULES, 'variants': {}}
    for name in ('multinomial', 'masked'):
        ck = torch.load(os.path.join(HERE, 'model', name + '.pt'), weights_only=False)
        mq, sq, vb, tmax, deq = quantise(ck['state'], ck['cfg'])
        mm = TinyDG(ck['cfg']); mm.load_state_dict(deq); mm.eval()
        q = dict(ck); q['state'] = mm.state_dict()
        torch.save(q, os.path.join(HERE, 'model', name + '_q.pt'))
        out['variants'][name] = {'tmax': tmax, 'm': mq, 's': sq, 'v': vb}
        print(name, 'exported', len(mq) + len(sq) + len(vb), 'chars')
    js = '// Generated by train.py export: the toy DiffusionGemma vocabulary, configuration and weights.\n' \
         '// Matrices are 6-bit, one base64 character per weight, with one scale character per row; vectors are float16.\n' \
         'window.TDG=' + json.dumps(out, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, 'parts', '20_model_data.js'), 'w').write(js)
    print('wrote parts/20_model_data.js', len(js), 'bytes')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'train'
    if cmd == 'train': train(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    elif cmd == 'eval': evaluate()
    elif cmd == 'export': export()
