"""Recompute every derived number the Megatron-LM page shows. Writes inputs/recompute.json (read by mk_paper.py).
Plain Python 3. Sources: the paper's Tables 1-5, 7, 8, section 4-5 and Appendix E (arXiv 1909.08053v4);
the 16 bytes per parameter of mixed-precision Adam from ZeRO (arXiv 1910.02054, section 3.1);
the FLOPs-per-iteration formula from Narayanan et al. 2021 (arXiv 2104.04473, section 5.1, Equation 3);
activation memory per layer from Korthikanti et al. 2022 (arXiv 2205.05198, section 4.1)."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
R = {}

# ---- GPT-2 parameter counts (Tables 1 and 2), padded vocabulary 51,200, 1,024 positions ----
def gpt_params(h, l, V=51200, s=1024):
    layer = 12 * h * h + 13 * h          # QKV 3h^2+3h, out h^2+h, MLP 8h^2+5h, two LayerNorms 4h
    return V * h + s * h + l * layer + 2 * h   # tied embedding, learned positions, final LayerNorm
T1 = [dict(h=1536, a=16, l=40, p='1.2', mp=1, dp=64), dict(h=1920, a=20, l=54, p='2.5', mp=2, dp=128),
      dict(h=2304, a=24, l=64, p='4.2', mp=4, dp=256), dict(h=3072, a=32, l=72, p='8.3', mp=8, dp=512)]
for r in T1:
    r['count'] = gpt_params(r['h'], r['l'])
T2 = [dict(p='355M', l=24, h=1024, a=16, gpus=64, days=0.86), dict(p='2.5B', l=54, h=1920, a=20, gpus=128, days=2.27),
      dict(p='8.3B', l=72, h=3072, a=24, gpus=512, days=2.10)]
for r in T2:
    r['count'] = gpt_params(r['h'], r['l'])
R['gpt_params'] = {r['p']: r['count'] for r in T1}
R['gpt_params_t2'] = {r['p']: r['count'] for r in T2}

# ---- BERT parameter counts (Table 4): vocab 30,522, 512 positions, 2 token types, pooler, MLM transform and bias, SOP head ----
def bert_params(h, l, V=30522, s=512):
    emb = V * h + s * h + 2 * h + 2 * h          # word, position, type, embedding LayerNorm
    layer = 12 * h * h + 13 * h
    heads = (h * h + h) + (h * h + h + 2 * h + V) + (2 * h + 2)   # pooler; MLM dense + LN + output bias (tied); SOP classifier
    return emb + l * layer + heads
T4 = [dict(p='336M', l=24, h=1024, a=16, gpus=128), dict(p='1.3B', l=24, h=2048, a=32, gpus=256), dict(p='3.9B', l=48, h=2560, a=40, gpus=512)]
for r in T4:
    r['count'] = bert_params(r['h'], r['l'])
R['bert_params'] = {r['p']: r['count'] for r in T4}

# ---- Memory per GPU under t-way tensor parallelism (Table 1's GPU column) ----
# weights + gradients + Adam state in mixed precision: 2 + 2 + (4 + 4 + 4) = 16 bytes per parameter (ZeRO section 3.1), divided by t
# activations with checkpointing after every layer: one fp16 layer input per layer (2 s b h bytes; Megatron does not split it)
# plus one layer's full activations during its recomputation, s b h (10 + 24/t + 5 a s / (h t)) bytes (Korthikanti et al., Eq. 2 with TP)
GB = 1e9
def mem(h, l, a, t, b=8, s=1024, P=None):
    P = P or gpt_params(h, l)
    states = 16 * P / t
    ckpt = l * 2 * s * b * h
    layer = s * b * h * (10 + 24 / t + 5 * a * s / (h * t))
    return dict(states=states, ckpt=ckpt, layer=layer, total=states + ckpt + layer)
R['mem'] = {}
for r in T1:
    R['mem'][r['p']] = {str(t): mem(r['h'], r['l'], r['a'], t)['total'] / GB for t in (1, 2, 4, 8, 16)}
    fits = [t for t in (1, 2, 4, 8, 16) if mem(r['h'], r['l'], r['a'], t)['total'] < 32 * GB]
    r['min_t'] = fits[0]
R['min_t'] = {r['p']: r['min_t'] for r in T1}
R['min_t_matches_table1'] = all(r['min_t'] == r['mp'] for r in T1)

# ---- Throughput implied by Table 2's time per epoch ----
# FLOPs per iteration with full activation recomputation (Narayanan et al. 2021, Eq. 3): 96 B s l h^2 (1 + s/(6h) + V/(16 l h))
def flops_iter(B, s, l, h, V=51200):
    return 96 * B * s * l * h * h * (1 + s / (6 * h) + V / (16 * l * h))
ITERS_EPOCH = 68507
R['tokens_epoch'] = ITERS_EPOCH * 512 * 1024
R['t2'] = {}
for r in T2:
    F = flops_iter(512, 1024, r['l'], r['h'])
    sec = r['days'] * 86400 / ITERS_EPOCH
    R['t2'][r['p']] = dict(flops_iter=F, sec_iter=sec, pflops=F / sec / 1e15, tflops_gpu=F / sec / r['gpus'] / 1e12,
                           train_days=r['days'] * 300000 / ITERS_EPOCH)
R['epochs_300k'] = 300000 / ITERS_EPOCH

# ---- Scaling efficiency: the abstract's 76% against Figure 5's 74% ----
R['eff_from_15_1'] = 15.1e15 / (512 * 39e12)
R['pf_at_74'] = 0.74 * 512 * 39e12 / 1e15
R['peak_v100_dgx2h'] = 39 / 0.30          # TFLOPS implied by "39 TeraFLOPs ... 30% of peak"
FIG5 = {'mp': {1: 1.00, 2: 0.95, 4: 0.82, 8: 0.77}, 'mpdp': {64: 0.96, 128: 0.83, 256: 0.79, 512: 0.74}}
R['fig5_pflops'] = {k: {str(n): e * n * 39e12 / 1e15 for n, e in v.items()} for k, v in FIG5.items()}
# Table 8: strong scaling of the 1.2B model at batch 8
T8 = {1: 1.0, 2: 1.64, 4: 2.34, 8: 2.98}
R['t8_eff'] = {str(n): s / n for n, s in T8.items()}

# ---- Communication per layer ----
# Megatron: 2 all-reduces forward (g after attention, g after MLP) + 2 backward (f), each over a b x s x h fp16 activation.
# Ring all-reduce moves 2 (t-1)/t of the buffer per GPU. Recomputation reruns the forward ones (our reading, not the paper's count).
def ar_bytes(b, s, h, t):
    return 2 * (t - 1) / t * b * s * h * 2
R['ar_8_3B_t8_b8'] = ar_bytes(8, 1024, 3072, 8)
# Strawman: the paper's "option 1" (split A by rows, X by columns) used for every GEMM: a sync after each GEMM, on its output.
# Outputs per layer: QKV 3h, attention out h, MLP first 4h, MLP second h -> 9 b s h in the forward pass against Megatron's 2 b s h.
R['naive_fwd_elems_per_bsh'] = 3 + 1 + 4 + 1
R['megatron_fwd_elems_per_bsh'] = 2

# ---- Logits: all-gather b s v against the fused loss's b s ----
b, s, v = 8, 1024, 51200
R['logit_allgather'] = b * s * v
R['fused_paper'] = b * s
R['fused_code'] = 3 * b * s            # max, target logit, sum of exp (cross_entropy.py)
R['vocab_pad'] = dict(orig=50257, mult=128 * 8, padded=math.ceil(50257 / 1024) * 1024, per_gpu=math.ceil(50257 / 1024) * 1024 // 8)

# ---- Appendix E: WikiText103 normalisation ----
R['wt103'] = dict(T=270329, To=245566, ratio=270329 / 245566)
# a perplexity normalised by T_o is exp(L/T_o) = exp(L/T)^(T/T_o): what 10.81 would be per subword token
R['wt103']['ppl_per_token_if_10_81'] = 10.81 ** (245566 / 270329)

# ---- Table 3 and Table 5 deltas ----
R['t3'] = dict(wt_gain=15.79 - 10.81, wt_rel=1 - 10.81 / 15.79, lam_gain=66.51 - 63.24)
R['t5'] = dict(race_single_gain=89.5 - 86.5, race_ens_gain=90.9 - 89.4)
# Residual scaling at init: 1/sqrt(2N), N = layers
R['res_scale_8_3B'] = 1 / math.sqrt(2 * 72)

out = os.path.join(HERE, 'inputs', 'recompute.json')
json.dump(R, open(out, 'w'), indent=1)
if __name__ == '__main__':
    for r in T1: print('T1', r['p'], f"{r['count']/1e9:.3f}B", 'min t', r['min_t'], 'table', r['mp'], {k: round(x, 1) for k, x in R['mem'][r['p']].items()})
    for r in T2: print('T2', r['p'], f"{r['count']/1e9:.3f}B", {k: (round(x, 3) if isinstance(x, float) else x) for k, x in R['t2'][r['p']].items()})
    for r in T4: print('T4', r['p'], f"{r['count']/1e9:.3f}B")
    for k in ('eff_from_15_1', 'pf_at_74', 'peak_v100_dgx2h', 'tokens_epoch', 'epochs_300k', 'ar_8_3B_t8_b8', 'vocab_pad', 'wt103', 't8_eff', 'fig5_pflops', 'min_t_matches_table1', 'res_scale_8_3B'):
        print(k, R[k])
