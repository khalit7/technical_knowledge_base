"""Recompute every number this page derives from the QORL article (and its repository), and the toy's exact values.

  python3 src/recompute.py        (from the page folder; writes src/inputs/recompute.json, which check_page.mjs reads)

1. The no-op fooling rate on job-13b. The 20 measured runs of job-13b at 128 MB shared_buffers are the article's own
   (the data-ms values of its median-draw figure, read 27 November 2026). A no-op candidate is the default plan timed
   again, so candidate and default timings are drawn from the same 20 runs: k runs for the candidate, k other runs for
   the default (without replacement, as the article's figure draws them), each side's median taken, and the comparison
   "fooled" when |ln(median_default / median_candidate)| > z (the article's tie zone, z = 0.05, about 5%).
   Exact, no sampling: enumerate the candidate's k-subsets; for each, the default's median is the r-th of the 20 - k
   remaining runs with probability C(r, h) C(m - 1 - r, h) / C(m, k), h = (k - 1) / 2.
   Self-tests: k = 3, z = 0.05 gives 307,392 of 775,200 ordered draws = 39.65% (the article's caption: "~40%");
   230 of the C(20, 3) = 1,140 triples have a median in the slow clump (the article's text: "230 of them").
   The author's own metric (sliding windows of six consecutive runs, three interleaved pairs, both roles in each pair:
   15 x 8 = 120 cases) is also computed for job-13b: it depends on run order, the random draws do not.
2. The four-rollout example under prime-rl GRPO and under the anchored variant (the article's two tables).
3. Headline arithmetic: 1.81x and 44.7% are one measurement stated two ways (1 - 1/1.8075), and the metric example.
"""
import itertools, json, math, os
from math import comb

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = [186.2, 188.8, 233.9, 202.2, 227, 201.5, 250.2, 202.2, 247.2, 200, 202.6, 252.8, 251.5, 202.5, 200.7, 201.6,
        200.9, 199.4, 199.4, 204.1]  # job-13b, 128 MB shared_buffers, in the order they ran (the article's figure)
S = sorted(RUNS)
N = len(S)


def joint(k):
    """P(candidate median = S[i], default median = S[j]) for k runs a side drawn without replacement"""
    h, J, n1 = (k - 1) // 2, [[0.0] * N for _ in range(N)], comb(N, k)
    for c in itertools.combinations(range(N), k):
        rest = [i for i in range(N) if i not in c]
        m = len(rest)
        for r in range(m):
            p = comb(r, h) * comb(m - 1 - r, h) / comb(m, k)
            if p:
                J[c[h]][rest[r]] += p / n1
    return J


def fooled(J, z):
    win = sum(J[i][j] for i in range(N) for j in range(N) if math.log(S[j] / S[i]) > z)   # default slower: a phantom win
    loss = sum(J[i][j] for i in range(N) for j in range(N) if math.log(S[j] / S[i]) < -z)
    return win, loss


out = {'runs': RUNS, 'fool': {}}
for k in (1, 3, 5, 7):
    J = joint(k)
    out['fool'][str(k)] = {('%.3f' % (z / 1000)): [round(x, 6) for x in fooled(J, z / 1000)] for z in range(0, 151, 5)}
w, l = fooled(joint(3), 0.05)
assert abs(w + l - 307392 / 775200) < 1e-9, w + l
slow_triples = sum(1 for c in itertools.combinations(range(N), 3) if S[c[1]] > 215)
assert slow_triples == 230
out['slow_triples'] = slow_triples
med = lambda x: sorted(x)[1]
cnt = 0
for s in range(N - 5):
    w6 = RUNS[s:s + 6]
    pairs = [(w6[0], w6[1]), (w6[2], w6[3]), (w6[4], w6[5])]
    for roles in itertools.product([0, 1], repeat=3):
        c = [p[r] for p, r in zip(pairs, roles)]
        d = [p[1 - r] for p, r in zip(pairs, roles)]
        cnt += abs(math.log(med(d) / med(c))) > 0.05
out['sliding'] = [cnt, 120]
mean = sum(RUNS) / N
sd = math.sqrt(sum((x - mean) ** 2 for x in RUNS) / (N - 1))
out['cv'] = round(100 * sd / mean, 2)  # the article: 10.3%

# 2. the four rollouts (the article's tables): rewards under the first reward, and qualities under the reworked one
old = [-3.0, -3.0, math.log(118 / 148) - 0.0, -0.05]  # the third: ln(0.80) with no fees (the article prints -0.23)
old[2] = round(old[2], 2)
mo = sum(old) / 4
soft = lambda x, t=0.05: math.copysign(max(abs(x) - t, 0), x)
q = [None, None, soft(math.log(118 / 148)), 0.0]
adv_new = []
for i in range(4):
    if q[i] is None:
        adv_new.append(-0.10)
        continue
    peers = [q[j] for j in range(4) if j != i and q[j] is not None]
    b = max(0.0, sum(peers) / len(peers)) if peers else 0.0
    adv_new.append(q[i] - b - (0.02 if i == 3 else 0))
out['grpo'] = {'old_reward': old, 'old_mean': round(mo, 4), 'old_adv': [round(r - mo, 2) for r in old],
               'quality': [None if x is None else round(x, 2) for x in q], 'new_adv': [round(a, 2) for a in adv_new]}
assert out['grpo']['old_adv'] == [-1.43, -1.43, 1.34, 1.52], out['grpo']['old_adv']
assert out['grpo']['new_adv'] == [-0.1, -0.1, -0.18, -0.02], out['grpo']['new_adv']

# 3. headline arithmetic (repository results.md of experiment 033: 31.756 s selected against 57.398 s default)
out['workload'] = {'ratio': round(57.398 / 31.756, 4), 'cut_pct': round(100 * (1 - 31.756 / 57.398), 2)}
out['metric_example'] = {'geo': round(math.sqrt(2 * 0.5), 2), 'workload': round((300 + 25) / (150 + 50), 2)}
out['search_space_3'] = 8 * 3 ** 2 * 4 ** 3  # 8 tree-and-orientation combinations, 3 algorithms per join, 4 scans per table
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
print('fooled k=1,3,5,7 at z=0.05:', [round(100 * sum(out['fool'][k]['0.050']), 2) for k in ('1', '3', '5', '7')],
      '| sliding', cnt, '/ 120 | CV', out['cv'], '| grpo', out['grpo'], '| workload', out['workload'],
      '| example', out['metric_example'], '| plans', out['search_space_3'])
