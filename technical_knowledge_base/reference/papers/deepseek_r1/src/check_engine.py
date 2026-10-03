"""Check the toy's JS gradients against PyTorch autograd of the objectives as the paper writes them.
usage: node check_engine.mjs && uv run --with torch python check_engine.py   ->  model/check_engine.json
GRPO (Eq. 1 to 3, per-token ratios against the rollout policy, clip eps, the k3 KL of Eq. 2 against pi_ref, each output's
tokens averaged with 1/|o_i|, groups and questions averaged), Dr. GRPO (no std in the advantage, a constant normaliser),
and the supervised loss (mean log-likelihood per token). The JS engine applies the gradient coefficients by hand."""
import json, torch
torch.set_num_threads(2); torch.set_default_dtype(torch.float64)
D = json.load(open('model/engine_case.json')); NF, NH, NO = D['NF'], D['NH'], D['NO']
NT, END, ANS, BOS, KMAX = 6, 6, 7, 7, 10
def feats(prev, dig, left, claim, k):
    x = torch.zeros(NF)
    for i in (prev, 8 + (3 if dig < 0 else dig), 12 + left, 21 + (3 if claim < 0 else claim), 25 + min(k, KMAX)): x[i] = 1
    return x
def logprobs(p, x, prev):
    W1 = p[:NF * NH].view(NF, NH); b1 = p[NF * NH:NF * NH + NH]; o = NF * NH + NH
    W2 = p[o:o + NH * NO].view(NH, NO); b2 = p[o + NH * NO:]
    z = torch.tanh(x @ W1 + b1) @ W2 + b2
    if prev == END:
        mask = torch.full((NO,), float('-inf')); mask[7:10] = 0; z = z + mask
    return torch.log_softmax(z, -1)
def states(q, toks):
    n = len(q); prev, k, claim = BOS, 0, -1; S = []
    for t in toks:
        S.append((feats(prev, q[k] if k < n else -1, max(0, n - k), claim, k), prev, t))
        if t < NT: k += 1; claim = t % 3; prev = t
        elif t == END: prev = END
        else: break
    return S
res = {}
for name, C in D['cases'].items():
    p = torch.tensor(C['p'], requires_grad=True)
    J = torch.zeros(())
    if name == 'sft':
        SS = [states(d['q'], d['toks']) for d in C['docs']]; nt = sum(len(S) for S in SS)
        for S in SS:
            for x, prev, t in S: J = J + logprobs(p, x, prev)[t] / nt
    else:
        cfg = C['cfg']; ref = torch.tensor(C['ref']); eps, beta, G = cfg['eps'], cfg['beta'], cfg['G']; Q = len(C['rec'])
        L = max(cfg['capA'], cfg['capB'])
        for g in C['rec']:
            R = torch.tensor(g['R'], dtype=torch.float64); mu, sd = R.mean(), R.std()  # std: unbiased, as the JS engine
            A = (R - mu) if cfg['obj'] == 'drgrpo' else ((R - mu) / sd if sd > 0 else R * 0)
            for i, o in enumerate(g['os']):
                S = states(g['q'], o['toks']); norm = L if cfg['obj'] == 'drgrpo' else len(o['toks'])
                for (x, prev, t), lp_old in zip(S, o['lp']):
                    lp = logprobs(p, x, prev)[t]; ratio = torch.exp(lp - lp_old)
                    term = torch.minimum(ratio * A[i], torch.clamp(ratio, 1 - eps, 1 + eps) * A[i])
                    lr_ = logprobs(ref, x, prev)[t]; k3 = torch.exp(lr_ - lp) - (lr_ - lp) - 1
                    J = J + (term - beta * k3) / (norm * G * Q)
    J.backward(); gt = p.grad; gj = torch.tensor(C['g'])
    err = float((gt - gj).abs().max()); scale = float(gt.abs().max())
    res[name] = {'max_abs_diff': err, 'max_abs_grad': scale, 'clipped_tokens': C.get('clipped'), 'tokens': C.get('tokens')}
    print('%-12s grad max |diff| %.2e (max |grad| %.2e) clipped %s of %s tokens' % (name, err, scale, C.get('clipped'), C.get('tokens')))
worst = max(v['max_abs_diff'] for v in res.values())
res['verdict'] = 'PASS' if worst < 1e-9 else 'FAIL'; res['worst'] = worst
json.dump(res, open('model/check_engine.json', 'w'), indent=1); print(res['verdict'], worst)
