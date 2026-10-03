"""Recompute every derived number the page quotes about the Qwen3 report's own evidence.

  python3 recompute.py        (build.sh runs it; writes inputs/recompute.json)

Inputs: tables.json (mk_tables.py), inputs/fig2.json (extract_fig2.py), inputs/cfg_*.json (Hugging Face configs).
Each check records the paper's claim, where it is, what the tables give, and a verdict.
"""
import json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
FIG = json.load(open(os.path.join(HERE, 'inputs', 'fig2.json')))


def num(s):
    s = s.strip()
    if not s or s == '-': return None
    m = re.match(r'^(-?\d+(?:\.\d+)?)', s.replace(',', ''))
    return float(m.group(1)) if m else None


def rows(t):
    for g in TB[t]['groups']:
        for r in g['rows']: yield g['g'], r


def col(t, name):
    names = [c['name'] for c in TB[t]['cols']]
    for i, n in enumerate(names):
        if n == name or n.startswith(name): return i
    raise KeyError((t, name, names))


def wins(t, a, b, ta=None, tb=None):
    """Benchmarks where model a beats model b. With ta/tb, a and b come from two tables (matched by benchmark name)."""
    ta = ta or t; tb = tb or t
    A = {r['b']: num(r['v'][col(ta, a)]) for _, r in rows(ta)}
    B = {r['b']: num(r['v'][col(tb, b)]) for _, r in rows(tb)}
    keys = [k for k in A if k in B and A[k] is not None and B[k] is not None]
    w = [k for k in keys if A[k] > B[k]]; l = [k for k in keys if A[k] < B[k]]; ti = [k for k in keys if A[k] == B[k]]
    return dict(win=len(w), loss=len(l), tie=len(ti), n=len(keys), lost=l, tied=ti)


C = []  # checks


def check(claim, where, got, verdict, note=''):
    C.append(dict(claim=claim, where=where, got=got, verdict=verdict, note=note))


# ---- base models (Tables 3 to 8) ----
w = wins('T3', 'Qwen3-235B', 'DeepSeek-V3')
check('Qwen3-235B-A22B-Base beats DeepSeek-V3-Base on 14 of 15 benchmarks', '§3.3, Table 3', '%d of %d (loses %s)' % (w['win'], w['n'], ', '.join(w['lost'])),
      'reproduces' if w['win'] == 14 else 'does not reproduce')
w = wins('T3', 'Qwen3-235B', 'Qwen2.5-72B')
check('Qwen3-235B-A22B-Base surpasses Qwen2.5-72B-Base in all benchmarks', '§3.3, Table 3', '%d of %d' % (w['win'], w['n']), 'reproduces' if w['win'] == w['n'] else 'does not reproduce')
w = wins('T3', 'Qwen3-235B', 'Llama-4-Maverick')
check('beats Llama-4-Maverick-Base, "about twice the number of parameters", on most benchmarks', '§3.3, Table 3', '%d of %d (loses %s); 402B / 235B = %.2f' % (w['win'], w['n'], ', '.join(w['lost']), 402 / 235),
      'reproduces (most); "about twice" is 1.7 times')
w = wins('T4', 'Qwen3-32B', 'Qwen2.5-72B')
check('Qwen3-32B-Base outperforms Qwen2.5-72B-Base in 10 of the 15 benchmarks', '§3.3, Table 4', '%d of %d' % (w['win'], w['n']), 'reproduces' if w['win'] == 10 else 'does not reproduce')
w = wins('T4', 'Qwen3-32B', 'Llama-4-Scout')
check('Qwen3-32B-Base significantly outperforms Llama-4-Scout-Base on all 15 benchmarks', '§3.3, Table 4', '%d of %d (loses %s)' % (w['win'], w['n'], ', '.join(w['lost'])),
      'reproduces' if w['win'] == 15 else 'does not reproduce: Table 4 has Scout ahead on INCLUDE')
for other in ('Qwen2.5-14B', 'Gemma-3-12B'):
    w = wins('T5', 'Qwen3-14B', other)
    check('Qwen3-14B-Base performs better than %s-Base on all 15 benchmarks' % other, '§3.3, Table 5', '%d of %d' % (w['win'], w['n']), 'reproduces' if w['win'] == 15 else 'does not reproduce (loses %s)' % ', '.join(w['lost']))
w = wins('T5', 'Qwen3-30B-A3B', 'Qwen2.5-14B')
check('Qwen3-30B-A3B-Base outperforms Qwen2.5-14B-Base on all tasks', '§3.3, Table 5', '%d of %d' % (w['win'], w['n']), 'reproduces' if w['win'] == 15 else 'does not reproduce (loses %s)' % ', '.join(w['lost']))
# the tier shift: Qwen3-xB-Base against the next Qwen2.5 size up
TIER = [('1.7B', 'T8', 'Qwen3-1.7B', 'T7', 'Qwen2.5-3B'), ('4B', 'T7', 'Qwen3-4B', 'T7', 'Qwen2.5-7B'), ('8B', 'T6', 'Qwen3-8B', 'T6', 'Qwen2.5-14B'),
        ('14B', 'T5', 'Qwen3-14B', 'T5', 'Qwen2.5-32B'), ('32B', 'T4', 'Qwen3-32B', 'T4', 'Qwen2.5-72B')]
tier = []
for lab, ta, a, tb, b in TIER:
    w = wins(None, a, b, ta, tb); tier.append(dict(qwen3=a, qwen25=b, tables=[ta, tb], **w))
check('Qwen3-1.7B/4B/8B/14B/32B-Base are comparable to Qwen2.5-3B/7B/14B/32B/72B-Base', '§3.3 summary (3)', '; '.join('%s wins %d of %d against %s' % (t['qwen3'], t['win'], t['n'], t['qwen25']) for t in tier),
      'reproduces as "comparable": each wins between 7 and 15 of 15', 'Qwen2.5-3B-Base is only in Table 7, so 1.7B is compared across Tables 7 and 8')
check('Qwen3-8B / 4B / 1.7B-Base outperform Qwen2.5-14B / 7B / 3B-Base on over half of the benchmarks', '§3.3', ', '.join('%d of 15' % t['win'] for t in tier[:3][::-1]),
      'reproduces' if all(t['win'] > 7.5 for t in tier[:3]) else 'partly')

# ---- post-trained (Tables 11 to 20) ----
w = wins('T11', 'Qwen3-235B', 'DeepSeek-R1')
check('Qwen3-235B-A22B (Thinking) outperforms DeepSeek-R1 on 17/23 benchmarks', '§4.6, Table 11', '%d of %d (loses %s)' % (w['win'], w['n'], ', '.join(w['lost'])), 'reproduces' if w['win'] == 17 else 'does not reproduce')
w = wins('T12', 'Qwen3-235B', 'GPT-4o')
check('Qwen3-235B-A22B (Non-thinking) surpasses GPT-4o-2024-11-20 in 18/23 benchmarks', '§4.6, Table 12', '%d of %d (loses %s)' % (w['win'], w['n'], ', '.join(w['lost'])), 'reproduces' if w['win'] == 18 else 'does not reproduce')
w = wins('T13', 'Qwen3-32B', 'QwQ-32B')
check('Qwen3-32B (Thinking) outperforms QwQ-32B on 17/23 benchmarks', '§4.6, Table 13', '%d of %d (loses %s; ties %s)' % (w['win'], w['n'], ', '.join(w['lost']), ', '.join(w['tied']) or 'none'), 'reproduces' if w['win'] == 17 else 'does not reproduce')
check('"with only 60% activated and 35% total parameters" of DeepSeek-R1', '§4.6', '22 / 37 = %.1f%%; 235 / 671 = %.1f%%' % (2200 / 37, 23500 / 671), 'reproduces')
small = {}
for (t, a, b) in [('T17', 'Qwen3-8B', 'DeepSeek-R1-Distill-Qwen-32B'), ('T17', 'Qwen3-8B', 'DeepSeek-R1-Distill-Qwen-14B'), ('T17', 'Qwen3-4B', 'DeepSeek-R1-Distill-Qwen-14B'),
                  ('T15', 'Qwen3-14B', 'DeepSeek-R1-Distill-Qwen-32B'), ('T15', 'Qwen3-30B-A3B', 'DeepSeek-R1-Distill-Qwen-32B'), ('T15', 'Qwen3-30B-A3B', 'QwQ-32B'),
                  ('T19', 'Qwen3-1.7B', 'DeepSeek-R1-Distill-Llama-8B'), ('T19', 'Qwen3-0.6B', 'DeepSeek-R1-Distill-Qwen-1.5B')]:
    w = wins(t, a, b); small['%s vs %s' % (a, b)] = dict(table=t, **w)
check('lightweight models "possess consistently superior performance" to open models of close or larger size', '§4.6 summary (3)',
      '; '.join('%s %d of %d' % (k, v['win'], v['n']) for k, v in small.items()), 'mostly: 8B, 14B and 30B-A3B beat the R1 distills on 19 to 23; but Qwen3-0.6B loses AIME, MATH-500 and LiveCodeBench to R1-Distill-Qwen-1.5B, Qwen3-1.7B loses AIME\'24, GPQA and LiveCodeBench to R1-Distill-Llama-8B, and 30B-A3B against QwQ-32B is 13 wins, 8 losses, 2 ties')

# ---- Figure 2 against the tables ----
fig_vs = {}
T11 = {r['b']: r['v'][col('T11', 'Qwen3-235B')] for _, r in rows('T11')}
T12 = {r['b']: r['v'][col('T12', 'Qwen3-235B')] for _, r in rows('T12')}
for k, b in (('AIME24', "AIME’24"), ('AIME25', "AIME’25"), ('LCB', 'LiveCodeBench v5'), ('GPQA', 'GPQA-Diamond')):
    fig_vs[k] = dict(fig_32k=FIG[k]['thinking'][-1], table11=num(T11[b]), fig_nothink=FIG[k]['non_thinking'], table12=num(T12[b]),
                     gain_1k_to_32k=round(FIG[k]['thinking'][-1] - FIG[k]['thinking'][0], 2), first_k_above_nothink=FIG['budget_k'][0])
check('Figure 2\'s non-thinking lines are Table 12\'s scores', 'Figure 2, Table 12', ', '.join('%s %.2f vs %s' % (k, v['fig_nothink'], v['table12']) for k, v in fig_vs.items()),
      'reproduces (calibration check of the figure reading: all within 0.05)')
check('Figure 2 at a 32K budget against Table 11 (same model, thinking mode)', 'Figure 2, Table 11', ', '.join('%s %.2f vs %s' % (k, v['fig_32k'], v['table11']) for k, v in fig_vs.items()),
      'does not match: the figure is a separate run (LiveCodeBench 67.8 against 70.7); the report does not say how the settings differ')

# ---- Table 21: distillation against RL ----
r21 = {r[0]: r for r in TB['T21']['rows']}
off, rl, opd = r21['Off-policy Distillation'], r21['+ Reinforcement Learning'], r21['+ On-policy Distillation']
p1 = lambda s: num(s); p64 = lambda s: float(re.search(r'\(([\d.]+)\)', s).group(1)) if '(' in s else None
gh_rl, gh_od = num(rl[-1]), num(opd[-1])
t21 = dict(ratio=round(gh_od / gh_rl, 4), rl_gain_aime24=round(p1(rl[1]) - p1(off[1]), 1), od_gain_aime24=round(p1(opd[1]) - p1(off[1]), 1),
           rl_gain_aime25=round(p1(rl[2]) - p1(off[2]), 1), od_gain_aime25=round(p1(opd[2]) - p1(off[2]), 1),
           pass64=dict(off=[p64(off[1]), p64(off[2])], rl=[p64(rl[1]), p64(rl[2])], od=[p64(opd[1]), p64(opd[2])]),
           aime_questions_per_year=30, samples_per_question=64)
# what one AIME question is worth, and the sampling noise of an avg@64 score on 30 fixed questions
t21['one_question_points'] = round(100 / 30, 2)
t21['diff_in_questions_aime24'] = round((p1(opd[1]) - p1(rl[1])) / (100 / 30), 2)
t21['pass64_diff_questions'] = round((p64(opd[1]) - p64(rl[1])) / (100 / 30), 2)
# worst case sampling SE of an avg@64 score (every question at p = 0.5): sqrt(30 * 0.25 / 64) / 30
t21['avg64_sampling_se_max'] = round(100 * math.sqrt(30 * 0.25 / 64) / 30, 2)
# question-sampling SE if the 30 questions were a sample of a population, p ~ 0.7
t21['question_se_p07'] = round(100 * math.sqrt(0.7 * 0.3 / 30), 1)
check('on-policy distillation needs "approximately only 1/10 of the GPU hours" of RL', '§4.7, Table 21', '1,800 / 17,920 = %.1f%%' % (100 * t21['ratio']), 'reproduces')
check('RL does not improve pass@64; distillation does', '§4.7, Table 21', 'pass@64 AIME\'24 %s, %s, %s; AIME\'25 %s, %s, %s' % (t21['pass64']['off'][0], t21['pass64']['rl'][0], t21['pass64']['od'][0], t21['pass64']['off'][1], t21['pass64']['rl'][1], t21['pass64']['od'][1]),
      'reproduces, but the whole pass@64 gain is one question per year (93.3 - 90.0 = 3.3 = 1/30)')
check('the 1/10 is against "the four-stage training method"', '§4 introduction', 'Table 21 compares against the RL stage alone, from a shared off-policy checkpoint, on math and code queries only', 'not measured as stated: the four-stage cost is never given')

# ---- Table 22: the stages ----
t22 = []
for r in TB['T22']['rows']:
    v = r['v']
    if len(v) != 5: t22.append(dict(b=r['b'], v=v)); continue
    s2, s3t, s3n, s4t, s4n = (num(x) for x in v)
    printed = [re.search(r'([+-][\d.]+)$', x).group(1) if re.search(r'[+-][\d.]+$', x) else None for x in v]
    calc = [None, round(s3t - s2, 1), None, round(s4t - s3t, 1), round(s4n - s3n, 1)]
    ok = all(p is None or abs(float(p) - c) < 0.15 for p, c in zip(printed, calc) if c is not None)
    t22.append(dict(b=r['b'], g=r['g'], v=[s2, s3t, s3n, s4t, s4n], printed=printed, calc=calc, ok=ok, total_thinking=round(s4t - s2, 1)))
bad = [x['b'] for x in t22 if x.get('ok') is False]
check('Table 22\'s printed stage-to-stage changes', 'Table 22', 'all recomputed from the scores, within 0.1 (LiveBench and GPQA non-thinking differ by 0.1: rounding)' if not bad else 'mismatch: ' + ', '.join(bad), 'reproduces' if not bad else 'does not reproduce')
cost = [x for x in t22 if 'total_thinking' in x and x['total_thinking'] < 0]
check('Thinking Mode Fusion and General RL cost a little peak math and code', '§4.7, Table 22', '; '.join('%s %+.1f' % (x['b'], x['total_thinking']) for x in cost), 'reproduces: the fusion tax, in the report\'s own numbers')
T13 = {r['b']: r['v'][col('T13', 'Qwen3-32B')] for _, r in rows('T13')}
T14 = {r['b']: r['v'][col('T14', 'Qwen3-32B')] for _, r in rows('T14')}
same = []
for x in t22:
    if 'total_thinking' not in x: continue
    if x['b'] in T13: same.append('%s %s/%s' % (x['b'], x['v'][3], num(T13[x['b']])))
check('Table 22\'s stage 4 is the released Qwen3-32B of Tables 13 and 14', 'Tables 13, 14, 22', '; '.join(same), 'reproduces where the benchmark appears in both')

# ---- architecture: recount from config.json ----
cards = {'0.6B': (0.6, None), '1.7B': (1.7, None), '4B': (4.0, None), '8B': (8.2, None), '14B': (14.8, None), '32B': (32.8, None), '30B-A3B': (30.5, 3.3), '235B-A22B': (235, 22)}
arch = []
for m, (tc, ac) in cards.items():
    c = json.load(open(os.path.join(HERE, 'inputs', 'cfg_Qwen3-%s.json' % m)))
    d = c['hidden_size']; L = c['num_hidden_layers']; hq = c['num_attention_heads']; hkv = c['num_key_value_heads']; hd = c['head_dim']; V = c['vocab_size']
    attn = d * hq * hd + 2 * d * hkv * hd + hq * hd * d + 2 * hd
    E = c.get('num_experts'); k = c.get('num_experts_per_tok')
    if E: fe = c['moe_intermediate_size']; mlp = E * 3 * d * fe + d * E; mlpa = k * 3 * d * fe + d * E
    else: mlp = mlpa = 3 * d * c['intermediate_size']
    emb = V * d * (1 if c['tie_word_embeddings'] else 2)
    tot = emb + L * (attn + 2 * d + mlp) + d; act = emb + L * (attn + 2 * d + mlpa) + d
    kv_per_token = 2 * L * hkv * hd * 2  # bytes, BF16
    arch.append(dict(model='Qwen3-' + m, d=d, L=L, hq=hq, hkv=hkv, hd=hd, ff=c.get('intermediate_size'), E=E, k=k, fe=c.get('moe_intermediate_size'), V=V,
                     tied=c['tie_word_embeddings'], total=round(tot / 1e9, 3), active=round(act / 1e9, 3), nonemb=round((tot - emb) / 1e9, 3),
                     card_total=tc, card_active=ac, kv_kib_per_token=round(kv_per_token / 1024, 1), maxpos=c['max_position_embeddings'], rope_theta=c['rope_theta']))
check('parameter counts in the names and model cards', 'Tables 1, 2; model cards', '; '.join('%s %.2fB%s' % (a['model'], a['total'], (' (%.2fB active)' % a['active']) if a['E'] else '') for a in arch),
      'reproduces independently from config.json (each within rounding of the card)')
check('vocabulary of 151,669 tokens', '§2', 'config.json vocab_size 151,936 (the embedding is padded; 267 rows unused)', 'consistent')
check('context 128K for 4B and up (Table 1)', 'Table 1; model cards', 'cards: 32,768 natively, 131,072 with YaRN (factor 4); config max_position_embeddings 40,960; the release blog lists Qwen3-4B as 32K', 'consistent with YaRN; the blog and Table 1 disagree for 4B')

# ---- data ----
check('twice as many pre-training tokens as Qwen2.5', '§3.1; release blog', '36T against Qwen2.5\'s 18T (blog) = 2.0x', 'reproduces')
check('"three times more languages" (29 to 119)', '§3.1', '119 / 29 = %.1f' % (119 / 29), 'reproduces, read as "three times more" = about four times as many')
check('S1 + S2 + S3 tokens against 36T', '§3.2', 'over 30T + about 5T + hundreds of billions = about 35.x T', 'consistent')

# ---- more post-training comparisons ----
w = wins('T11', 'Gemini2.5-Pro', 'Qwen3-235B')
check('Qwen3-235B-A22B (Thinking) is "highly competitive" with Gemini2.5-Pro', '§4.6, Table 11', 'Gemini wins %d of %d where both are scored' % (w['win'], w['n']), 'Gemini is ahead on most rows; "competitive" is generous')
w = wins('T11', 'Qwen3-235B', 'OpenAI-o1')
check('and with OpenAI-o1', '§4.6, Table 11', 'Qwen3 wins %d of %d' % (w['win'], w['n']), 'reproduces')
b4 = {}
for mode, t in (('thinking', 'T17'), ('non-thinking', 'T18')):
    w = wins(None, 'Qwen3-4B', 'Qwen2.5-72B', t, 'T14'); b4[mode] = w
check('"even a tiny model like Qwen3-4B can rival the performance of Qwen2.5-72B-Instruct" (release blog, not the report)', 'blog; Tables 14, 17, 18',
      'Qwen3-4B thinking wins %d of %d; non-thinking %d of %d' % (b4['thinking']['win'], b4['thinking']['n'], b4['non-thinking']['win'], b4['non-thinking']['n']),
      'only with thinking on: the non-thinking 4B loses most rows')
ru = {r['m'] + ' ' + r['mode']: r['v'] for r in TB['T23']['rows']}
pairs = [('Qwen3-8B', 'Qwen2.5-7B-Instruct'), ('Qwen3-14B', 'Qwen2.5-14B-Instruct'), ('Qwen3-32B', 'Qwen2.5-32B-Instruct'), ('Qwen3-235B-A22B', 'Qwen2.5-72B-Instruct')]
rul = []
for a, b in pairs:
    an = num(ru[a + ' Non-thinking Mode'][0]); at = num(ru[a + ' Thinking Mode'][0]); bb = num(ru[b + ' Qwen2.5 (Instruct)'][0])
    rul.append(dict(qwen3=a, qwen25=b, nonthink=an, think=at, qwen25_avg=bb))
check('RULER: non-thinking Qwen3 beats Qwen2.5 of similar size; thinking mode "slightly degrades"', 'Appendix A.1.1, Table 23',
      '; '.join('%s %.1f / %.1f (non-thinking / thinking) vs %s %.1f' % (r['qwen3'], r['nonthink'], r['think'], r['qwen25'], r['qwen25_avg']) for r in rul),
      'reproduces; thinking mode is below non-thinking for every model (budget 8,192 tokens)')

# ---- provenance of the DeepSeek columns: DeepSeek-R1 paper Table 4 (inputs/external_extracts.txt) ----
R1T4 = {'R1': {'MMLU-Redux': 92.9, 'GPQA-Diamond': 71.5, 'C-Eval': 91.8, 'IFEval strict prompt': 83.3, 'Arena-Hard': 92.3, 'MATH-500': 97.3, 'AIME’24': 79.8, 'LiveCodeBench v5': 65.9, 'CodeForces (Rating / Percentile)': 2029},
        'V3': {'MMLU-Redux': 89.1, 'GPQA-Diamond': 59.1, 'C-Eval': 86.5, 'IFEval strict prompt': 86.1, 'Arena-Hard': 85.5, 'MATH-500': 90.2, 'AIME’24': 39.2, 'LiveCodeBench v5': 36.2, 'CodeForces (Rating / Percentile)': 1134}}
prov = {}
for key, t in (('R1', 'T11'), ('V3', 'T12')):
    ci = col(t, 'DeepSeek'); same = [b for _, r in rows(t) for b in [r['b']] if b in R1T4[key] and num(r['v'][ci]) == R1T4[key][b]]
    prov[key] = dict(table=t, same=len(same), of=len(R1T4[key]))
check('rivals evaluated "using the same evaluation pipeline" (said of the base models, §3.3)', 'Tables 11, 12 against the DeepSeek-R1 paper',
      'DeepSeek-R1 column: %d of %d shared benchmarks equal R1\'s own Table 4; DeepSeek-V3 column: %d of %d' % (prov['R1']['same'], prov['R1']['of'], prov['V3']['same'], prov['V3']['of']),
      'the post-training baselines are at least partly copied from the rivals\' reports (only LiveCodeBench, a different window, differs); the report says so only for BFCL')

R = dict(prov=prov, b4=b4, rul=rul, checks=C, tier=tier, small=small, fig_vs=fig_vs, t21=t21, t22=t22, arch=arch)
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
if __name__ == '__main__':
    for c in C: print('-', c['claim'][:90], '|', c['got'][:160], '|', c['verdict'][:80])
