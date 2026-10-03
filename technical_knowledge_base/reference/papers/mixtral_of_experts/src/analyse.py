"""Section 5 of the paper, repeated on the toy Mixtral: route held-out text from four domains through the
trained model and measure what the paper measured, plus the controls it did not run.

  uv run --with torch --with tokenizers python analyse.py      (after train.py main and noaux)

Writes model/routes.json (all statistics, both variants) and parts/20_route_data.js (window.ROUTES).
Everything is measured on the held-out split (documents never seen in training).

  dist      Figure 7: share of expert selections per domain and layer (first, second, either choice)
  tv        how far each domain's distribution is from the all-domain average (total variation distance)
  rep       Table 5: consecutive tokens with the same first expert, and with overlapping top-2 sets;
            with three baselines: uniform random (12.5%, 46.4%), shuffled order (same tokens and same
            routing, positions permuted: keeps the experts' uneven usage, removes order), and pairs of
            consecutive tokens that are different tokens (removes the trivial "same token twice" case)
  pred      how well the first expert can be predicted from the token alone, the domain alone, or
            nothing (fit on half of the held-out windows, scored on the other half)
  cross     tokens common to several domains: how often their modal expert is the same in every domain
  samples   Figure 8: held-out snippets with every token's top-2 experts and gate weights per layer
"""
import json, os, random, collections
import torch

import train
HERE = os.path.dirname(os.path.abspath(__file__))
DOM = train.DOMAINS
WIN, NWIN = 256, 40


def run(variant):
    from tokenizers import Tokenizer
    torch.set_num_threads(2)
    ck = torch.load(os.path.join(HERE, 'model', 'ck', variant + '.pt'))
    model = train.build_model(); model.load_state_dict(ck['state']); model.eval()
    ids = train.encode_all()
    tok = Tokenizer.from_file(os.path.join(HERE, 'model', 'tokenizer.json'))
    L, n = train.CFG['n_layers'], train.CFG['n_experts']
    R = {}  # domain -> list of windows: (tokens[T], top1[L][T], top2[L][T], w1[L][T])
    loss = {}
    with torch.no_grad():
        for d in DOM:
            t = ids[(d, 'test')]; ws = []; ls = 0
            for k in range(min(NWIN, (len(t) - 1) // WIN)):
                x = t[k * WIN:(k + 1) * WIN + 1]
                logits = model(x[None, :-1])
                ls += torch.nn.functional.cross_entropy(logits[0], x[1:]).item()
                rt = model.routes()
                top1 = [r[1][:, 0].tolist() for r in rt]; top2 = [r[1][:, 1].tolist() for r in rt]
                w1 = [r[2][:, 0].tolist() for r in rt]
                ws.append((x[:-1].tolist(), top1, top2, w1))
            R[d] = ws; loss[d] = round(ls / len(ws), 4)
    out = {'variant': variant, 'step': ck['step'], 'test_loss': loss, 'windows': {d: len(R[d]) for d in DOM},
           'tokens': {d: len(R[d]) * WIN for d in DOM}}

    # dist (Figure 7) and tv
    dist = {}
    for d in DOM:
        dist[d] = []
        for l in range(L):
            c1 = collections.Counter(); c2 = collections.Counter()
            for w in R[d]: c1.update(w[1][l]); c2.update(w[2][l])
            N = sum(c1.values())
            dist[d].append({'first': [round(c1[e] / N, 4) for e in range(n)], 'second': [round(c2[e] / N, 4) for e in range(n)],
                            'either': [round((c1[e] + c2[e]) / (2 * N), 4) for e in range(n)]})
    out['dist'] = dist
    tv = {}
    for l in range(L):
        avg = [sum(dist[d][l]['either'][e] for d in DOM) / len(DOM) for e in range(n)]
        tv[l] = {d: round(0.5 * sum(abs(dist[d][l]['either'][e] - avg[e]) for e in range(n)), 4) for d in DOM}
    out['tv'] = tv
    # pairwise total variation distance between domains (either choice), per layer
    out['tvpair'] = [[[round(0.5 * sum(abs(dist[a][l]['either'][e] - dist[b][l]['either'][e]) for e in range(n)), 4)
                       for b in DOM] for a in DOM] for l in range(L)]

    # noise floor: the same domain's even windows against its odd windows
    def share(ws, l):
        c = collections.Counter()
        for w in ws: c.update(w[1][l]); c.update(w[2][l])
        N = sum(c.values()); return [c[e] / N for e in range(n)]
    out['tvself'] = [{d: round(0.5 * sum(abs(a - b) for a, b in zip(share(R[d][0::2], l), share(R[d][1::2], l))), 4) for d in DOM} for l in range(L)]

    # rep (Table 5) with controls
    rng = random.Random(5); rep = {}
    for d in DOM:
        rep[d] = []
        for l in range(L):
            s1 = s2 = cnt = 0; d1 = d2 = dc = 0; h1 = h2 = hc = 0
            for toks, t1, t2, _ in R[d]:
                a1, a2 = t1[l], t2[l]
                for i in range(len(toks) - 1):
                    same1 = a1[i] == a1[i + 1]; ov = len({a1[i], a2[i]} & {a1[i + 1], a2[i + 1]}) > 0
                    s1 += same1; s2 += ov; cnt += 1
                    if toks[i] != toks[i + 1]: d1 += same1; d2 += ov; dc += 1
                # shuffled control: permute positions within the window, keep each token's own routing
                perm = list(range(len(toks))); rng.shuffle(perm)
                b1 = [a1[p] for p in perm]; b2 = [a2[p] for p in perm]
                for i in range(len(toks) - 1):
                    h1 += b1[i] == b1[i + 1]; h2 += len({b1[i], b2[i]} & {b1[i + 1], b2[i + 1]}) > 0; hc += 1
            rep[d].append({'first': round(s1 / cnt, 4), 'either': round(s2 / cnt, 4),
                           'first_shuf': round(h1 / hc, 4), 'either_shuf': round(h2 / hc, 4),
                           'first_difftok': round(d1 / dc, 4), 'either_difftok': round(d2 / dc, 4), 'pairs': cnt, 'difftok_pairs': dc})
    out['rep'] = rep

    # pred: first expert from token, from domain, from nothing (fit on even windows, score on odd)
    pred = []
    for l in range(L):
        ft = collections.defaultdict(collections.Counter); fd = collections.defaultdict(collections.Counter); fa = collections.Counter()
        for d in DOM:
            for k, (toks, t1, _, _) in enumerate(R[d]):
                if k % 2: continue
                for tkn, e in zip(toks, t1[l]): ft[tkn][e] += 1; fd[d][e] += 1; fa[e] += 1
        mt = {t: c.most_common(1)[0][0] for t, c in ft.items()}; md = {d: c.most_common(1)[0][0] for d, c in fd.items()}
        ma = fa.most_common(1)[0][0]
        ht = hd = ha = N = seen = 0
        for d in DOM:
            for k, (toks, t1, _, _) in enumerate(R[d]):
                if not k % 2: continue
                for tkn, e in zip(toks, t1[l]):
                    N += 1; ha += e == ma; hd += e == md[d]
                    if tkn in mt: seen += 1; ht += e == mt[tkn]
                    else: ht += e == md[d]          # unseen token: fall back to the domain's guess
        pred.append({'token': round(ht / N, 4), 'domain': round(hd / N, 4), 'none': round(ha / N, 4), 'n': N, 'seen': round(seen / N, 4)})
    out['pred'] = pred

    # cross: tokens frequent (>= 20 times) in at least 3 domains; share whose modal first expert agrees across them
    cross = []
    for l in range(L):
        per = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
        for d in DOM:
            for toks, t1, _, _ in R[d]:
                for tkn, e in zip(toks, t1[l]): per[tkn][d][e] += 1
        agree = tot = 0; ex = []
        for tkn, dd in per.items():
            ok = {d: c for d, c in dd.items() if sum(c.values()) >= 20}
            if len(ok) < 3: continue
            modes = {d: c.most_common(1)[0][0] for d, c in ok.items()}
            tot += 1; same = len(set(modes.values())) == 1; agree += same
            ex.append((sum(sum(c.values()) for c in ok.values()), tok.decode([tkn]), modes, same))
        ex.sort(key=lambda z: -z[0])
        cross.append({'tokens': tot, 'agree': agree, 'share': round(agree / max(1, tot), 4),
                      'top': [{'t': e[1], 'modes': e[2], 'same': e[3]} for e in ex[:12]]})
    out['cross'] = cross

    # samples for Figure 8: three snippets per domain, 96 tokens each, from fixed held-out windows
    samples = {}
    for d in DOM:
        samples[d] = []
        for k in (1, 7, 13):
            k = min(k, len(R[d]) - 1)
            toks, t1, t2, w1 = R[d][k]; a = 24; b = a + 96
            samples[d].append({'t': [tok.decode([x]) for x in toks[a:b]],
                               'e1': [''.join(str(v) for v in t1[l][a:b]) for l in range(L)],
                               'e2': [''.join(str(v) for v in t2[l][a:b]) for l in range(L)],
                               'w1': [''.join(str(min(9, int((v - 0.5) * 20))) for v in w1[l][a:b]) for l in range(L)]})
    out['samples'] = samples
    return out


if __name__ == '__main__':
    res = {}
    for v in ('main', 'noaux'):
        if os.path.exists(os.path.join(HERE, 'model', 'ck', v + '.pt')):
            res[v] = run(v); print(v, 'done', res[v]['test_loss'])
    for v, r in res.items():
        log = open(os.path.join(HERE, 'model', 'train_%s.log' % v)).read().split('\n')
        r['curve'] = [[int(x.split()[1]), float(x.split()[3])] for x in log if x.startswith('step ')]
        r['evals'] = [[int(x.split()[1]), json.loads(x.split(' ', 2)[2])] for x in log if x.startswith('eval ')]
        r['params'] = int(log[0].split()[5])
        done = [x for x in log if x.startswith('done ')]
        r['sec'] = int(done[-1].split()[1]) if done else None
    meta = json.load(open(os.path.join(HERE, 'model', 'data', 'meta.json')))
    ids = train.encode_all()
    res['_meta'] = {'cfg': train.CFG, 'corpus': meta, 'win': WIN, 'train_tokens': sum(len(ids[(d, 'train')]) for d in DOM)}
    json.dump(res, open(os.path.join(HERE, 'model', 'routes.json'), 'w'), indent=0)
    open(os.path.join(HERE, 'parts', '20_route_data.js'), 'w').write(
        '// Generated by analyse.py from the toy Mixtral (train.py) on held-out text. Do not edit.\nwindow.ROUTES=' +
        json.dumps(res, separators=(',', ':'), ensure_ascii=False) + ';\n')
    for v, r in res.items():
        if v.startswith('_'): continue
        print('==', v)
        for l in range(4):
            print(' layer', l, 'tv', r['tv'][l], 'pred', r['pred'][l], 'cross', r['cross'][l]['share'], r['cross'][l]['tokens'])
            print('   rep', {d: (r['rep'][d][l]['first'], r['rep'][d][l]['first_shuf'], r['rep'][d][l]['first_difftok'], r['rep'][d][l]['either'], r['rep'][d][l]['either_shuf']) for d in DOM})
