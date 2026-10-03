"""Every derived number about the paper's evidence that the page quotes, recomputed from the paper's own tables and the
figures decoded by decode_figs.py. usage: python3 recompute.py  ->  inputs/recompute.json (and a printed summary)"""
import json, math
T = json.load(open('tables.json')); F = json.load(open('inputs/figs.json'))
pc = lambda s: float(s.rstrip('%'))
R = {}
# --- corpus sizes (Table 1, §1.1, §2.1): "almost 7 times" Minerva's math web pages (17.5B tokens, Lewkowycz et al. 2022 Table 2) and "9 times" OpenWebMath
R['corpus_vs_owm'] = 120.2 / 13.6; R['corpus_vs_minerva_web'] = 120.2 / 17.5; R['tokens_per_page'] = 120e9 / 35.5e6
# 500B tokens at 56% from the corpus = 280B tokens drawn from a 120.2B-token corpus: about 2.3 passes
R['corpus_epochs_in_base'] = 500 * 0.56 / 120.2
# Table 1: gains over no math training, and the DeepSeekMath Corpus's lead over the next best per benchmark
t1 = {r['label']: [pc(v) for v in r['v'][1:]] for r in T['T1']['rows']}
R['t1_lead_over_next'] = [round(t1['DeepSeekMath Corpus'][i] - max(t1[k][i] for k in t1 if k not in ('DeepSeekMath Corpus',)), 1) for i in range(8)]
# --- Table 2: MATH lead of the 7B base over Llemma 34B and Minerva 540B; size ratio 540/7
t2 = {(r['label'], r.get('size')): r['v'] for r in T['T2']['rows']}
R['base_math_vs_llemma34'] = pc(t2[('DeepSeekMath-Base', '7B')][1]) - pc(t2[('Llemma', '34B')][1])
R['base_math_vs_minerva540'] = pc(t2[('DeepSeekMath-Base', '7B')][1]) - pc(t2[('Minerva', '540B')][1])
R['minerva_size_ratio'] = 540 / 7
# --- Table 5: RL against Instruct, and Instruct's MATH lead
t5 = {}
for r in T['T5']['rows']: t5[(r['half'], r['label'])] = r['v']
cot = lambda n: [pc(v) if v not in ('-',) else None for v in t5[('Chain-of-thought', n)]]
R['rl_minus_instruct_cot'] = [round(a - b, 1) for a, b in zip(cot('DeepSeekMath-RL'), cot('DeepSeekMath-Instruct'))]
tool = lambda n: [pc(v) for v in t5[('Tool-integrated', n)]]
R['rl_minus_instruct_tool'] = [round(a - b, 1) for a, b in zip(tool('DeepSeekMath-RL'), tool('DeepSeekMath-Instruct'))]
open_cot = [(n, cot(n)[1]) for (h, n) in t5 if h == 'Chain-of-thought' and n not in ('DeepSeekMath-Instruct', 'DeepSeekMath-RL') and t5[(h, n)] and True]
R['instruct_math_lead_over_best_other_open'] = cot('DeepSeekMath-Instruct')[1] - max(v for n, v in open_cot[8:])
R['instruct_math_vs_inflection2'] = cot('DeepSeekMath-Instruct')[1] - cot('Inflection-2')[1]
R['instruct_math_vs_gemini_pro'] = cot('DeepSeekMath-Instruct')[1] - cot('Gemini Pro')[1]
# --- binomial standard errors at the benchmarks' test-set sizes (GSM8K 1,319; MATH 5,000: the standard test splits; the paper does not state its split)
se = lambda p, n: 100 * math.sqrt(p / 100 * (1 - p / 100) / n)
R['se_math_517'] = se(51.7, 5000); R['se_gsm_882'] = se(88.2, 1319)
R['z_rl_vs_instruct_math'] = (51.7 - 46.8) / math.sqrt(se(51.7, 5000) ** 2 + se(46.8, 5000) ** 2)
# --- Figure 5 (1.3B, decoded): final points, mean of the last 10 checkpoints, checkpoint-to-checkpoint noise
f5 = F['combined_figure_rl']['panels']; out5 = {}
for bench, n in (('GSM8K', 1319), ('MATH', 5000)):
    for s, pts in f5[bench]['series'].items():
        ys = [y for _, y in pts]; d = [ys[i + 1] - ys[i] for i in range(len(ys) - 1)]
        jitter = math.sqrt(sum(x * x for x in d[-20:]) / 20 / 2)  # sd of one checkpoint around a slowly varying mean, from successive differences
        out5[bench + ':' + s] = {'final': ys[-1], 'last10_mean': sum(ys[-10:]) / 10, 'max': max(ys), 'start': ys[0], 'jitter_sd': jitter, 'binomial_se_at_final': se(ys[-1], n), 'n_points': len(ys), 'last_step': pts[-1][0]}
R['fig5'] = out5
g = lambda b, a, c: out5[b + ':' + a]['last10_mean'] - out5[b + ':' + c]['last10_mean']
R['fig5_gaps_last10'] = {b: {'GRPO+OS - Online RFT': g(b, 'GRPO+OS', 'Online RFT'), 'GRPO+PS - GRPO+OS': g(b, 'GRPO+PS', 'GRPO+OS'), 'Online RFT - RFT': g(b, 'Online RFT', 'RFT')} for b in ('GSM8K', 'MATH')}
# --- Figure 6 (7B, decoded): each iteration's start, end and best
f6 = F['iter_rl']['panels']
R['fig6'] = {b + ':' + s: {'start': p[0], 'end': p[-1], 'best': max(p, key=lambda x: x[1])} for b in f6 for s, p in f6[b]['series'].items()}
# --- Figure 7 (decoded): Maj@K and Pass@K, RL minus Instruct
f7 = F['combined_MAJ_PASS']['panels']
R['fig7'] = {b: {s: [y for _, y in p] for s, p in f7[b]['series'].items()} for b in f7}
R['fig7_rl_minus_instruct'] = {b: {k: [round(a - c, 1) for a, c in zip(R['fig7'][b][k + '-RL'], R['fig7'][b][k + '-Instruct'])] for k in ('Maj@K', 'Pass@K')} for b in f7}
# --- memory: PPO against GRPO for a 7B policy (derived; the paper gives no number)
cfg = json.load(open('inputs/hf_config_rl.json'))
H, I, Lr, V = cfg['hidden_size'], cfg['intermediate_size'], cfg['num_hidden_layers'], cfg['vocab_size']
nparam = 2 * V * H + Lr * (4 * H * H + 3 * H * I + 2 * H) + H
R['params_7b'] = nparam
GB = 1e9; train_b, frozen_b = 16, 2  # mixed-precision Adam: 2 + 2 + 12 bytes per trained parameter (ZeRO paper §3.1); bf16 for a frozen model
R['mem_ppo_gb'] = (2 * train_b + 2 * frozen_b) * nparam / GB  # policy and value model trained; reference and reward model frozen
R['mem_grpo_gb'] = (1 * train_b + 2 * frozen_b) * nparam / GB  # policy trained; reference and reward model frozen
R['mem_saving'] = 1 - R['mem_grpo_gb'] / R['mem_ppo_gb']
# --- GAE: weight of the final reward in the advantage of token t, gamma = 1: lambda^(L - 1 - t)
R['gae_first_token_weight'] = {str(L): {str(l): l ** (L - 1) for l in (0.95, 0.99, 1.0)} for L in (3, 1024, 8192)}
# --- zero-signal groups: a question solved with probability p gives a group with all-equal rewards with probability p^G + (1 - p)^G
R['zero_signal'] = {str(G): {str(p): p ** G + (1 - p) ** G for p in (0.05, 0.5, 0.9, 0.95)} for G in (4, 8, 16, 64)}
# --- worked GRPO example at G = 4, one correct (matches the Topic: llms widget): population std as there; the toy uses the unbiased std
r = [1, 0, 0, 0]; mu = sum(r) / 4; sdp = math.sqrt(sum((x - mu) ** 2 for x in r) / 4); sdu = math.sqrt(sum((x - mu) ** 2 for x in r) / 3)
R['grpo_example'] = {'pop_std': [(x - mu) / sdp for x in r], 'unbiased_std': [(x - mu) / sdu for x in r]}
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
for k, v in R.items():
    if k not in ('fig5', 'fig6', 'fig7', 'zero_signal'): print(k, json.dumps(v)[:200])
print('fig5 gaps', json.dumps(R['fig5_gaps_last10']))
for k, v in R['fig5'].items(): print(k, {a: round(b, 2) if isinstance(b, float) else b for a, b in v.items()})
