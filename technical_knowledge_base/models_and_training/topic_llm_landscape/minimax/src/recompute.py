"""Recompute every default the MiniMax page reproduces, from the configs in src/ and the formulas on the page."""
import json
KiB, MiB, GiB = 2**10, 2**20, 2**30
L = lambda f: json.load(open('inputs/' + f))
t01, m2, m27, m3 = L('cfg_MiniMax-Text-01.json'), L('cfg_MiniMax-M2.json'), L('cfg_MiniMax-M2.7.json'), L('cfg_MiniMax-M3.json')['text_config']
print('== KV cache and state')
n_soft = sum(t01['attn_type_list']); n_lin = len(t01['attn_type_list']) - n_soft
print('Text-01 softmax layers', n_soft, 'lightning', n_lin)
kv01 = n_soft * 2 * t01['num_key_value_heads'] * t01['head_dim'] * 2
print('Text-01 KV/token', kv01, kv01 / KiB, 'KiB; all-80', 80 * 2 * 8 * 128 * 2 / KiB, 'KiB')
print('Text-01 at 1,048,576 tokens', kv01 * 2**20 / GiB, 'GiB vs', 80 * 4096 * 2**20 / GiB)
st = n_lin * t01['num_attention_heads'] * 128 * 128
print('state elements', st, 'bytes bf16', st * 2 / MiB, 'MiB')
kv2 = m2['num_hidden_layers'] * 2 * m2['num_key_value_heads'] * m2['head_dim'] * 2
print('M2 KV/token', kv2 / KiB, 'KiB; at 196,608', kv2 * 196608 / GiB, 'GiB; ratio to 01', kv2 / kv01)
print('M2.7 max_position', m27['max_position_embeddings'], 'M2', m2['max_position_embeddings'])
kv3 = m3['num_hidden_layers'] * 2 * m3['num_key_value_heads'] * m3['head_dim'] * 2
sa = m3['sparse_attention_config']; n_msa = sum(sa['sparse_attention_freq'])
idx = n_msa * 1 * sa['sparse_index_dim'] * 2  # one shared index key head per MSA layer, BF16 assumed
print('M3 KV/token', kv3 / KiB, 'KiB; 1M', kv3 * 2**20 / GiB, 'GiB; MSA layers', n_msa, 'index keys/token', idx, idx / KiB, 'KiB', idx / kv3)
print('== Lightning')
n, d, B = 2**20, 128, 256
print('n^2 d', n * n * d, 'n d (d+B)', n * d * (d + B), 'ratio', n / (d + B))
q, k, v = [1, 2, 1, 3], [1, 1, 2, 1], [2, 1, 1, 3]
kvp = [a * b for a, b in zip(k, v)]; s = 0; o = []
for i in range(4): s += kvp[i]; o.append(q[i] * s)
print('toy o', o)
print('== MSA per query (page formula, multiply-adds)')
H, dh, kB, Hi, di = 64, 128, 16 * 128, 4, 128
Cf = 2 * H * dh * n; Cm = 2 * H * dh * kB + Hi * di * n
print('Cfull', Cf, 'Cmsa', Cm, 'ratio', Cf / Cm, 'index share', Hi * di * n / Cm, 'read share 1 in', n / kB)
print('== MSA paper eq.12, per token averaged over a prefill of N (FLOPs)')
Hkv = 4
F_gqa = 2 * H * dh * n * n; F_msa = Hkv * di * n * n + 4 * H * dh * n * kB
print('paper ratio at 1M (reproduces 28.4x)', F_gqa / F_msa)
for N in [32768, 131072, 524288, 2**20]:
    print('  N', N, (2 * H * dh * N * N) / (Hkv * di * N * N + 4 * H * dh * N * kB))
print('== Kernel arithmetic intensity (paper eqs 13-16, BF16 IO)')
G = H // Hkv; k_ = 16; Bk = 128
qo = (4 * H * k_ * Bk) / (4 * H + 4 * Hkv * k_ * Bk)
ko = (4 * H * k_ * Bk) / (4 * Hkv + 4 * H * k_ + 2 * H * (k_ + 1))
print('G', G, 'Q-outer', qo, 'KV-outer', ko, 'approx 2/3 Bk', 2 / 3 * Bk)
print('== Generation-level attention compute per decoded token at n (multiply-adds, summed over layers)')
def att_m2(n): return 62 * 2 * 48 * 128 * n
def att_m3(n, full_layers=3):
    return full_layers * 2 * 64 * 128 * n + (60 - full_layers) * (2 * 64 * 128 * min(n, kB) + 4 * 128 * n)
def att_01(n): return 10 * 2 * 64 * 128 * n + 70 * 64 * (2 * 128 * 128)  # state: read q S and update k v^T, per head
for N in [32768, 196608, 2**20]:
    print(' n', N, 'M2', att_m2(N), 'M3', att_m3(N), 'ratio M2/M3', att_m2(N) / att_m3(N), 'if all 60 MSA', att_m2(N) / att_m3(N, 0), 'M2/01', att_m2(N) / att_01(N))
print('== Parameters from config')
def m3p():
    h = 6144; att = h * (64 * 128) + 2 * h * (4 * 128) + (64 * 128) * h
    idxp = h * (4 * 128) + h * 128
    e = 3 * h * 3072; dense = 3 * h * 12288; router = h * 128
    emb = 200064 * h * 2
    tot = 60 * (att + idxp) + 57 * (128 * e + e + router) + 3 * dense + emb
    act = 60 * (att + idxp) + 57 * (5 * e + router) + 3 * dense
    return tot, act, emb
def m2p():
    h = 3072; att = h * (48 * 128) + 2 * h * (8 * 128) + 48 * 128 * h
    e = 3 * h * 1536; router = h * 256; emb = 200064 * h * 2
    tot = 62 * (att + 256 * e + router) + emb
    act = 62 * (att + 8 * e + router)
    return tot, act, emb
def t01p():
    h = 6144; att = h * 64 * 128 * 5  # qkv_proj, output_gate, out_proj in lightning layers (modeling_minimax_text_01.py)
    soft = h * 64 * 128 * 2 + 2 * h * 8 * 128
    e = 3 * h * 9216; router = h * 32; emb = 200064 * h * 2
    tot = 70 * att + 10 * soft + 80 * (32 * e + router) + emb
    act = 70 * att + 10 * soft + 80 * (2 * e + router)
    return tot, act, emb
for nm, f in [('Text-01', t01p), ('M2', m2p), ('M3 text', m3p)]:
    tot, act, emb = f()
    print(nm, 'total %.1fB' % (tot / 1e9), 'active excl emb %.2fB' % (act / 1e9), 'incl output emb %.2fB' % ((act + emb / 2) / 1e9))
print('HF safetensors totals: Text-01 456.09B, M2 228.69B (FP8 + BF16 + F32 scales), M3 427.04B')
print('== CISPO example')
r, eps = 2.5, 0.2
print('PPO weight', 0 if r > 1 + eps else r, 'CISPO', min(r, 1 + eps))
print('== Prices (per M tokens, MiniMax pay-as-you-go read 1 Oct 2026)')
def cost(inp, out, cached=0, model='M3'):
    if model == 'M3':
        pi, po, pc = (0.30, 1.20, 0.06) if inp <= 512000 else (0.60, 2.40, 0.12)
    else:
        pi, po, pc = 0.30, 1.20, 0.06
    return ((inp - cached) * pi + cached * pc + out * po) / 1e6
print('M3 100K in 4K out', cost(100000, 4000), 'M3 600K in', cost(600000, 4000))
print('== Decode bytes read per layer at n = 1M, paper / M3 head shape (BF16)')
n = 2**20; full = 2 * 4 * 128 * 2 * n; idxr = n * 128 * 2; sel = 4 * 16 * 128 * 2 * 128 * 2
print('full', full / GiB, 'GiB; MSA index keys', idxr / MiB, 'MiB + selected', sel / MiB, 'MiB; ratio', full / (idxr + sel))
print('== SWA ablation diffs (M2 report Tables 2, 3)')
T2 = [('HELMET ICL',75.8,72.7),('MMLU',85.5,85.6),('MATH',60.3,60.3),('RULER 128K CWE',90.0,72.0),('RULER 128K MQ',99.0,93.0),('RULER 32K CWE',99.0,99.0),('RULER 32K MQ',99.0,99.0),('MTOB K-e Bleurt',60.0,45.0),('MTOB e-k ChrF',44.8,27.2)]
print([(a, round(c - b, 1)) for a, b, c in T2])
