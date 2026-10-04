"""Recompute every derived number the page shows; writes recompute_out.json (the JS is checked against it)."""
import json, re, math
from difflib import SequenceMatcher
from data import *

out = {}
def lab(k):  # length label
    return ('%dM' % (k // 1024)) if k >= 1024 else '%dK' % k

# 1. Effective length, two rules: 'last' = largest length passing; 'prefix' = last length before the first failure
def eff(scores, lens, thr, rule):
    ok = [s is not None and s > thr for s in scores]
    if rule == 'last':
        idx = [i for i, o in enumerate(ok) if o]
        return lens[idx[-1]] if idx else None
    e = None
    for i, o in enumerate(ok):
        if scores[i] is None: break
        if not o: break
        e = lens[i]
    return e

r = []
for name, cl, pub, sc in RULER:
    e1, e2 = eff(sc, RULER_LENS, RULER_THR, 'last'), eff(sc, RULER_LENS, RULER_THR, 'prefix')
    shown = ('>128K' if e1 == 128 and sc[-1] > RULER_THR else (lab(e1) if e1 else '<4K'))
    r.append({'m': name, 'pub': pub, 'last': shown, 'same_rules': e1 == e2, 'match': shown == pub})
out['ruler_eff'] = r
out['ruler_eff_all_match'] = all(x['match'] for x in r)
out['ruler_half_at_32k'] = sum(1 for _, cl, _, sc in RULER if sc[3] > RULER_THR)

n = []
for name, cl, pub, base, sc, tab in NOLIMA:
    thr = round(0.85 * base, 1)
    e1 = eff(sc, NOLIMA_LENS, 0.85 * base, 'last')
    e2 = eff(sc, NOLIMA_LENS, 0.85 * base, 'prefix')
    n.append({'m': name, 'pub': pub, 'thr': thr, 'last': lab(e1) if e1 else '<1K', 'prefix': lab(e2) if e2 else '<1K',
              'match': (lab(e1) if e1 else '<1K') == pub, 'half32': sc[5] < 0.5 * base})
out['nolima_eff'] = n
out['nolima_eff_mismatch'] = [x for x in n if not x['match']]
t3 = [x for x in n if x['m'] in NOLIMA_T3]
out['nolima_t3_count'] = len(t3)
out['nolima_t3_below_half_at_32k'] = sum(1 for x in t3 if x['half32'])
gpt4o = [x for x in NOLIMA if x[0] == 'GPT-4o'][0]
out['gpt4o_32k_over_base'] = round(gpt4o[4][5] / gpt4o[3], 3)
out['t6_drop_32k'] = {k: round(v[2] - NOLIMA_T6['Direct'][2], 1) for k, v in NOLIMA_T6.items()}

# 2. Question words found in the needle (unigram precision on lower-cased alphanumeric words). Our measure, not ROUGE.
tok = lambda s: re.findall(r'[a-z0-9]+', s.lower())
ov = {}
for k, p in PAIRS.items():
    q, nd = tok(p['q']), set(tok(p['needle']))
    hit = [w for w in q if w in nd]
    qc = [w for w in q if w not in STOP]; hc = [w for w in qc if w in nd]
    ov[k] = {'q_words': len(q), 'hits': len(hit), 'words': hit, 'prec': round(len(hit) / len(q), 3),
             'q_content': qc, 'content_hits': hc, 'content_prec': round(len(hc) / len(qc), 3) if qc else 0}
out['overlap'] = ov

# 3. Lost in the middle
out['litm'] = [{'m': m, 'best': max(v), 'worst': min(v), 'drop': round(max(v) - min(v), 1), 'below_closed': min(v) < cb,
                'below_closed_positions': [LITM_POS[i] for i, x in enumerate(v) if x < cb]} for m, v, cb, orc in LITM]

# 4. MMMU-Pro deltas and overall; MMStar gains
pro = []
for row in MMMUPRO:
    name, s4, s10, vis, val, d1, d2 = row
    pro.append({'m': name, 'd1': round(s10 - val, 1), 'd2': round(vis - val, 1), 'd1_ok': abs(s10 - val - d1) < 0.05,
                'd2_ok': abs(vis - val - d2) < 0.05, 'pro': round((s10 + vis) / 2, 2), 'opt_drop': round(s4 - s10, 1), 'vis_drop': round(s10 - vis, 1)})
out['mmmupro'] = pro
out['mmmupro_all_deltas_ok'] = all(p['d1_ok'] and p['d2_ok'] for p in pro)
ms = {}
for k in ['GPT-4V', 'GeminiPro-Vision']:
    v = MMSTAR[k]
    ms[k] = {'image_gain_over_blind': round(v['full'] - v['blind'], 1), 'blind_over_random': round(v['blind'] - MMSTAR['random'], 1),
             'share_of_gain_over_random_without_image': round((v['blind'] - MMSTAR['random']) / (v['full'] - MMSTAR['random']), 3)}
out['mmstar'] = ms

# 5. MRCR grading on the real row
row = json.load(open('inputs/mrcr_row.json'))
pre, T = row['prefix'], row['texts']
def grade(resp, ans):
    if not resp.startswith(pre): return 0.0
    return float(SequenceMatcher(None, resp[len(pre):], ans[len(pre):]).ratio())
ans = pre + T['target']
cands = {
 'correct': pre + T['target'],
 'other_needle': pre + T['other'],
 'no_prefix': T['target'],
 'same_format_other_topic': pre + T['glass'],
 'first_half': pre + T['target'][:len(T['target']) // 2],
 'with_preamble': pre + 'Here is the scene you asked for:\n\n' + T['target'],
}
out['mrcr_grades'] = {k: round(grade(v, ans), 6) for k, v in cands.items()}
out['mrcr_row'] = {k: row[k] for k in ['n_chars', 'n_needles', 'desired_msg_index', 'total_messages', 'date_added', 'needle_user_turns', 'answer_is_message']}

# 6. Binomial 95% half-widths at the top score
out['halfwidth'] = [{'b': b, 'n': n_, 'p': p, 'hw': round(1.96 * math.sqrt(p / 100 * (1 - p / 100) / n_) * 100, 1)} for b, n_, p in SIZES]

json.dump(out, open('recompute_out.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: out[k] for k in ['ruler_eff_all_match', 'ruler_half_at_32k', 'nolima_eff_mismatch', 'nolima_t3_count', 'nolima_t3_below_half_at_32k', 'gpt4o_32k_over_base', 'overlap', 'mmmupro_all_deltas_ok', 'mmstar', 'mrcr_grades', 'halfwidth', 't6_drop_32k']}, indent=0))
print([ (x['m'],x['pub'],x['last']) for x in r if not x['match']])
print(out['litm'])
