"""The paper's two count-based monitors (Appendix F.2 robust z-score, F.3 peer-fit) and its metrics
(Section 2: R@K/day, budget-AUC; AUROC), run on inputs/features_<split>.json. Pure Python.
The same arithmetic is ported to the page's JavaScript (parts/12_js_audit.js); check_js.mjs compares them."""
import json, statistics

def load(split='gpt53_single_day'):
    return json.load(open('inputs/features_%s.json' % split))

def vec(n, raw):
    """Appendix F.1 normalisation: counts divided by the day's events; after_hours_rate = after-hours events / n;
    email_external_send_ratio = external sends / sends (0 when no sends)."""
    v = [x / max(n, 1) for x in raw]
    v[5] = raw[5] / raw[3] if raw[3] else 0.0
    return v

def split_days(F, n_train=12, n_val=3):
    days = sorted({r[1] for r in F['rows']})
    return days[:n_train], days[n_train:n_train + n_val], days[n_train + n_val:]

def fit(vecs, active=None):
    """median and 1.4826 MAD per feature (floored at 1e-6)."""
    cols = list(zip(*vecs))
    med = [statistics.median(c) for c in cols]
    sc = [max(1.4826 * statistics.median([abs(x - m) for x in c]), 1e-6) for c, m in zip(cols, med)]
    return med, sc

def score(v, med, sc, use=None):
    idx = range(len(v)) if use is None else use
    d = [min(abs(v[j] - med[j]) / sc[j], 8.0) for j in idx]
    return sum(d) / len(d) if d else 0.0

def positives(F, executed_only=True):
    ok = ('executed',) if executed_only else ('executed', 'attempted')
    return {(a, d) for a, d, sc, o in F['labels'] if o in ok}

def train_rows(F, train_days, policy='routine'):
    """policy 'routine': the paper's B (routine-only account-days of training accounts);
    'all': the released code's default ('realistic': every training-period account-day of a non-holdout account)."""
    hold = set(F['holdout']); td = set(train_days)
    attack_days = {(a, d) for a, d, sc, o in F['labels']}
    out = []
    for a, d, n, raw in F['rows']:
        v = vec(n, raw)
        if d not in td or a in hold: continue
        if policy == 'routine' and (a, d) in attack_days: continue
        out.append((a, d, v))
    return out

def run(F, monitor='z', policy='routine', use=None, exclude_collusion=True, n_train=12, n_val=3):
    tr, va, te = split_days(F, n_train, n_val)
    rows = train_rows(F, tr, policy)
    if monitor == 'z':
        med, sc = fit([v for a, d, v in rows])
        prof = lambda a: (med, sc)
    else:
        gl = fit([v for a, d, v in rows])
        byg = {}
        for a, d, v in rows: byg.setdefault(F['group'].get(a, '_global'), []).append(v)
        P = {g: fit(vs) for g, vs in byg.items()}
        prof = lambda a: P.get(F['group'].get(a, '_global'), gl)
    excl = set(F['collusion']) if exclude_collusion else set()
    ted = set(te)
    scored = [(a, d, score(vec(n, raw), *prof(a), use=use)) for a, d, n, raw in F['rows'] if d in ted and a not in excl]
    pos = {k for k in positives(F) if k[1] in ted and k[0] not in excl}
    return scored, pos

def recall_at(scored, pos, K):
    by = {}
    for a, d, s in scored: by.setdefault(d, []).append((s, a))
    caught = 0
    for d, items in by.items():
        # stable sort on score only, as the released code does (ties keep input order: account name order)
        items = sorted(items, key=lambda t: -t[0])
        caught += sum(1 for s, a in items[:K] if (a, d) in pos)
    return caught / len(pos) if pos else 0.0, caught

def budget_auc(scored, pos):
    return sum(recall_at(scored, pos, k)[0] for k in range(1, 11)) / 10

def auroc(scored, pos):
    p = [s for a, d, s in scored if (a, d) in pos]; n = [s for a, d, s in scored if (a, d) not in pos]
    if not p or not n: return float('nan')
    allv = sorted([(s, 1) for s in p] + [(s, 0) for s in n])
    # rank-sum with average ranks for ties
    ranks = {}; i = 0
    while i < len(allv):
        j = i
        while j < len(allv) and allv[j][0] == allv[i][0]: j += 1
        for k in range(i, j): ranks.setdefault(allv[k][0], (i + j + 1) / 2)
        i = j
    rp = sum(ranks[s] for s in p)
    return (rp - len(p) * (len(p) + 1) / 2) / (len(p) * len(n))
