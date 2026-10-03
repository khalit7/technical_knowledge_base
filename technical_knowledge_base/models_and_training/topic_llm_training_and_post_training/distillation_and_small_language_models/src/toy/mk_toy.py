"""Collect the toy experiment for the page: ../inputs/toy.json.

  uv run --no-project --with torch --with numpy python mk_toy.py

Reads runs/*.json (curves) and runs/*.pt (checkpoints), and samples from the shipped checkpoints:
  graph       nodes, edges and a layout (classical MDS on shortest-path distances, then a short spring layout to separate nodes; deterministic)
  teacher     size and quality (success, distinct routes, KL to the exact data policy)
  curves      per method and seed: success at temperature 1, greedy success, distinct correct routes in 8 samples,
              reverse KL on own routes, forward KL on the teacher's routes, failure reasons, and compute
  compute     model FLOPs per step, counted as 6 x N per trained token (student), 2 x N per scored token (teacher)
              and 2 x N per generated token (whoever writes the routes); attention FLOPs ignored (sequences are short)
  samples     8 routes per showcase prompt from each method's checkpoints (seed 1) and from the teacher
  anim        one prompt, one partly trained student (sft, seed 1, step 300): a route written by the teacher and one
              written by the student, with both models' next-token distributions at every position
"""
import json, math, os, random
import numpy as np
import torch
import torch.nn.functional as F
import world as W
import train as T

HERE = T.HERE; RUNS = T.OUT
torch.manual_seed(0)
out = dict(checks=[])

# ---- graph and layout ----
D = np.array([[W.DIST[t][s] for t in range(W.N)] for s in range(W.N)], dtype=float)
J = np.eye(W.N) - 1.0 / W.N
B = -0.5 * J @ (D ** 2) @ J
vals, vecs = np.linalg.eigh(B)
idx = np.argsort(vals)[::-1][:2]
XY = vecs[:, idx] * np.sqrt(vals[idx])
XY = (XY - XY.min(0)) / (XY.max(0) - XY.min(0))
# spread overlapping nodes: a few hundred steps of a spring layout started from the MDS positions
# (neighbours pulled to a common length, every pair pushed apart), then rescaled to the unit square
for it in range(600):
    d = XY[:, None, :] - XY[None, :, :]
    r = np.sqrt((d ** 2).sum(-1)) + np.eye(W.N)
    f = (d / r[..., None] ** 3 * 0.0006).sum(1)
    for u in range(W.N):
        for w in W.ADJ[u]:
            v = XY[w] - XY[u]; L = np.linalg.norm(v)
            f[u] += v * (L - 0.16) * 0.08
    XY = XY + np.clip(f, -0.01, 0.01)
XY = (XY - XY.min(0)) / (XY.max(0) - XY.min(0))
edges = sorted({(min(u, w), max(u, w)) for u in range(W.N) for w in W.ADJ[u]})
out['graph'] = dict(n=W.N, names=W.NAMES, xy=[[round(float(a), 4), round(float(b), 4)] for a, b in XY], edges=edges,
                    slack=W.SLACK, pairs=len(W.PAIRS), maxans=W.MAXANS,
                    routes_median=float(np.median([W.count(s, W.budget(s, t), t) for s, t in W.PAIRS])))

# ---- teacher ----
teacher = T.load_teacher()
tj = json.load(open(os.path.join(RUNS, 'teacher.json')))
ev = T.evaluate(teacher, seed=7)
rng = random.Random(5)
gen = torch.Generator().manual_seed(5)
pairs = [rng.choice(W.PAIRS) for _ in range(400)]
routes = T.sample(teacher, pairs, gen=gen)
kl_exact = T.kl_to_exact(teacher, pairs, routes)
out['teacher'] = dict(cfg=T.TCFG, params=tj['params'], succ=ev['succ'], greedy=ev['greedy'], distinct=ev['distinct'], kl_exact=round(kl_exact, 4),
                      log=tj['log'])
out['checks'].append(f"teacher: {tj['params']:,} parameters, success {ev['succ']:.1%} at T=1, greedy {ev['greedy']:.1%}, KL to the exact policy {kl_exact:.3f} nats/token")

# ---- curves ----
NS = T.nparams(T.LM(**T.SCFG)); NT = tj['params']
out['student'] = dict(cfg=T.SCFG, params=NS, steps=T.STEPS, batch=T.BATCH, lr=T.LR)
curves = {}
for m in T.METHODS:
    for seed in (1, 2, 3):
        p = os.path.join(RUNS, f'{m}_{seed}.json')
        if not os.path.exists(p):
            continue
        L = json.load(open(p))['log']
        rows = []
        for e in L:
            rows.append([e['step'], e['succ'], e['greedy'], e['distinct'], e['rkl_own'], e['fkl_teach'],
                         e['student_tokens'], e['teacher_tokens'], e['sampled_tokens'],
                         {k: v for k, v in e['reasons'].items() if k != 'ok'}])
        curves.setdefault(m, {})[seed] = rows


for m, bys in curves.items():
    for seed, rows in bys.items():
        for r in rows:
            st, tt, sa = r[6], r[7], r[8]
            if m in ('fkl_on', 'rkl_on'):
                g = 2 * NS * sa
            elif m == 'sft_on':
                # before the switch the teacher wrote; after, the student. Token counts are cumulative, so split
                # by the share of steps on each side (the per-step token count is close to constant).
                half = T.STEPS // 2
                f_t = min(r[0], half) / r[0] if r[0] else 1.0
                g = 2 * NT * sa * f_t + 2 * NS * sa * (1 - f_t)
            else:
                g = 2 * NT * sa
            r.append(6 * NS * st + 2 * NT * tt + g)
out['curves'] = curves
out['curve_cols'] = ['step', 'succ', 'greedy', 'distinct', 'rkl_own', 'fkl_teach', 'student_tokens', 'teacher_tokens', 'sampled_tokens', 'fails', 'flops']

# final means and spreads
summ = {}
for m, bys in curves.items():
    fin = [rows[-1] for rows in bys.values()]
    def ms(i):
        v = [f[i] for f in fin]; mu = sum(v) / len(v)
        sd = math.sqrt(sum((x - mu) ** 2 for x in v) / (len(v) - 1)) if len(v) > 1 else 0
        return [round(mu, 4), round(sd, 4), round(min(v), 4), round(max(v), 4)]
    summ[m] = dict(n=len(fin), succ=ms(1), greedy=ms(2), distinct=ms(3), rkl=ms(4), fkl=ms(5), flops=ms(10))
    out['checks'].append(f"{m}: final success {summ[m]['succ'][0]:.1%} (sd {summ[m]['succ'][1]:.1%}, {len(fin)} seeds), greedy {summ[m]['greedy'][0]:.1%}, distinct {summ[m]['distinct'][0]:.2f}, rkl {summ[m]['rkl'][0]:.3f}, fkl {summ[m]['fkl'][0]:.3f}, flops {summ[m]['flops'][0]:.2e}")
out['summary'] = summ

# ---- samples from checkpoints ----
SHOW = []
rs = random.Random(11)
cand = [p for p in W.PAIRS if W.DIST[p[1]][p[0]] >= 3 and W.count(p[0], W.budget(*p), p[1]) >= 8]
rs.shuffle(cand)
SHOW = cand[:6]
CK = [0, 150, 300, 600, 1200, T.STEPS]


def routes_of(model, prs, k=8, seed=3):
    g = torch.Generator().manual_seed(seed)
    res = [[] for _ in prs]
    for _ in range(k):
        o = T.sample(model, prs, gen=g)
        for i, r in enumerate(o):
            res[i].append([r, W.check(prs[i][0], prs[i][1], r)[1]])
    return res


samples = dict(prompts=SHOW, teacher=routes_of(teacher, SHOW), ck=CK, methods={})
for m in T.METHODS:
    p = os.path.join(RUNS, f'{m}_1.pt')
    if not os.path.exists(p):
        continue
    cks = torch.load(p)
    samples['methods'][m] = {}
    for c in CK:
        if c not in cks:
            continue
        st = T.LM(**T.SCFG); st.load_state_dict(cks[c]); st.eval()
        samples['methods'][m][c] = routes_of(st, SHOW)
out['samples'] = samples

# ---- animation data: one prompt, teacher's route against the student's own route ----
cks = torch.load(os.path.join(RUNS, 'sft_1.pt'))
stu = T.LM(**T.SCFG); stu.load_state_dict(cks[300]); stu.eval()


@torch.no_grad()
def dists(model, s, t, route):
    x, _ = T.encode([(s, t)], [route])
    p = F.softmax(model(x[:, :-1])[0], -1)
    return [p[2 + k] for k in range(len(route) + 1)]


def compact(pv, keep):
    return {int(i): round(float(pv[i]), 4) for i in keep}


best = None
g = torch.Generator().manual_seed(21)
for (s, t) in cand[:200]:
    tr = T.sample(teacher, [(s, t)], gen=g)[0]
    if not W.check(s, t, tr)[0]:
        continue
    for _ in range(12):
        sr = T.sample(stu, [(s, t)], gen=g)[0]
        ok, why = W.check(s, t, sr)
        # want: the student's route leaves the teacher's route early and then goes wrong (a detour or a missing edge)
        if not ok and 2 <= len(sr) < W.MAXANS and sr[0] != tr[0] and why in ('no such edge', 'too long', 'never arrived'):
            best = (s, t, tr, sr, why); break
    if best:
        break
s, t, tr, sr, why = best
anim = dict(s=s, t=t, budget=W.budget(s, t), dist=W.DIST[t][s], ckpt='sft, seed 1, step 300', why=why, routes={})
for name, route in (('teacher', tr), ('student', sr)):
    pt, ps = dists(teacher, s, t, route), dists(stu, s, t, route)
    pos = []
    for k in range(len(route) + 1):
        nxt = route[k] if k < len(route) else W.EOS
        keep = sorted({i for i in range(W.N + 2) if float(pt[k][i]) > 0.02 or float(ps[k][i]) > 0.02} | {nxt})
        ex = W.exact_policy(s, t, list(route[:k]))
        fkl = float((pt[k] * (pt[k].clamp_min(1e-12).log() - ps[k].clamp_min(1e-12).log())).sum())
        rkl = float((ps[k] * (ps[k].clamp_min(1e-12).log() - pt[k].clamp_min(1e-12).log())).sum())
        pos.append(dict(at=(route[k - 1] if k else s), next=nxt, t=compact(pt[k], keep), s=compact(ps[k], keep),
                        exact=None if ex is None else {int(a): round(b, 4) for a, b in ex.items()},
                        fkl=round(fkl, 4), rkl=round(rkl, 4), ce=round(-math.log(max(1e-12, float(ps[k][nxt]))), 4),
                        valid_edge=(k == len(route) or route[k] in W.ADJ[route[k - 1] if k else s])))
    anim['routes'][name] = dict(route=route, ok=W.check(s, t, route)[0], why=W.check(s, t, route)[1], pos=pos)
out['anim'] = anim
out['checks'].append(f"anim prompt {W.NAMES[s]} to {W.NAMES[t]}: teacher {[W.NAMES[v] for v in tr]}, student {[W.NAMES[v] for v in sr]} ({why})")
json.dump(out, open(os.path.join(HERE, '..', 'inputs', 'toy.json'), 'w'), separators=(',', ':'))
print('\n'.join(out['checks']))
print('bytes', os.path.getsize(os.path.join(HERE, '..', 'inputs', 'toy.json')))
