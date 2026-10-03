#!/usr/bin/env python3
"""Recompute every default the Distributed Training page shows.

Run from src/: python3 recompute.py  (writes recompute.json; check_calc.mjs compares the page's JS against it).
GB = 1e9 bytes throughout (the ZeRO paper's convention).
Sources are in inputs/extracts.txt and the paper pages named beside each block.
"""
import json, math

GB = 1e9

# ---------- model configurations (config.json files; Llama 3 paper page inputs) ----------
def llama(L, h, f, nh, kv, V=128256, hd=128):
    attn = h * (h + 2 * kv * hd) + h * h
    mlp = 3 * h * f
    per_layer = attn + mlp + 2 * h
    total = 2 * V * h + L * per_layer + h
    return dict(L=L, h=h, f=f, nh=nh, hkv=kv * hd, V=V, P=total, Pexp=0, Pact=total, k=0, E=0, moeL=0,
                attn=attn, mlp=mlp, emb=2 * V * h)

M = {
    'llama3_8b': llama(32, 4096, 14336, 32, 8),
    'llama3_70b': llama(80, 8192, 28672, 64, 8),
    'llama3_405b': llama(126, 16384, 53248, 128, 8),
}
# DeepSeek-V3: counts from the DeepSeek-V3 paper page's recount of config.json (recompute.json there)
ds_total = 671026419200
ds_routed = 653908770816
ds_active = 37552282624
M['deepseek_v3'] = dict(L=61, h=7168, f=18432, nh=128, hkv=128 * 128, V=129280, P=ds_total, Pexp=ds_routed, Pact=ds_active,
                         k=8, E=256, moeL=58)
# ZeRO paper's 7.5B example: only the parameter count matters (model states only)
M['zero_7p5b'] = dict(L=0, h=0, f=0, nh=0, hkv=0, V=0, P=7.5e9, Pexp=0, Pact=7.5e9, k=0, E=0, moeL=0)

# ---------- bytes per parameter recipes ----------
RECIPES = {
    'zero16': dict(w=2, g=2, o=12),   # ZeRO §3.1: bf16 weights and grads, fp32 master + two Adam moments
    'llama18': dict(w=2, g=4, o=12),  # our reading of Llama 3 §3.3.2: FP32 gradient accumulation and FP32 reduce-scatter
    'mtnlg20': dict(w=2, g=4, o=14),  # MT-NLG §2.1.1: (2+4) weights, (2+4) gradients, (4+4) Adam = 20; grouped here as w2, g4, o14
    'ds14': dict(w=2, g=4, o=8),      # our reading of DeepSeek-V3 §3.3: FP32 master and gradients, BF16 moments (+ an assumed bf16 working copy)
}

GPUS = {
    'h100': dict(mem=80, nv=450, ib=50, peak=989.5e12),  # NVIDIA H100 SXM: NVLink 900 GB/s total (450 each way), 400 Gb/s NIC = 50 GB/s, BF16 dense
    'h800': dict(mem=80, nv=160, ib=50, peak=989.5e12),  # DeepSeek-V3 §3.2.2: NVLink 160 GB/s, IB 50 GB/s
}

def layout(model, TP=1, CP=1, PP=1, DP=1, EP=1, zero=0, recipe='zero16', s=8192, b=1, m=1, ckpt='store',
           gpu='h100', mfu=0.4, copies=1, inflight=None, disp_bytes=2, gpn=8, acts=True):
    md = M[model]; r = RECIPES[recipe]; G = GPUS[gpu]
    N = TP * CP * PP * DP
    Pd = md['P'] - md['Pexp']; Pe = md['Pexp']
    pd = Pd / (TP * PP) * copies           # dense parameters held per GPU
    pe = Pe / (EP * PP * TP) * copies if Pe else 0.0
    Dd = DP * CP                            # ZeRO shards over the data-parallel group (with CP ranks, as Megatron does)
    De = max(1, DP * CP // EP)
    def states(p, D):
        w = r['w'] * p / (D if zero >= 3 else 1)
        g = r['g'] * p / (D if zero >= 2 else 1)
        o = r['o'] * p / (D if zero >= 1 else 1)
        return w, g, o
    wd, gd, od = states(pd, Dd); we, ge, oe = states(pe, De)
    W, Gr, O = wd + we, gd + ge, od + oe
    # activations: Korthikanti et al. 34 sbh per layer with SP (FlashAttention: no s^2 term), divided by TP and CP
    Ls = md['L'] / PP if md['L'] else 0
    infl = inflight if inflight else min(m, PP)
    per_layer = 34 * s * b * md['h'] / (TP * CP)
    if not acts or not md['L']:
        A = 0.0
    elif ckpt == 'full':
        A = Ls * infl * 2 * s * b * md['h'] / (TP * CP) + per_layer
    else:
        A = Ls * infl * per_layer
    # communication per GPU per step (bytes sent), ring factors from nccl-tests
    def ar(n): return 2 * (n - 1) / n
    def rs(n): return (n - 1) / n
    comm = {}
    # data parallel (dense and expert parameters)
    def dp_bytes(p, D):
        if D <= 1 or p == 0: return 0.0
        if zero == 0: return ar(D) * r['g'] * p
        if zero in (1, 2): return rs(D) * r['g'] * p + rs(D) * 2 * p
        return rs(D) * r['g'] * p + rs(D) * 2 * p * 2 * m
    comm['DP'] = dp_bytes(pd, Dd) + dp_bytes(pe, De)
    act_msg = s * b * md['h'] * 2 / CP     # one micro-batch's hidden states in bf16 on a TP group
    comm['TP'] = 4 * ar(TP) * act_msg * Ls * m if TP > 1 else 0.0
    comm['CP'] = 2 * rs(CP) * (2 * s * b * md['hkv'] * 2 / TP) * Ls * m if CP > 1 else 0.0
    comm['PP'] = 2 * s * b * md['h'] * 2 / (TP * CP) * m if PP > 1 else 0.0
    if EP > 1 and md['k']:
        T = s * b / (CP * TP)
        fwd = T * md['k'] * md['h'] * (disp_bytes + 2) * (EP - 1) / EP
        bwd = T * md['k'] * md['h'] * (2 + 2) * (EP - 1) / EP
        comm['EP'] = (fwd + bwd) * (md['moeL'] / PP) * m
    else:
        comm['EP'] = 0.0
    # which link each axis uses: innermost-first order TP, CP, EP, PP, DP (Llama 3 §3.3.2 for the dense axes; EP inside DP, DeepSeek-style)
    span = {'TP': TP, 'CP': TP * CP, 'EP': TP * CP * EP, 'PP': TP * CP * EP * PP, 'DP': N}
    link = {k: ('nv' if span[k] <= gpn else 'ib') for k in span}
    t = {k: comm[k] / ((G['nv'] if link[k] == 'nv' else G['ib']) * GB) for k in comm}
    tokens = DP * m * b * s
    t_comp = 6 * md['Pact'] * tokens / (N * G['peak'] * mfu) if md['L'] else 0.0
    return dict(N=N, pd=pd, pe=pe, W=W / GB, G=Gr / GB, O=O / GB, states=(W + Gr + O) / GB, A=A / GB,
                total=(W + Gr + O + A) / GB, comm={k: v / GB for k, v in comm.items()}, link=link,
                t={k: v for k, v in t.items()}, tokens=tokens, t_comp=t_comp)

PRESETS = {
    'zero75': dict(model='zero_7p5b', DP=64, zero=1, recipe='zero16', acts=False),
    'l8b_fsdp': dict(model='llama3_8b', DP=8, zero=3, s=8192, b=1, m=4, mfu=0.40),
    'l405_8k_8k': dict(model='llama3_405b', TP=8, PP=16, DP=64, zero=2, recipe='llama18', s=8192, m=32, mfu=0.43),
    'l405_8k_16k': dict(model='llama3_405b', TP=8, PP=16, DP=128, zero=2, recipe='llama18', s=8192, m=16, mfu=0.41),
    'l405_128k': dict(model='llama3_405b', TP=8, CP=16, PP=16, DP=8, zero=2, recipe='llama18', s=131072, m=16, mfu=0.38),
    'dsv3': dict(model='deepseek_v3', PP=16, DP=128, EP=64, zero=1, recipe='ds14', s=4096, m=120, gpu='h800',
                 mfu=0.3427, copies=2, inflight=17, disp_bytes=1),
}

out = {'models': {k: {kk: vv for kk, vv in v.items()} for k, v in M.items()}, 'presets': {}}
for k, p in PRESETS.items():
    p = dict(p); model = p.pop('model')
    out['presets'][k] = layout(model, **p)

# ---------- checks against published figures ----------
chk = {}
# ZeRO Table 1, every cell (independent: 2+2+K with K=12)
zt = {}
for P, name in [(7.5e9, '7.5B'), (128e9, '128B'), (1e12, '1T')]:
    for D in [1, 4, 16, 64, 256, 1024]:
        zt[name + '@' + str(D)] = [round((4 * P + 12 * P / D) / GB, 2), round((2 * P + 14 * P / D) / GB, 2), round(16 * P / D / GB, 2)]
chk['zero_table1'] = zt
# Llama 3 Table 4: GPUs = TP*CP*PP*DP, tokens/batch = DP * batch/DP * seq, MFU = TFLOPs/989
t4 = [(8192, 8, 1, 16, 64, 8192, 32, 430, 0.43), (16384, 8, 1, 16, 128, 8192, 16, 400, 0.41), (16384, 8, 16, 16, 8, 131072, 16, 380, 0.38)]
chk['llama_table4'] = [dict(gpus=g, prod=tp * cp * pp * dp, tokens=dp * bs * sq, mfu=round(tf / 989.5, 4), printed_mfu=mf) for g, tp, cp, pp, dp, sq, bs, tf, mf in t4]
# DeepSeek-V3 layout
chk['deepseek'] = dict(gpus_per_stage=2048 / 16, experts_per_gpu=256 / 64, ep_nodes=64 / 8, nv_over_ib=160 / 50,
                       max_experts=4 * 3.2, tokens_per_step=15360 * 4096,
                       comp_over_comm=out['presets']['dsv3']['t_comp'] / sum(out['presets']['dsv3']['t'].values()))

# ---------- the animation: Llama 3 8B, four GPUs, 4 sequences of 8,192 tokens ----------
md = M['llama3_8b']; P = md['P']; n = 4; s = 8192; h = md['h']; L = md['L']
act_layer = 34 * s * h                           # bytes per layer per sequence (Korthikanti, with FlashAttention)
seq_acts = act_layer * L
x = s * h * 2                                     # one sequence's hidden states, bf16
dense = P - 0  # Llama 3 8B
moe_twin_ffn = md['mlp'] * L * 4                  # four experts the size of the dense FFN
moe_twin_P = P - md['mlp'] * L + moe_twin_ffn
non_ffn = P - md['mlp'] * L
anim = dict(P=P, act_layer=act_layer, seq_acts=seq_acts, x=x, moe_twin_P=moe_twin_P, non_ffn=non_ffn)
anim['states'] = {
    'DP': 16 * P, 'ZeRO-1': (4 + 12 / n) * P, 'ZeRO-2': (2 + 14 / n) * P, 'ZeRO-3': 16 * P / n,
    'HSDP': 16 * P / 2, 'TP': 16 * P / n, 'PP': 16 * P / n, 'CP': 16 * P, 'EP': 16 * (non_ffn + md['mlp'] * L),
}
anim['sent'] = {
    'DP': 2 * (n - 1) / n * 2 * P,
    'ZeRO-1': 2 * (n - 1) / n * 2 * P, 'ZeRO-2': 2 * (n - 1) / n * 2 * P, 'ZeRO-3': 3 * (n - 1) / n * 2 * P,
    'HSDP_nv': 3 * (1 / 2) * 2 * P, 'HSDP_ib': 2 * (1 / 2) * (2 * P / 2),
    'TP': 4 * L * 2 * (n - 1) / n * (4 * x),        # 4 sequences go through the one TP replica
    'PP': 2 * 4 * x,                                 # an interior stage: 4 micro-batches, activation forward + gradient back
    'CP': 2 * L * (n - 1) / n * (4 * 2 * s * md['hkv'] * 2) + 2 * (n - 1) / n * 2 * P,
    'EP': 4 * L * (n - 1) / n * x + 2 * (n - 1) / n * 2 * non_ffn,
}
anim['sent_long'] = {'EP': 2 * L * (n - 1) / n * (4 * x) + 2 * (n - 1) / n * 2 * non_ffn, 'PP': 2 * 1 * 4 * x}
anim['ep_long_gpu0_acts'] = 4 * seq_acts * 15 / 34 + 4 * seq_acts * 19 / 34 / 4
anim['bubble_pp'] = dict(p=4, m=4, narayanan=(4 - 1) / 4, idle_share=(4 - 1) / (4 + 4 - 1))
anim['long'] = dict(seq=32768, acts=34 * 32768 * h * L)
out['anim'] = {k: (v / GB if isinstance(v, (int, float)) and v > 1e6 else v) for k, v in anim.items()}
out['anim']['states'] = {k: v / GB for k, v in anim['states'].items()}
out['anim']['sent'] = {k: v / GB for k, v in anim['sent'].items()}
out['anim']['sent_long'] = {k: v / GB for k, v in anim['sent_long'].items()}
out['checks'] = chk

# ---------- pipeline bubbles (Narayanan; ZB; DeepSeek Table 2), unit chunk times F=1, B=2 (full backward), W=1 ----------
def bubbles(p, m, v, F=1.0, B=2.0, Wt=1.0):
    ideal = m * (F + B)
    return {'gpipe': (p - 1) / m, '1f1b': (p - 1) / m, 'interleaved': (p - 1) / (v * m),
            'zbh1': (p - 1) * (F + B - 2 * Wt) / ideal,   # DeepSeek Table 2's ZB1P row, B = full backward
            'dualpipe': (p / 2 - 1) * ((F + B) + B - 3 * Wt) / ideal}
out['bubbles_default'] = bubbles(8, 20, 2)
json.dump(out, open('recompute.json', 'w'), indent=1, default=float)

if __name__ == '__main__':
    for k, v in out['presets'].items():
        print(k, 'GPUs', v['N'], 'states %.2f GB, acts %.2f, total %.2f' % (v['states'], v['A'], v['total']),
              'comm', {a: round(b, 2) for a, b in v['comm'].items()}, 't', {a: round(b, 3) for a, b in v['t'].items()}, 'tcomp %.2f' % v['t_comp'])
    print('ZeRO 7.5B@64', chk['zero_table1']['7.5B@64'], '1T@1024', chk['zero_table1']['1T@1024'])
    print('Llama T4', chk['llama_table4'])
    print('DeepSeek', chk['deepseek'])
    print('anim states', {k: round(v, 1) for k, v in out['anim']['states'].items()})
    print('anim sent', {k: round(v, 2) for k, v in out['anim']['sent'].items()})
    print('anim', {k: out['anim'][k] for k in ['P', 'act_layer', 'seq_acts', 'x', 'moe_twin_P', 'non_ffn', 'long', 'bubble_pp']})
    print('bubbles', out['bubbles_default'])
    print('params', {k: v['P'] for k, v in M.items()})
