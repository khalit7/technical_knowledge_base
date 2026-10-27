"""Every derived number the page quotes about the paper's own evidence, recomputed from tables.json, the decoded
figures (inputs/figs.json) and the paper's text; writes inputs/recompute.json. build.sh runs it.
Each check is (claim, where, printed, recomputed, verdict). Verdicts: 'reproduces', 'close', 'does not reproduce',
'derived' (a number the paper does not print, computed here)."""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
F = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
R, CH = {}, []


def chk(claim, where, printed, got, verdict):
    CH.append({'claim': claim, 'where': where, 'printed': printed, 'got': got, 'verdict': verdict})


def row(t, name, key='bench', idx=0):
    rs = [r for r in T[t]['rows'] if (r.get(key) or '').startswith(name)]
    return rs[idx]

# ---------- Figure 1, decoded from the PDF's vector drawing ----------
p = F['fig1']['plots'][0]
pa = sorted([m for m in p['series']['(0.0, 0.0, 1.0)']['markers'] if m[0] > 150 and m[1] < 0.86])
co = sorted([m for m in p['series']['(1.0, 0.0, 0.0)']['markers'] if m[0] > 150 and not (m[0] < 300 and abs(m[1] - 0.8239) < 1e-3)])
human = p['series']['(0.0, 0.5, 0.0)']['lines'][0][0][1]
R['fig1_pass'] = [[round(x), round(y * 480)] for x, y in pa]          # correct samples out of 480 (30 questions x 16)
R['fig1_cons'] = [[round(x), round(y, 4)] for x, y in co]
R['fig1_human'] = round(human, 4)
mx = max(pa, key=lambda m: m[1])
R['fig1_summary'] = {'start': round(pa[0][1] * 100, 2), 'start_k': round(pa[0][1] * 480), 'max': round(mx[1] * 100, 2), 'max_step': round(mx[0]), 'max_k': round(mx[1] * 480),
                     'last': round(pa[-1][1] * 100, 2), 'last_step': round(pa[-1][0]), 'cons_last': round(co[-1][1] * 100, 2), 'human': round(human * 100, 1)}
v1hit = [round(x) for x, y in pa if abs(y * 100 - 71.0) < 0.06]
R['fig1_summary']['v1_71_at'] = v1hit
chk('R1-Zero AIME pass@1 starts at 15.6%', '§2.3, Figure 1(a)', '15.6%', '%.2f%% (%d of 480 samples, step 200)' % (pa[0][1] * 100, round(pa[0][1] * 480)), 'reproduces')
chk('R1-Zero AIME pass@1 reaches 77.9%', '§2.3, Table 3', '77.9%', 'Figure 1(a) peaks at %.1f%% (step %d) and ends at %.1f%% (step %d); its axis stops at 10,000 of 10,400 steps' % (mx[1] * 100, mx[0], pa[-1][1] * 100, pa[-1][0]), 'close')
chk('Self-consistency lifts R1-Zero to 86.7%', '§2.3, Figure 1(a)', '86.7% (cons@16)', '%.1f%% at step %d (26 of 30 questions)' % (co[-1][1] * 100, co[-1][0]), 'reproduces')
chk('January 2025 version: pass@1 rises from 15.6% to 71.0%', 'v1 §2.2.4', '71.0%', 'the v2 curve is at 71.04%% (341 of 480) at step %s; v2 does not say which checkpoint v1 reported' % (', '.join(map(str, v1hit)) or 'none'), 'derived')
L = F['fig1']['plots'][1]['series']['(0.0, 0.0, 1.0)']['lines']
raw = sorted(L[1]); sm = sorted(L[0])
R['fig1_len'] = [[round(x), round(y)] for x, y in raw if round(x) % 20 == 0]
R['fig1_len_smooth'] = [[round(x), round(y)] for x, y in sm[::12]]
mean_len = sum(y for x, y in raw) / len(raw)
before = [y for x, y in raw if 7900 <= x < 8200]; after = [y for x, y in raw if 8500 <= x < 8800]
R['len_summary'] = {'first100': round(sum(y for x, y in raw if x < 100) / len([1 for x, y in raw if x < 100])), 'last100': round(sum(y for x, y in raw if x > 10100) / len([1 for x, y in raw if x > 10100])),
                    'mean': round(mean_len), 'before_jump': round(sum(before) / len(before)), 'after_jump': round(sum(after) / len(after)), 'points': len(raw)}
tok = 512 * mean_len * 10400
R['len_summary']['tokens_generated'] = tok
chk('Tokens R1-Zero generated in training (not printed)', 'derived from Figure 1(b) and §2.1', '-', '%.1fB tokens: 10,400 steps x 512 outputs x %d tokens mean length' % (tok / 1e9, mean_len), 'derived')
chk('Length and accuracy jump at step 8.2k when the length cap doubles', '§2.1; Figure 1', 'a significant jump', 'mean length %d tokens over steps 7,900 to 8,200, %d over 8,500 to 8,800; pass@1 %.1f%% at 8,200, %.1f%% at 8,800' % (R['len_summary']['before_jump'], R['len_summary']['after_jump'], [y for x, y in pa if round(x) == 8200][0] * 100, [y for x, y in pa if round(x) == 8800][0] * 100), 'reproduces')
# ---------- Figure 9: reflective words and "wait" ----------
w = sorted(F['fig9']['plots'][0]['series']['(1.0, 0.0, 0.0)']['markers'])
wt = sorted(F['fig9']['plots'][1]['series']['(0.0, 0.0, 1.0)']['lines'][0])
R['fig9_reflect'] = [[round(x), round(y)] for x, y in w]
R['fig9_wait'] = [[round(x), max(0, round(y))] for x, y in wt]
last3 = [y for x, y in w[-3:]]
chk('Reflective words rise 5- to 7-fold', 'Supplementary C.2, Figure 9(a)', '5 to 7 times', '%.1f to %.1f times the first point (%d at step 200; last three points %s)' % (min(last3) / w[0][1], max(last3) / w[0][1], w[0][1], ', '.join(str(round(v)) for v in last3)), 'reproduces')
first_wait = min(x for x, y in wt if y > 5)
chk('"wait" nearly absent early, occasional at steps 4,000 to 7,000, spikes after 8,000', 'Supplementary C.2, Figure 9(b)', '-', 'first count above 5 at step %d; maximum %d at step %d' % (first_wait, max(y for x, y in wt), max(wt, key=lambda m: m[1])[0]), 'reproduces')
# ---------- Figure 8: MATH-500 by difficulty ----------
cols8 = list(F['fig8']['plots'][0]['series'].keys())
lv = []
for k in cols8:
    ln = sorted(max(F['fig8']['plots'][0]['series'][k]['lines'], key=len))
    lv.append([[round(x), round(y, 4)] for x, y in ln])
R['fig8'] = lv
chk('Level 5 rises from about 0.55 to 0.90', 'Supplementary C.1, Figure 8', '0.55 to 0.90', '%.3f to %.3f' % (lv[4][0][1], lv[4][-1][1]), 'reproduces')
chk('Level 4 rises from about 0.78 to 0.95', 'Supplementary C.1, Figure 8', '0.78 to 0.95', '%.3f to %.3f (%.3f at the last step)' % (lv[3][0][1], max(v for s, v in lv[3][-3:]), lv[3][-1][1]), 'close')
chk('Level 1 is 43 of 500 questions, so 95 to 97% means 1 to 2 unsolved', 'Supplementary C.1', '1 to 2', '43 x 0.047 = %.1f; 43 x 0.023 = %.1f' % (43 * (1 - 0.9535), 43 * (1 - 0.977)), 'reproduces')
# ---------- Figure 7: language consistency reward ablation (on R1-Distill-Qwen-7B) ----------
f7 = {}
names = ['lc', 'lcb', 'aime']
for i, nm in enumerate(names):
    S = F['fig7']['plots'][i]['series']
    on = sorted([m for m in S['(0.0, 0.0, 1.0)']['markers'] if m[0] > 90 and not (m[0] < 100 and m[0] > 80)])
    off = sorted([m for m in S['(0.0, 0.5, 0.0)']['markers'] if m[0] > 90 and not (m[0] < 100 and m[0] > 80)])
    on = [m for m in on if round(m[0]) % 100 == 0]; off = [m for m in off if round(m[0]) % 100 == 0]
    f7[nm] = {'on': [[round(x), round(y, 4)] for x, y in on], 'off': [[round(x), round(y, 4)] for x, y in off]}
    f7[nm]['on_last5'] = round(sum(y for x, y in on[-5:]) / 5, 4); f7[nm]['off_last5'] = round(sum(y for x, y in off[-5:]) / 5, 4)
R['fig7'] = f7
chk('Without the LC reward language consistency deteriorates; with it, it stays stable', 'Supplementary B.6, Figure 7', '-', 'mean of the last five points: %.3f with the reward, %.3f without' % (f7['lc']['on_last5'], f7['lc']['off_last5']), 'reproduces')
chk('With the LC reward: maths comparable, slight degradation on code', 'Supplementary B.6, Figure 7', 'comparable / slight', 'AIME %.1f%% against %.1f%%; LiveCodeBench %.1f%% against %.1f%% (with / without, mean of the last five points, one run each)' % (f7['aime']['on_last5'] * 100, f7['aime']['off_last5'] * 100, f7['lcb']['on_last5'] * 100, f7['lcb']['off_last5'] * 100), 'reproduces')
# ---------- Figure 6: reward hacking ----------
S6 = F['fig6']['plots'][0]['series']
rws = sorted([l for l in S6['(0.0, 0.0, 1.0)']['lines'] if len(l) > 20], key=len)
rw = sorted(rws[0]); rwraw = sorted(rws[-1])
cf = sorted([pt for pt in max([l for l in S6['(1.0, 0.0, 0.0)']['lines'] if all(q[0] > 20 for q in l)], key=len)])
R['fig6'] = {'reward': [[round(x), round(y, 3)] for x, y in rw], 'reward_raw': [[round(x), round(y, 3)] for x, y in rwraw[::4]], 'cf': [[round(x), round(y, 4)] for x, y in cf]}
chk('Reward rises while Codeforces performance falls', 'Supplementary B.5, Figure 6', '-', 'smoothed reward %.2f (step %d) to %.2f (step %d); Codeforces score %.3f (step %d) to %.3f (step %d)' % (rw[0][1], rw[0][0], rw[-1][1], rw[-1][0], cf[0][1], round(cf[0][0], -1), cf[-1][1], cf[-1][0]), 'reproduces')
# ---------- Figure 18: thinking tokens against difficulty (a smoothed spline, as the caption says) ----------
s18 = sorted(F['fig18']['plots'][0]['series']['(0.0, 0.0, 1.0)']['lines'][0])
R['fig18'] = [[round(x, 3), round(y)] for x, y in s18[::6]]
band = F['fig18']['plots'][0]['series']['band']['lines'][0]
env = []
for i in range(0, 39):
    xc = 0.025 + i * 0.025
    near = [y for x, y in band if abs(x - xc) < 0.0126]
    if near: env.append([round(xc, 3), round(min(near)), round(max(near))])
R['fig18_band'] = env
m_easy = [y for x, y in s18 if x > 0.9]; m_hard = [y for x, y in s18 if x < 0.1]
chk('Fewer than 7,000 thinking tokens on simple problems, more than 18,000 on the hardest', 'Supplementary E.4, Figure 18', '<7,000 / >18,000', 'the smoothed mean runs from %d to %d tokens on the easiest tenth and %d to %d on the hardest; the plotted standard-deviation band reaches %d below and %d above' % (min(m_easy), max(m_easy), min(m_hard), max(m_hard), min(e[1] for e in env), max(e[2] for e in env)), 'matches the band, not the mean')
# ---------- Table 3: stage by stage ----------
t3 = T['t3']
def cell(t, bench, metric_start, col):
    for r in T[t]['rows']:
        if r['bench'] == bench and r['metric'].startswith(metric_start): return r['n'][col]
ae = (cell('t3', 'AlpacaEval2.0', 'LC', 3), cell('t3', 'AlpacaEval2.0', 'LC', 4))
ah = (cell('t3', 'ArenaHard', 'GPT', 3), cell('t3', 'ArenaHard', 'GPT', 4))
chk('Stage 4 improves AlpacaEval 2.0 by 25%', '§4, Table 3', '25%', '%.1f to %.1f: +%.1f points, +%.0f%% relative' % (ae[0], ae[1], ae[1] - ae[0], (ae[1] / ae[0] - 1) * 100), 'reproduces (as points)')
chk('Stage 4 improves ArenaHard by 17%', '§4, Table 3', '17%', '%.1f to %.1f: +%.1f points, +%.0f%% relative' % (ah[0], ah[1], ah[1] - ah[0], (ah[1] / ah[0] - 1) * 100), 'reproduces (as points)')
a = [cell('t3', 'AIME 2024', 'Pass', i) for i in range(5)]
chk('Dev1 loses reasoning against R1-Zero, most on AIME', '§4, Table 3', '-', 'AIME %.1f to %.1f (%.1f points); CNMO %.1f to %.1f' % (a[0], a[1], a[1] - a[0], cell('t3', 'CNMO 2024', 'Pass', 0), cell('t3', 'CNMO 2024', 'Pass', 1)), 'reproduces')
# bold marks against the row maximum
nb = nmx = 0; small = []
for r in t3['rows']:
    b = r.get('bold') or []
    vals = r['n']
    m = max(v for v in vals if v is not None)
    for i, flag in enumerate(b):
        if flag:
            nb += 1
            second = sorted([v for j, v in enumerate(vals) if j != i and v is not None])[-1]
            if vals[i] == m: nmx += 1
            if vals[i] - second <= 1.0: small.append('%s %s: %.1f against %.1f' % (r['bench'], r['metric'], vals[i], second))
R['bold_t3'] = {'bold': nb, 'row_max': nmx, 'rows': len(t3['rows']), 'small': small}
chk('Bold in Table 3 marks a t-test with p < 0.01', 'Table 3 caption', 'bold = significant', '%d bold cells, every one the row maximum; %d of them lead the runner-up by 1 point or less (%s). Per-question results are not released, so no test can be rerun' % (nb, len(small), '; '.join(small)), 'cannot be checked')
# ---------- Table 7: cost ----------
h = T['t7']['rows'][0]['n']; usd = T['t7']['rows'][1]['n']
chk('Total 147K H800 GPU hours', 'Supplementary B.4.4, Table 7', '147K', '%dK + %dK + %dK = %dK' % (h[0] / 1e3, h[1] / 1e3, h[2] / 1e3, sum(h[:3]) / 1e3), 'reproduces')
chk('$294K at $2 per GPU hour', 'Table 7', '$294K', '147K x $2 = $%dK' % (sum(h[:3]) * 2 / 1e3), 'reproduces')
chk('R1-Zero: 64 x 8 H800 GPUs for about 198 hours', 'Supplementary B.4.4', '101K GPU hours', '512 x 198 = %s GPU hours' % format(512 * 198, ','), 'reproduces')
chk('R1: same 512 GPUs, "about 4 days, or roughly 80 hours"', 'Supplementary B.4.4', '41K GPU hours', '512 x 80 = %s GPU hours (reproduces 41K); but 4 days is 96 hours, which would be %s' % (format(512 * 80, ','), format(512 * 96, ',')), 'text disagrees with itself')
R['cost'] = {'gpu_h': h, 'usd': usd, 'v3_gpu_h': 2788000, 'v3_usd': 5576000, 'share_of_v3': round(sum(h[:3]) / 2788000 * 100, 1)}
chk('R1 on top of V3: share of V3\'s reported pre-training bill', 'derived (V3 report Table 1: 2,788K GPU hours, $5.576M)', '-', '147K / 2,788K = %.1f%%' % (sum(h[:3]) / 2788000 * 100), 'derived')
# ---------- Table 4 and §2.1: RL data and epochs ----------
t4 = {r['model']: r['n'][0] for r in T['t4']['rows']}
reason_table = t4['Math'] + t4['Code'] + t4['STEM'] + t4['Logic']
reason_text = 26 + 17 + 8 + 22 + 15
uniq = 10400 * 32 / 1.6
R['rl_data'] = {'table_reasoning_K': reason_table, 'text_reasoning_K': reason_text, 'general_K': t4['General'], 'all_K': reason_text + 66 + 12, 'implied_unique_questions': uniq}
chk('Code prompts', 'Supplementary B.3.1, Table 4', '17K (table)', 'the text says 17K algorithm questions plus 8K bug-fixing problems = 25K', 'table and text differ')
chk('R1-Zero: 10,400 steps of 32 questions are 1.6 epochs', '§2.1', '1.6 epochs', '10,400 x 32 / 1.6 = %s distinct questions, against %dK to %dK reasoning prompts in Table 4 and its text; the paper does not say which set R1-Zero used' % (format(int(uniq), ','), reason_table, reason_text), 'does not add up')
chk('A rollout of 8,192 outputs feeds 16 minibatches of 512', '§2.1', '16', '8,192 / (32 x 16) = %d updates per rollout, so 10,400 steps are %d rollouts' % (8192 / 512, 10400 / 16), 'reproduces')
# ---------- Table 5: SFT data ----------
t5 = [r for r in T['t5']['rows']]
tot = sum(r['n'][0] for r in t5[:-1])
wavg = sum(r['n'][0] * r['n'][2] for r in t5[:-1]) / tot
R['sft'] = {'total': tot, 'avg_tokens': round(wavg, 1), 'tokens': tot * wavg}
chk('About 800,000 SFT samples', 'Supplementary B.3.2, Table 5', '804,745', 'rows sum to %s' % format(int(tot), ','), 'reproduces')
chk('Average 5,355.3 tokens per sample', 'Table 5', '5,355.3', 'sample-weighted mean of the rows: %.1f (about %.2fB tokens per epoch)' % (wavg, tot * wavg / 1e9), 'reproduces' if abs(wavg - 5355.3) < 0.05 else 'close')
# ---------- Table 13: fresh competitions ----------
t13 = []
for r in T['t13']['rows']:
    amc = r['n'][0]; aime = float(r['v'][1].split('/')[0]); idx = amc + 10 * aime
    t13.append({'model': r['model'], 'amc': amc, 'aime': aime, 'index': round(idx, 1), 'printed': r['n'][2], 'qualifies': idx > 251.5})
R['t13'] = t13
chk('USAMO index = AMC + 10 x AIME, all five rows', 'Supplementary E.2, Table 13', 'printed', ', '.join('%s %.1f' % (x['model'].split(' ')[0], x['index']) for x in t13), 'reproduces')
chk('AIME 2025: R1 75%, o1 80%', 'Supplementary E.2', '75% / 80%', '11.3/15 = %.1f%%; 12.0/15 = %.1f%%' % (11.3 / 15 * 100, 12 / 15 * 100), 'reproduces')
chk('Previous R1 on AIME 2025', 'R1-0528 model card (beyond the paper)', '70.0%', 'the paper\'s 75% uses AIME 2025 II only (15 questions, the problem page it links); the card does not say which set gives 70.0%', 'not like for like')
# ---------- distillation claims ----------
t15 = {r['model']: r['n'] for r in T['v1t5']['rows']}
q14 = t15['DeepSeek-R1-Distill-Qwen-14B']; qwq = t15['QwQ-32B-Preview']; o1m = t15['OpenAI-o1-mini']
chk('Distill-Qwen-14B beats QwQ-32B-Preview on all metrics', 'v1 §3.2, Table 5', 'all', '%d of 6' % sum(a > b for a, b in zip(q14, qwq)), 'reproduces')
for m in ('DeepSeek-R1-Distill-Qwen-32B', 'DeepSeek-R1-Distill-Llama-70B'):
    chk('Distill-%s exceeds o1-mini on most benchmarks' % '-'.join(m.split('-')[-2:]), 'v1 §3.2, Table 5', 'most', '%d of 6 (Codeforces rating %d against 1,820)' % (sum(a > b for a, b in zip(t15[m], o1m)), t15[m][5]), 'reproduces')
q15 = t15['DeepSeek-R1-Distill-Qwen-1.5B']; g4 = t15['GPT-4o-0513']; cl = t15['Claude-3.5-Sonnet-1022']
chk('Distill-Qwen-1.5B outperforms GPT-4o and Claude-3.5-Sonnet on maths', 'v1 §5; v2 Supplementary F', 'on math benchmarks', 'AIME %.1f against %.1f and %.1f; MATH-500 %.1f against %.1f and %.1f; but GPQA %.1f against %.1f and %.1f, LiveCodeBench %.1f against %.1f and %.1f' % (q15[0], g4[0], cl[0], q15[2], g4[2], cl[2], q15[3], g4[3], cl[3], q15[4], g4[4], cl[4]), 'reproduces (maths only, as stated)')
t16 = {r['model']: r['n'] for r in T['t16']['rows']}
d32 = t16['DeepSeek-R1-Distill-Qwen-32B']; z32 = t16['Qwen2.5-32B-Zero']; qq = t16['QwQ-32B-Preview']
R['t16'] = {'margins': [round(a - b, 1) for a, b in zip(d32, z32)], 'zero_vs_qwq': [round(a - b, 1) for a, b in zip(z32, qq)]}
chk('Qwen2.5-32B-Zero is on par with QwQ-32B-Preview', 'Supplementary F.1, Table 16', 'on par', 'differences %s points' % ', '.join('%+.1f' % v for v in R['t16']['zero_vs_qwq']), 'reproduces')
chk('Distill-Qwen-32B beats Qwen2.5-32B-Zero on every benchmark', 'Supplementary F.1, Table 16', 'all', 'margins %s points' % ', '.join('%+.1f' % v for v in R['t16']['margins']), 'reproduces')
# ---------- headline comparisons and noise ----------
se = math.sqrt(0.8 * 0.2 / 30) * 100
chk('R1 79.8% slightly surpasses o1-1217 79.2% on AIME 2024', 'v1 §1.2; Table 8', '+0.6 points', 'one question of 30 is 3.3 points; a binomial standard error over 30 questions at 80%% is %.1f points' % se, 'within noise')
R['aime_se'] = round(se, 1)
chk('Test-time scaling: R1 61.8% at 8,793 thinking tokens, GPT-4o 24.7% at 711', 'Supplementary E.4', 'an order of magnitude', '8,793 / 711 = %.1f times' % (8793 / 711), 'reproduces')
chk('GPT-4o majority vote over 64 samples on AIME: 9.3% to 13.4%', 'Supplementary E.4; Table 15', '13.4%', 'Table 15 cons@64 for GPT-4o: %.1f' % t15['GPT-4o-0513'][1], 'reproduces')
# ---------- safety ----------
t11 = {r['model']: r['n'] for r in T['t11']['rows']}
c = t11['Claude-3.7-Sonnet']
chk('Claude-3.7-Sonnet: 33.8% fewer safe answers under jailbreak', 'Supplementary D.3.5, Table 11', '33.8%', 'safe = 100 - unsafe - rejected: %.1f%% to %.1f%%, down %.1f points' % (100 - c[0] - c[3], 100 - c[1] - c[4], (100 - c[0] - c[3]) - (100 - c[1] - c[4])), 'reproduces')
r1rc = [r['n'] for r in T['t11']['rows'] if r['model'].startswith('+ risk')][1]
chk('Reasoning models lean on risk control: rejection rates 79.8% (DeepSeek-R1) and 87.3% (o1)', 'Supplementary D.3.5', '79.8% and 87.3%', 'Table 11 gives R1 with risk control %.1f%% and o1 %.1f%%: the text swaps them' % (r1rc[4], t11['o1 (2024-12-17)'][4]), 'text disagrees with table')
r1 = t11['DeepSeek-R1']
chk('Open weights without the risk control system under jailbreak', 'Table 11', '-', 'unsafe %.1f%% to %.1f%% (+%.1f points)' % (r1[0], r1[1], r1[2]), 'reproduces')
# ---------- the two versions ----------
diff = []
for a, b in zip(T['v1t4']['rows'], T['t8']['rows']):
    for i, (x, y) in enumerate(zip(a['v'], b['v'])):
        if x != y: diff.append('%s %s' % (a['bench'], T['t8']['cols'][i]))
chk('January (v1 Table 4) and Nature (v2 Table 8) comparison tables', 'v1 Table 4; v2 Table 8', '-', 'identical in all %d cells%s (v1 labels MMLU "Pass@1", v2 "EM")' % (21 * 6, '' if not diff else ' except ' + ', '.join(diff)), 'reproduces')
z1 = [r for r in T['v1t2']['rows'] if r['model'] == 'DeepSeek-R1-Zero'][0]['n']
z2 = [cell('t12', 'AIME 2024', 'Pass', 2), None, cell('t12', 'MATH-500', 'Pass', 2), cell('t12', 'GPQA Diamond', 'Pass', 2), cell('t12', 'LiveCodeBench', 'Pass', 2), [r for r in T['t12']['rows'] if r['bench'] == 'Codeforces' and r['metric'] == 'Rating'][0]['n'][2]]
R['zero_versions'] = {'v1': z1, 'v2': z2}
chk('R1-Zero in the two versions', 'v1 Table 2; v2 Tables 3 and 12', '-', 'AIME %.1f to %.1f, GPQA %.1f to %.1f; MATH-500 %.1f, LiveCodeBench %.1f and Codeforces %d unchanged' % (z1[0], z2[0], z1[3], z2[3], z1[2], z1[4], z1[5]), 'versions differ')
R['fig_fits'] = []
for name, f in F.items():
    for i, pl in enumerate(f['plots']):
        if name in ('fig10', 'fig17'): continue
        R['fig_fits'].append({'fig': name.replace('fig', 'Figure '), 'panel': i, 'page': f['page'], 'x_ticks': pl['x_fit']['n'], 'y_ticks': pl['y_fit']['n'], 'x_resid': pl['x_fit']['resid'], 'y_resid': pl['y_fit']['resid'],
                          'y2_resid': pl['y2_fit']['resid'] if pl.get('y2_fit') else None, 'series': len(pl['series'])})
R['checks'] = CH
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=0)
print('checks', len(CH))
for c in CH: print('-', c['verdict'].ljust(26), c['claim'][:70], '|', c['got'][:150])
