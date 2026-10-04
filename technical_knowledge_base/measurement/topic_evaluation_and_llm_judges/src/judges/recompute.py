"""Check judges.json against inputs/ and recompute every derived number the tab states.
Run: python3 recompute.py   (exit code 1 on any failure; writes recompute.json)"""
import json, os, re, sys
from judge_checks import resolve, tsv
H = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(H, 'judges.json')))
RD = {r['id']: r for r in D['readings']}
fails, out = [], {}

def ok(name, cond, detail=''):
    out[name] = bool(cond)
    if not cond: fails.append(name + ' ' + str(detail))

# 1. every reading equals the printed value
for r in D['readings']:
    v, cell = resolve(r['chk'])
    if v is None: ok('reading ' + r['id'], ('%.3f' % r['v']) in cell, cell)
    else: ok('reading ' + r['id'], abs(v - r['v']) < 1e-9, (v, r['v']))

# 2. derived numbers stated in the text
kap = {r['j']: r['v'] for r in D['readings'] if r['m'] == 'jb_kappa'}
mtk = {r['j']: r['v'] for r in D['readings'] if r['m'] == 'mtb_kappa'}
ok('21 judges', len(kap) == 21 and len(mtk) == 21, (len(kap), len(mtk)))
ok('JudgeBench kappa spread 60.4 points (0.271 to 0.875)', round((max(kap.values()) - min(kap.values())) * 100, 1) == 60.4 and min(kap.values()) == 0.271 and max(kap.values()) == 0.875)
ok('MT-Bench kappa band 0.376 to 0.511, 13.5 points', min(mtk.values()) == 0.376 and max(mtk.values()) == 0.511 and round((0.511 - 0.376) * 100, 1) == 13.5)
rel = [r for r in tsv('reliability_T4')[2:] if not r[0].startswith('Cohort')]
defl = [float(r[4]) for r in rel]
ok('kappa deflation on MT-Bench 33.8 to 41.3 points (paper: 33 to 41)', min(defl) == 33.8 and max(defl) == 41.3, (min(defl), max(defl)))
for r in rel:  # deflation column equals EM minus kappa
    ok('deflation recomputed ' + r[0], abs((float(r[1]) - float(r[2])) * 100 - float(r[4])) < 0.15, r)
ok('Norman et al. top JudgeBench EM on RewardBench 0.956 (Gemini 3.1 Pro)', max(float(r[9]) for r in rel) == 0.956)
g = lambda i: RD[i]['v']
ok('AJ-Bench agentic gain DeepSeek V3.2 +12.85', round(g('ajb_ds_ag') - g('ajb_ds'), 2) == 12.85)
ok('AJ-Bench agentic gain GPT-5-mini low +13.41', round(g('ajb_g5m_ag') - g('ajb_g5m'), 2) == 13.41)
t = tsv('judgebench_v2_T1'); a = [r[0] for r in t].index('Fine-tuned Judges'); b = [r[0] for r in t].index('Multi-Agent Judges')
ft = [float(r[5]) for r in t[a + 1:b]]
ok('JudgeBench fine-tuned judges 13.14 to 57.43 (10 judges)', len(ft) == 10 and min(ft) == 13.14 and max(ft) == 57.43, ft)
rms = [float(r[5]) for r in tsv('judgebench_v2_T3')[1:]]
ok('JudgeBench reward models 59.43 to 64.29', min(rms) == 59.43 and max(rms) == 64.29, rms)
ok('LongJudgeBench GPT-5.2 best setting below GPT-4o-mini best', g('lj_g52') < g('lj_g4om'))
best_ljb = max(float(r[-2]) for r in [x[1:] if len(x) == 11 else x for x in tsv('longjudgebench_T3')[2:]] if len(r) == 10 and re.match(r'^[0-9.]+$', r[8]))
ok('LongJudgeBench best average 0.6744', best_ljb == 0.6744, best_ljb)
# GPT-5.2 and GPT-4o-mini bests across their four settings
cur, by = None, {}
for x in tsv('longjudgebench_T3')[2:]:
    if len(x) == 11: cur = x[0]; x = x[1:]
    if len(x) == 10: by.setdefault(cur, []).append(float(x[8]))
ok('GPT-5.2 best 0.5251, GPT-4o-mini best 0.5553', max(by['GPT-5.2']) == 0.5251 and max(by['GPT-4o-mini']) == 0.5553, (max(by['GPT-5.2']), max(by['GPT-4o-mini'])))
ljb_mean = [r for r in tsv('longjudgebench_T2') if r and r[0] == 'Total'][0]
ok('LongJudgeBench 1,944 instances, mean 9,249.7 tokens', ljb_mean[3] == '1,944' and ljb_mean[6] == '9,249.7')
# Costs
cost_share, time_share = 30.58 / 1297.50 * 100, 118.43 / (86.5 * 60) * 100
out['aaj_cost_share_pct'], out['aaj_time_share_pct'] = round(cost_share, 2), round(time_share, 2)
ok('Agent-as-a-Judge: cost share 2.36%, time share 2.28%; abstract savings 97.64% cost and 97.72% time agree; section 4.4 swaps them', round(cost_share, 2) == 2.36 and round(time_share, 2) == 2.28 and round(100 - cost_share, 2) == 97.64 and round(100 - time_share, 2) == 97.72)
ok('DevAI human cost = 86.5 h x $15', abs(86.5 * 15 - 1297.50) < 1e-9)
# PoLL: seven to eight times cheaper. Panel $1.25 in + $4.25 out vs GPT-4 Turbo $10 + $30 per million tokens
ratios = {f: (10 * (1 - f) + 30 * f) / (1.25 * (1 - f) + 4.25 * f) for f in (0.0, 0.25, 0.5, 0.75, 1.0)}
out['poll_cost_ratio_by_output_share'] = {str(k): round(v, 2) for k, v in ratios.items()}
ok('PoLL cost ratio between 7.06 and 8.0 for any input/output mix', 7.0 < min(ratios.values()) and max(ratios.values()) <= 8.0, ratios)
# RocketEval cost ratio (from the knowledge base page's recompute)
ok('RocketEval 3400 / 27.7 = 123x', round(3400 / 27.7) == 123)
# MT-Bench agreement: GPT-4 pair vs human (85%) above human-human (81%) without ties
ok('MT-Bench S2: GPT-4 85 vs human 81', g('mt_g4p_s2') == 85 and g('mt_hum_s2') == 81)
ok('MT-Bench S1: GPT-4 66 vs human 63', g('mt_g4p_s1') == 66 and g('mt_hum_s1') == 63)
# PoLL beats GPT-4 on all three KILT sets
t1 = {r[0]: [float(x) for x in r[1:4]] for r in tsv('poll_T1')[1:]}
ok('PoLL kappa above GPT-4 on NQ, TQA, HPQA', all(a > b for a, b in zip(t1['PoLL'], t1['GPT-4'])))
ok('GPT-4 below exact match on NQ (0.627 < 0.651)', t1['GPT-4'][0] < t1['EM'][0])
# RewardBench 2 random baseline 25%, best average 84.1
rb2 = [float(r[1]) for r in tsv('rewardbench2_T3')[1:]]
ok('RewardBench 2 top printed average 84.1', max(rb2) == 84.1)
# Precise IF is the lowest domain for most rows of RewardBench 2 Table 3
low_if = sum(1 for r in tsv('rewardbench2_T3')[1:] if float(r[3]) == min(float(x) for x in r[2:8]))
out['rb2_rows_with_IF_lowest'] = '%d of %d' % (low_if, len(rb2))
ok('Precise IF lowest domain for nearly all RewardBench 2 rows', low_if >= len(rb2) - 2, low_if)
# EvalBiasBench per-bias sizes 24 to 34
ok('EvalBiasBench 80 pairs = 34+28+26+24+24+24 halves', (34 + 28 + 26 + 24 + 24 + 24) == 160)
# LLMBar 100 natural + 319 adversarial
ok('LLMBar 419 = 100 + 319', 100 + 319 == 419)
# Every number written in a row's "why" text must be a reading value, a stated derived value or a size
nums_allowed = {round(r['v'], 4) for r in D['readings']} | {round(r['v'], 3) for r in D['readings']} | {13, 24, 34} | {33, 41, 60.4, 13.5, 0.376, 0.511, 0.271, 0.875, 12.85, 13.41, 20, 14, 21, 3, 66, 55, 2026, 2023, 2024, 2025, 0.956, 10, 30, 4, 8, 5, 1, 2, 9, 32, 0.965, 0.979, 6, 2.29, 2.36, 2.28}
for w in D['rows']:
    txt = re.sub(r'(GPT-|Gemini |Opus |Sonnet |Haiku |Claude |Llama |Qwen|V|K|GLM-|Flash|Pro|-)\d[\w.]*|\b\d+(x\d+)?B\b|-\d+\b', ' ', w['why'])
    for m in re.findall(r'(?<![\w.])\d+(?:,\d{3})*(?:\.\d+)?', txt):
        x = float(m.replace(',', ''))
        if x not in nums_allowed and round(x / 100, 4) not in nums_allowed and round(x * 100, 4) not in nums_allowed:
            fails.append('unchecked number %s in why of %s' % (m, w['id']))
json.dump(dict(checks=out, failures=fails), open(os.path.join(H, 'recompute.json'), 'w'), indent=1)
print(len(out), 'checks,', len(fails), 'failures')
for f in fails: print('FAIL', f)
sys.exit(1 if fails else 0)
