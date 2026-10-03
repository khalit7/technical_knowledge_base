"""Every derived number the page shows about the paper's evidence, recomputed from tables.json
(the arXiv v2 tables as printed) and the v1 inference table. Writes inputs/recompute.json.

  python3 recompute.py      (build.sh runs it)
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
f = lambda s: float(s.rstrip('s'))
R = {}


def rows(name):
    return T[name]['rows']


def get(name, model, method):
    for r in rows(name):
        if r['model'] == model and r['method'] == method: return r['vals']
    raise KeyError((name, model, method))


# 1. Averages: printed Avg. against the mean of the printed task scores, and of the two-decimal appendix means
chk = []
for name in ('Table 1', 'Table 2', 'Table 3', 'Table 6', 'Table 7', 'Table 16'):
    for r in rows(name):
        v = [f(x) for x in r['vals']]
        chk.append(dict(table=name, model=r['model'], method=r['method'], printed=v[-1], mean_of_printed=round(sum(v[:-1]) / (len(v) - 1), 3)))
R['avg_check'] = chk
R['avg_check_worst'] = max(abs(c['printed'] - c['mean_of_printed']) for c in chk)
std_avg = {}
for name in ('Table 21', 'Table 22', 'Table 23', 'Table 24', 'Table 25'):
    for r in rows(name):
        m = [f(x) for x in r['vals'][0::2]]; s = [None if x == '-' else f(x) for x in r['vals'][1::2]]
        # SD of the 5-task average if task scores were independent across seeds (approximation, labelled so)
        sd = None if None in s else math.sqrt(sum(x * x for x in s)) / len(s)
        std_avg[f"{name}|{r['model']}|{r['method']}"] = dict(mean=round(sum(m) / len(m), 3), means=m, stds=s, sd_avg_indep=None if sd is None else round(sd, 3))
R['std_tables'] = std_avg

# 2. Gains in Table 1, 2, 3 (pp), and the paper's stated gains checked against them
MODELS = ['Gemma-2B', 'Gemma-7B', 'Llama2-7B', 'Llama3-8B', 'Phi-2']
gains = {}
for name, models in (('Table 1', MODELS), ('Table 2', MODELS), ('Table 3', ['Gemma-2B', 'Llama3-8B'])):
    g = {}
    for mo in models:
        b = [f(x) for x in get(name, mo, 'Bitune')]; l = [f(x) for x in get(name, mo, 'LoRA')]; l16 = [f(x) for x in get(name, mo, 'LoRA16')]
        g[mo] = dict(vs_lora=round(b[-1] - l[-1], 2), vs_lora16=round(b[-1] - l16[-1], 2),
                     tasks_lost_to_lora=[T[name]['cols'][i] for i in range(len(b) - 1) if b[i] < l[i]],
                     tasks_lost_to_best_baseline=[T[name]['cols'][i] for i in range(len(b) - 1) if b[i] < max(l[i], l16[i])])
        if name == 'Table 1':
            p = [f(x) for x in get(name, mo, 'Pretrained')]; g[mo]['vs_pretrained'] = round(b[-1] - p[-1], 2)
            g[mo]['pretrained_beats_bitune'] = [T[name]['cols'][i] for i in range(len(b) - 1) if p[i] > b[i]]
    gains[name] = g
R['gains'] = gains
R['n_cells_t1'] = sum(len(get('Table 1', mo, 'Bitune')) - 1 for mo in MODELS)
R['n_lost_t1'] = sum(len(gains['Table 1'][mo]['tasks_lost_to_best_baseline']) for mo in MODELS)
R['n_lost_t2'] = sum(len(gains['Table 2'][mo]['tasks_lost_to_best_baseline']) for mo in MODELS)
R['n_cells_t2'] = 25
# The text of Sec. 3.1: "4 pp over LoRA, 9.3 over pretrained (Gemma-2B); 1.8, 1.4, 0.9 for Llama3-8B, Llama2-7B, Phi-2; Gemma-7B 0.1"
R['text_31'] = dict(stated={'Gemma-2B': 4.0, 'Llama3-8B': 1.8, 'Llama2-7B': 1.4, 'Phi-2': 0.9, 'Gemma-7B': 0.1},
                    vs_lora={m: gains['Table 1'][m]['vs_lora'] for m in MODELS}, vs_lora16={m: gains['Table 1'][m]['vs_lora16'] for m in MODELS})

# 3. PEFT methods (Table 6): the text says gains range from +1.6 to +4.0
peft = {}
for mo in ('Gemma-2B', 'Llama3-8B'):
    for base, bit in (('LoRA', 'Bitune'), ('DoRA', 'Bitune (DoRA)'), ('IA3', 'Bitune (IA3)')):
        a = f(get('Table 6', mo, bit)[-1]) - f(get('Table 6', mo, base)[-1])
        # from the two-decimal means of Table 24
        m1 = std_avg[f'Table 24|{mo}|{bit}']['mean']; m0 = std_avg[f'Table 24|{mo}|{base}']['mean']
        peft[f'{mo} {base}'] = dict(printed=round(a, 2), two_dec=round(m1 - m0, 2))
R['peft'] = peft
R['peft_range'] = [min(v['printed'] for v in peft.values()), max(v['printed'] for v in peft.values())]

# 4. Noise: per-task difference Bitune - LoRA with its standard error from 3 seeds (Table 21), Welch t
def welch(m1, s1, m0, s0, n=3):
    se = math.sqrt(s1 * s1 / n + s0 * s0 / n); return round(m1 - m0, 2), round(se, 2), round((m1 - m0) / se, 2) if se else None
noise = {}
for mo in MODELS:
    b = std_avg[f'Table 21|{mo}|Bitune']; l = std_avg[f'Table 21|{mo}|LoRA']
    noise[mo] = [dict(task=T['Table 21']['cols'][i], **dict(zip(('diff', 'se', 't'), welch(b['means'][i], b['stds'][i], l['means'][i], l['stds'][i]))))
                 for i in range(5)]
    se_avg = math.sqrt(b['sd_avg_indep'] ** 2 / 3 + l['sd_avg_indep'] ** 2 / 3)
    noise[mo].append(dict(task='Avg. (tasks assumed independent)', diff=round(b['mean'] - l['mean'], 2), se=round(se_avg, 2), t=round((b['mean'] - l['mean']) / se_avg, 2)))
R['noise_t1'] = noise
R['n_task_cells_t_gt2'] = sum(1 for mo in MODELS for x in noise[mo][:5] if x['t'] > 2)
R['n_task_cells_t_lt0'] = sum(1 for mo in MODELS for x in noise[mo][:5] if x['t'] < 0)
abl = {}
for mo in ('Gemma-2B', 'Llama3-8B'):
    b = std_avg[f'Table 23|{mo}|Bitune']
    for v in ('LoRA', 'Naive Bidir.', 'No Mixing', 'Only Causal', 'Shared Weights'):
        o = std_avg[f'Table 23|{mo}|{v}']
        se = math.sqrt(b['sd_avg_indep'] ** 2 / 3 + o['sd_avg_indep'] ** 2 / 3)
        abl[f'{mo}|{v}'] = dict(gap=round(b['mean'] - o['mean'], 2), se=round(se, 2), t=round((b['mean'] - o['mean']) / se, 2))
R['ablation_noise'] = abl
R['max_std_t21'] = max(s for k, v in std_avg.items() if k.startswith('Table 21') for s in v['stds'] if s is not None)

# 5. Cost: Table 4 (v2) and the v1 Appendix 6.4 inference times
p0, g0 = (f(x) for x in get('Table 4', None, 'LoRA')); p1, g1 = (f(x) for x in get('Table 4', None, 'Bitune'))
R['t4'] = dict(prefill_ratio=round(p1 / p0, 2), prefill_extra_s=round(p1 - p0, 2), total_ratio=round((p1 + g1) / (p0 + g0), 4),
               total_extra_pct=round(100 * ((p1 + g1) / (p0 + g0) - 1), 2), gen_ms_per_token_lora=round(1000 * g0 / 2000, 2),
               prefill_ms_per_token_lora=round(1000 * p0 / 2000, 3), prefill_ms_per_token_bitune=round(1000 * p1 / 2000, 3))
V1 = {'Gemma-2B': {'50:200': (6.31, 6.72), '200:50': (1.56, 1.74)}, 'Llama3-8B': {'50:200': (11.48, 11.65), '200:50': (2.39, 2.73)}}
R['v1_inference'] = {m: {k: dict(lora=a, bitune=b, extra_pct=round(100 * (b / a - 1), 1)) for k, (a, b) in d.items()} for m, d in V1.items()}
tr = {}
for mo in ('Gemma-2B', 'Llama3-8B'):
    l = [f(x) for x in get('Table 14', mo, 'LoRA')]; b = [f(x) for x in get('Table 14', mo, 'Bitune')]
    tr[mo] = dict(time_ratio=round(b[0] / l[0], 2), mem_extra_pct=round(100 * (b[1] / l[1] - 1), 1), acc_gain=round(b[2] - l[2], 1))
R['train_cost'] = tr

# 6. Mixing (Eq. 8): alpha = |theta| / (theta_init + |theta|), theta starts at theta_init, so alpha starts at 0.5;
#    d alpha / d theta at the start = theta_init / (2 theta_init)^2 = 1 / (4 theta_init)
R['mixing'] = {str(ti): dict(alpha0=0.5, slope0=round(1 / (4 * ti), 2), theta_for_alpha_09=round(9 * ti, 4)) for ti in (0.1, 0.01, 0.001)}

# 7. Other stated numbers
R['codestral_gain'] = round(f(get('Table 17', 'Codestral-22B', 'Bitune')[0]) - f(get('Table 17', 'Codestral-22B', 'LoRA')[0]), 2)
R['fullft_gain'] = round(f(get('Table 7', None, 'Bitune (Full FT)')[-1]) - f(get('Table 7', None, 'Full FT')[-1]), 2)
R['alpaca'] = {mo: dict(bitune_vs_lora=round(f(get('Table 16', mo, 'Bitune')[-1]) - f(get('Table 16', mo, 'LoRA')[-1]), 2),
                        naive_vs_lora=round(f(get('Table 16', mo, 'Naive Bidir.')[-1]) - f(get('Table 16', mo, 'LoRA')[-1]), 2))
               for mo in ('Gemma-2B', 'Llama3-8B')}
R['cot'] = {mo: round(f(get('Table 3', mo, 'Bitune')[-1]) - f(get('Table 3', mo, 'LoRA')[-1]), 2) for mo in ('Gemma-2B', 'Llama3-8B')}
R['gsm8k_t2'] = {mo: round(f(get('Table 2', mo, 'Bitune')[4]) - f(get('Table 2', mo, 'LoRA')[4]), 2) for mo in MODELS}
R['t8'] = {mo: {r['method']: f(r['vals'][0]) for r in rows('Table 8') if r['model'] == mo} for mo in ('Gemma-2B', 'Llama3-8B')}

# 8. Figures 2 and 3 decoded from their vector data (decode_figs.py), and the A.13 GSM8K samples graded
FG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
R['fig2'] = {k: dict(start=v['start'], end=v['end'], min=v['min'], max=v['max'], points=v['points']) for k, v in FG['fig2']['curves'].items()}
R['fig3'] = {k: FG['fig3'][k] for k in ('k', 'v', 'mean_k', 'mean_v', 'min_k', 'max_k', 'min_v', 'max_v')}
GS = json.load(open(os.path.join(HERE, 'inputs', 'gsm8k_samples.json')))['items']
R['gsm8k_samples'] = dict(items=GS, lora_right=sum(x['lora'] == x['ref'] for x in GS), bitune_right=sum(x['bitune'] == x['ref'] for x in GS),
                          differ=[x['q'] for x in GS if (x['lora'] == x['ref']) != (x['bitune'] == x['ref'])])
os.makedirs(os.path.join(HERE, 'inputs'), exist_ok=True)
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    print('worst avg mismatch', R['avg_check_worst'])
    print('text 3.1', R['text_31'])
    print('peft', R['peft'], R['peft_range'])
    print('lost cells T1', R['n_lost_t1'], '/', R['n_cells_t1'], 'T2', R['n_lost_t2'])
    for mo in MODELS: print(mo, [(x['task'], x['diff'], x['se'], x['t']) for x in R['noise_t1'][mo]])
    print('t>2', R['n_task_cells_t_gt2'], 't<0', R['n_task_cells_t_lt0'])
    print('ablation', R['ablation_noise'])
    print('t4', R['t4'], R['v1_inference'], R['train_cost'])
    print(R['codestral_gain'], R['fullft_gain'], R['alpaca'], R['cot'], R['gsm8k_t2'])
    print({k: v for k, v in R['gains'].items()})
