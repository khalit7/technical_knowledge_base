"""AlpacaEval 2 verbosity recount from released annotations (Dubois et al. 2024, arXiv 2404.04475).
Inputs (RAW/ae, not committed):
  results/{gpt4_1106_preview_verbose,gpt4_1106_preview_concise,gpt4_1106_preview}/weighted_alpaca_eval_gpt4_turbo/annotations.json
  src/alpaca_eval/leaderboards/data_AlpacaEval_2/weighted_alpaca_eval_gpt4_turbo_leaderboard.csv
  from https://github.com/tatsu-lab/alpaca_eval (main, fetched 2026-10-04)
Judge: weighted_alpaca_eval_gpt4_turbo (gpt-4-1106-preview, logprob-weighted). Baseline: gpt4_1106_preview (default prompt).
preference in [1,2]: 2 means the judged model's output (output_2) wins. Win rate = mean(preference - 1) x 100.
"""
import json, sys, os, csv, statistics as st
RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), 'inputs')
A = {k: json.load(open(os.path.join(RAW, 'ae', 'gpt4_1106_preview_%s.ann.json' % k))) for k in ['verbose', 'concise']}
res = {}
for k, rows in A.items():
    p = [float(r['preference']) - 1 for r in rows if r['preference'] is not None]
    res[k] = dict(n=len(p), win_rate=round(100 * st.mean(p), 2),
                  mean_len_model=round(st.mean(len(r['output_2']) for r in rows)),
                  mean_len_baseline=round(st.mean(len(r['output_1']) for r in rows)))
lb = {r[''] if '' in r else r['name']: r for r in csv.DictReader(open(os.path.join(RAW, 'ae', 'lb.csv')))}
for k in ['verbose', 'concise']:
    r = lb['gpt4_1106_preview_' + k]
    res[k]['lb_win_rate'] = round(float(r['win_rate']), 2)
    res[k]['lb_lc_win_rate'] = round(float(r['length_controlled_winrate']), 2)
    res[k]['lb_avg_length'] = int(r['avg_length'])
# per-instruction pairs: same instruction, verbose and concise rewrites by the same model, same judge, same baseline
V = {r['instruction']: r for r in A['verbose']}; C = {r['instruction']: r for r in A['concise']}
cands = []
for ins in V:
    if ins not in C: continue
    v, c = V[ins], C[ins]
    if v['preference'] is None or c['preference'] is None: continue
    pv, pc = float(v['preference']) - 1, float(c['preference']) - 1
    cands.append((pv - pc, ins, pv, pc, len(v['output_2']), len(c['output_2']), len(v['output_1'])))
cands.sort(reverse=True)
flipped = sum(1 for d, *_ in cands if _[1] > .5 and _[2] < .5)
res['pairs'] = dict(n=len(cands), verbose_wins_concise_loses=flipped,
                    mean_delta=round(100 * st.mean(d for d, *_ in cands), 2))
for d, ins, pv, pc, lv, lc, lb_ in cands[:40]:
    if lc < 700 and lv < 2600 and len(ins) < 140:
        print(round(pv, 3), round(pc, 3), lv, lc, lb_, repr(ins))
json.dump(res, open(os.path.join(OUT, 'alpaca_summary.json'), 'w'), indent=1)
print(json.dumps(res, indent=1))
