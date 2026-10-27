"""Check the toy's JS gradients against PyTorch autograd of the paper's own objectives.
usage: node check_engine.mjs && uv run --with torch python check_engine.py   ->  model/check_engine.json
For each method the JS engine (parts/22_js_toy.js) applies the paper's gradient coefficients directly (Eq. 5 and Appendix A.1:
Eq. 7, 9/10, 11, 13/14, 17/18, 20/21). Here the same batch is pushed through the objectives as written (Eq. 1, 3, 4, 6, 8, 12,
and Eq. 15 with GAE), with pi_old = pi detached, and differentiated by autograd. Agreement checks both the engine and the
paper's derivations of the gradient coefficients (with Eq. 12 read with o-_t in the numerator; the printed o-_{<t} is a typo)."""
import json, torch
torch.set_num_threads(2); torch.set_default_dtype(torch.float64)
D = json.load(open('model/engine_case.json')); NI, NH, NO = D['NI'], D['NH'], D['NO']; L = 3
def feats(a, b, t, o1=None, o2=None):
    x = torch.zeros(NI)
    for i in range(a): x[i] = 1
    for i in range(b): x[9 + i] = 1
    x[18 + t] = 1
    if t >= 1: x[21 + o1] = 1
    if t >= 2: x[31 + o2] = 1
    return x
def unpack(p, nout):
    W1 = p[:NI * NH].view(NI, NH); b1 = p[NI * NH:NI * NH + NH]; W2 = p[NI * NH + NH:NI * NH + NH + NH * nout].view(NH, nout); b2 = p[NI * NH + NH + NH * nout:]
    return W1, b1, W2, b2
def net(p, x, nout):
    W1, b1, W2, b2 = unpack(p, nout); return torch.tanh(x @ W1 + b1) @ W2 + b2
def logp(p, q, o, t): return torch.log_softmax(net(p, feats(q[0], q[1], t, o[0] if t >= 1 else None, o[1] if t >= 2 else None), NO), -1)[o[t]]
res = {}
for m, C in D['cases'].items():
    cfg = C['cfg']; B, G, beta = cfg['batch'], cfg['G'], cfg['beta']
    p = torch.tensor(C['p'], requires_grad=True); ref = torch.tensor(C['ref']); rec = C['rec']
    J = torch.zeros(()); cJ = None
    if m in ('sft', 'rft'):  # Eq. 6 / Eq. 8 (filtered set): mean over examples of (1/|o|) sum_t log pi
        for r in rec: J = J + sum(logp(p, r['q'], r['o'], t) for t in range(L)) / L / len(rec)
    elif m == 'dpo':  # Eq. 12 with per-sequence (1/|o|) normalisation
        for r in rec:
            q = r['q']; s = lambda w, o: sum(logp(w, q, o, t) for t in range(L)) / L
            J = J + torch.nn.functional.logsigmoid(beta * ((s(p, r['yw']) - s(ref, r['yw'])) - (s(p, r['yl']) - s(ref, r['yl'])))) / B
    else:
        crit = torch.tensor(C['critic'], requires_grad=True) if C['critic'] else None
        if crit is not None: cJ = torch.zeros(())
        eps = 0.2
        for r in rec:
            q, os_, R = r['q'], r['os'], r['R']
            Rt = torch.tensor(R, dtype=torch.float64)
            if m == 'onrft': A = [[float(R[i])] * L for i in range(G)]
            elif m in ('grpo', 'drgrpo'):
                mu, sd = Rt.mean(), Rt.std()  # unbiased, as torch.std and the JS engine
                A = [[float(Rt[i] - mu) if m == 'drgrpo' else (float((Rt[i] - mu) / sd) if sd > 0 else 0.0)] * L for i in range(G)]
            elif m == 'grpops':
                S1 = [1.0 if o[0] == (q[0] + q[1]) % 10 else 0.0 for o in os_]; allr = torch.tensor(S1 + [float(x) for x in R]); mu, sd = allr.mean(), allr.std()
                nz = lambda v: float((v - mu) / sd) if sd > 0 else 0.0
                A = [[nz(S1[i]) + nz(R[i]), nz(R[i]), nz(R[i])] for i in range(G)]
            elif m == 'ppo':  # Eq. 2 rewards (per-token KL penalty, outcome reward at the end), GAE(gamma = 1, lambda)
                A = []
                for i, o in enumerate(os_):
                    V = [net(crit, feats(q[0], q[1], t, o[0] if t >= 1 else None, o[1] if t >= 2 else None), 1)[0] for t in range(L)]
                    rt = [float(-beta * (logp(p, q, o, t) - logp(ref, q, o, t)) + (R[i] if t == L - 1 else 0)) for t in range(L)]
                    adv = [0.0] * L; gae = 0.0
                    for t in reversed(range(L)):
                        d = rt[t] + (float(V[t + 1]) if t < L - 1 else 0.0) - float(V[t]); gae = d + cfg['lam'] * gae; adv[t] = gae
                    A.append(adv)
                    for t in range(L): cJ = cJ - 0.5 * (adv[t] + float(V[t]) - V[t]) ** 2 / (L * B * G)  # value loss, return target detached
            for i, o in enumerate(os_):
                for t in range(L):
                    lp = logp(p, q, o, t); ratio = torch.exp(lp - lp.detach())  # pi / pi_old, pi_old = pi (one update per batch)
                    a = A[i][t]
                    term = torch.minimum(ratio * a, torch.clamp(ratio, 1 - eps, 1 + eps) * a)  # Eq. 1 / Eq. 3 clipped surrogate
                    if m in ('grpo', 'grpops', 'drgrpo'):
                        lr_ = logp(ref, q, o, t); k3 = torch.exp(lr_ - lp) - (lr_ - lp) - 1  # Eq. 4
                        term = term - beta * k3
                    if m == 'onrft': term = a * lp  # Eq. 11
                    J = J + term / (L * B * G)
    J.backward(); gt = p.grad; gj = torch.tensor(C["g"])
    err = float((gt - gj).abs().max()); scale = float(gt.abs().max())
    r = {'max_abs_diff': err, 'max_abs_grad': scale}
    if cJ is not None:
        cJ.backward(); cerr = float((crit.grad - torch.tensor(C["cg"])).abs().max()); r['critic_max_abs_diff'] = cerr
    res[m] = r; print('%-7s grad max |diff| %.2e (max |grad| %.2e)%s' % (m, err, scale, ('  critic %.2e' % r['critic_max_abs_diff']) if 'critic_max_abs_diff' in r else ''))
worst = max(max(v['max_abs_diff'], v.get('critic_max_abs_diff', 0)) for v in res.values())
res['verdict'] = 'PASS' if worst < 1e-9 else 'FAIL'; res['worst'] = worst
json.dump(res, open('model/check_engine.json', 'w'), indent=1); print(res['verdict'], worst)
