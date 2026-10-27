"""Recompute the paper's evaluation numbers (Tables 1, 6, 7, 12, 13 and §5.3, §6.2) from the released judgments
(inputs/eval_compact.json, written by fetch_eval.py), and add what the paper did not report: confidence intervals
from resampling prompts. Writes inputs/eval_recompute.json.

  python3 recompute_eval.py            (stdlib only; about a minute)

Elo as §5.2 describes it: every labelled comparison is one match, start at 1,000, K = 32, a tie scores 0.5; the
matches are shuffled and replayed 10,000 times with different seeds and the final ratings averaged. The paper's
"95% CI" is read as 1.96 standard errors of that mean over orderings (the only reading that gives ±1).
Unparsed GPT-4 verdicts (score -1 in the released files) are dropped, as the paper's pipeline would.
"""
import json, math, os, random, statistics as st
# Usage note: the human tournament uses one match per HIT (majority of three), see matches_human.

HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'inputs', 'eval_compact.json')))
VQ = E['vicuna_qids']


def matches_gpt4(bench, systems=None):
    d = E['gpt4_vicuna_pairwise' if bench == 'vicuna' else 'gpt4_oa_pairwise']
    out = []  # (prompt index, a, b, score of a)
    for k, v in d.items():
        a, b = k.split('|')
        if systems and (a not in systems or b not in systems): continue
        for i, c in enumerate(v):
            if c == '1': out.append((i, a, b, 1.0))
            elif c == '2': out.append((i, a, b, 0.0))
            elif c == '3': out.append((i, a, b, 0.5))
    return out


def matches_human(per_vote=False):
    """One match per HIT, decided by the majority of its three workers (no majority = tie), which comes closest to
    Table 7; per_vote=True makes every worker's answer a match instead."""
    out = []
    for q, a, b, votes in E['human_vicuna']:
        i = VQ.index(q)
        if per_vote:
            for v in votes: out.append((i, a, b, {'a': 1.0, 'b': 0.0, 't': 0.5}[v]))
        else:
            c = max('abt', key=votes.count)
            if votes.count(c) < 2: c = 't'
            out.append((i, a, b, {'a': 1.0, 'b': 0.0, 't': 0.5}[c]))
    return out


def elo_once(ms, rnd, K=32):
    R = {}
    order = list(range(len(ms))); rnd.shuffle(order)
    for j in order:
        _, a, b, s = ms[j]
        ra, rb = R.get(a, 1000.0), R.get(b, 1000.0)
        ea = 1 / (1 + 10 ** ((rb - ra) / 400))
        R[a] = ra + K * (s - ea); R[b] = rb - K * (s - ea)
    return R


def elo(ms, n=10000, seed=0, K=32):
    rnd = random.Random(seed)
    runs = [elo_once(ms, rnd, K) for _ in range(n)]
    sysn = sorted(runs[0])
    res = {}
    for s in sysn:
        xs = [r[s] for r in runs]
        m = st.fmean(xs); sd = st.pstdev(xs)
        res[s] = {'mean': m, 'sd_over_orderings': sd, 'ci95_of_mean': 1.96 * sd / math.sqrt(n)}
    return res


def boot_prompts(ms, nprompts, B=200, n_order=20, seed=1, K=32):
    """Resample prompts with replacement (all matches of a drawn prompt come along), recompute mean Elo over
    n_order orderings; the spread over B resamples is the prompt-sampling uncertainty the paper's CI leaves out."""
    rnd = random.Random(seed)
    by = {}
    for m in ms: by.setdefault(m[0], []).append(m)
    keys = sorted(by)
    out = {}
    for _ in range(B):
        pick = [rnd.choice(keys) for _ in range(nprompts)]
        sub = [m for k in pick for m in by[k]]
        runs = [elo_once(sub, rnd, K) for _ in range(n_order)]
        for s in runs[0]:
            out.setdefault(s, []).append(st.fmean(r[s] for r in runs))
    res = {}
    for s, xs in out.items():
        xs.sort()
        res[s] = {'lo': xs[int(0.025 * len(xs))], 'hi': xs[int(0.975 * len(xs)) - 1], 'sd': st.pstdev(xs)}
    return res


def ranks(d):
    order = sorted(d, key=lambda s: -d[s])
    return {s: i + 1 for i, s in enumerate(order)}


def spearman(r1, r2):
    ks = sorted(r1)
    n = len(ks)
    return 1 - 6 * sum((r1[k] - r2[k]) ** 2 for k in ks) / (n * (n * n - 1))


def kendall(r1, r2):
    ks = sorted(r1); c = d = 0
    for i in range(len(ks)):
        for j in range(i + 1, len(ks)):
            x = (r1[ks[i]] - r1[ks[j]]) * (r2[ks[i]] - r2[ks[j]])
            c += x > 0; d += x < 0
    return (c - d) / (c + d)


def relative():
    """Table 6: GPT-4's 10-point scores of the system's answer and ChatGPT's, totalled over the 80 prompts, as a
    percentage of ChatGPT's total, with ChatGPT shown first and with the system shown first. The paper's Mean column
    is reproduced by pooling both orders (total of the system's scores over total of ChatGPT's), not by averaging the
    two percentages. Its 95% CI is not specified; ours is a bootstrap over prompts (both orders of a prompt together)."""
    out = {}
    rnd = random.Random(2)
    for s, v in E['gpt4_vicuna_relative'].items():
        row = {}
        for order in ('chatgpt_first', 'system_first'):
            if order not in v: continue
            sc = [p for p in v[order]['scores'] if p]
            row[order] = 100 * sum(p[1] for p in sc) / sum(p[0] for p in sc)
            row[order + '_n'] = len(sc)
        if 'chatgpt_first' in row and 'system_first' in row:
            A = {q: p for q, p in zip(v['chatgpt_first']['qids'], v['chatgpt_first']['scores']) if p}
            Bd = {q: p for q, p in zip(v['system_first']['qids'], v['system_first']['scores']) if p}
            allp = list(A.values()) + list(Bd.values())
            row['mean_pooled'] = 100 * sum(p[1] for p in allp) / sum(p[0] for p in allp)
            row['mean_of_two'] = (row['chatgpt_first'] + row['system_first']) / 2
            qs = sorted(set(A) | set(Bd))
            bs = []
            for _ in range(2000):
                pick = [rnd.choice(qs) for _ in qs]
                ps = [A[q] for q in pick if q in A] + [Bd[q] for q in pick if q in Bd]
                bs.append(100 * sum(p[1] for p in ps) / sum(p[0] for p in ps))
            bs.sort()
            row['boot_lo'] = bs[50]; row['boot_hi'] = bs[1949]
        out[s] = row
    return out


def pairwise_table12():
    """Table 12: (# x better than y - # y better than x) / total judgments, over both orders, GPT-4 on Vicuna."""
    d = E['gpt4_vicuna_pairwise']
    sysn = sorted({k.split('|')[0] for k in d})
    T = {}
    for x in sysn:
        for y in sysn:
            if x == y: continue
            w = l = t = 0
            for k, first in ((x + '|' + y, True), (y + '|' + x, False)):
                for c in d.get(k, ''):
                    if c == '3': t += 1
                    elif c in '12':
                        xwins = (c == '1') == first
                        w += xwins; l += not xwins
            T[x + '|' + y] = {'net': (w - l) / (w + l + t), 'w': w, 'l': l, 't': t}
    return T


def order_effect():
    """How often GPT-4 picks the answer shown first, Vicuna pairwise, over all decided verdicts."""
    d = E['gpt4_vicuna_pairwise']
    f = s = t = 0
    for v in d.values():
        f += v.count('1'); s += v.count('2'); t += v.count('3')
    # consistency: for each unordered pair and prompt, does the verdict survive swapping the order?
    same = flip = 0
    for k, v in d.items():
        a, b = k.split('|')
        if a > b: continue
        w = d[b + '|' + a]
        for c1, c2 in zip(v, w):
            if c1 in '12' and c2 in '12':
                if (c1 == '1') == (c2 == '2'): same += 1
                else: flip += 1
    return {'first': f, 'second': s, 'tie': t, 'consistent_decided_pairs': same, 'flipped_decided_pairs': flip}


def fleiss(items):
    """Fleiss' kappa for items with the same number of raters; categories a, b, t."""
    cats = 'abt'
    n = len(items[0])
    N = len(items)
    pj = {c: sum(it.count(c) for it in items) / (N * n) for c in cats}
    Pi = [(sum(it.count(c) ** 2 for c in cats) - n) / (n * (n - 1)) for it in items]
    Pbar = sum(Pi) / N; Pe = sum(v * v for v in pj.values())
    return (Pbar - Pe) / (1 - Pe)


def agreement():
    hum = [h for h in E['human_vicuna'] if len(h[3]) == 3]
    k_h = fleiss([h[3] for h in hum])
    # GPT-4 vs human majority, per HIT: map GPT-4's verdict for the same (prompt, ordered pair) to a/b/t
    d = E['gpt4_vicuna_pairwise']
    pairs = []
    for q, a, b, votes in hum:
        i = VQ.index(q)
        v = d.get(a + '|' + b)
        if v is None: continue
        c = v[i]
        if c not in '123': continue
        g = {'1': 'a', '2': 'b', '3': 't'}[c]
        maj = max('abt', key=lambda x: votes.count(x))
        if votes.count(maj) < 2: maj = 't'
        pairs.append(maj + g)
    k_g = fleiss(pairs)
    agree = sum(p[0] == p[1] for p in pairs) / len(pairs)
    return {'fleiss_humans': k_h, 'hits': len(hum), 'fleiss_gpt4_vs_majority': k_g, 'gpt4_majority_raw_agreement': agree, 'n_pairs': len(pairs)}


def main():
    out = {}
    V8 = ['gpt4', 'guanaco-65b', 'guanaco-33b', 'gpt35', 'vicuna-13b', 'guanaco-13b', 'guanaco-7b', 'bard']
    for key, ms, npr in (('gpt4_vicuna', matches_gpt4('vicuna'), 80), ('gpt4_oa', matches_gpt4('oa'), 953), ('human_vicuna', matches_human(), 80)):
        e = elo(ms, n=10000 if key != 'gpt4_oa' else 2000)
        b = boot_prompts(ms, npr, B=200 if key != 'gpt4_oa' else 60, n_order=10)
        out['elo_' + key] = {'n_matches': len(ms), 'elo': e, 'boot': b}
        print(key, len(ms), {s: (round(e[s]['mean']), round(e[s]['ci95_of_mean'], 2), round(b[s]['lo']), round(b[s]['hi'])) for s in sorted(e, key=lambda s: -e[s]['mean'])}, flush=True)
    rh = ranks({s: out['elo_human_vicuna']['elo'][s]['mean'] for s in V8})
    rg = ranks({s: out['elo_gpt4_vicuna']['elo'][s]['mean'] for s in V8})
    # the paper's own Table 7 ranks
    t7h = {'gpt4': 1, 'guanaco-65b': 2, 'guanaco-33b': 4, 'gpt35': 7, 'vicuna-13b': 5, 'guanaco-13b': 6, 'guanaco-7b': 3, 'bard': 8}
    t7g = {'gpt4': 1, 'guanaco-65b': 2, 'guanaco-33b': 3, 'gpt35': 5, 'vicuna-13b': 4, 'guanaco-13b': 6, 'guanaco-7b': 8, 'bard': 7}
    out['rank_agreement'] = {'ours': {'spearman': spearman(rh, rg), 'kendall': kendall(rh, rg), 'human_ranks': rh, 'gpt4_ranks': rg},
                             'table7': {'spearman': spearman(t7h, t7g), 'kendall': kendall(t7h, t7g)}}
    out['relative'] = relative()
    out['table12'] = pairwise_table12()
    out['order_effect'] = order_effect()
    out['agreement'] = agreement()
    print(json.dumps({k: out[k] for k in ('rank_agreement', 'order_effect', 'agreement')}, indent=0))
    print({s: {k: round(v, 1) for k, v in r.items() if isinstance(v, float)} for s, r in out['relative'].items() if s.startswith(('guanaco', 'vicuna', 'gpt4', 'bard', 'alpaca-65', 'huggingchat'))})
    json.dump(out, open(os.path.join(HERE, 'inputs', 'eval_recompute.json'), 'w'), indent=0)


if __name__ == '__main__':
    main()
