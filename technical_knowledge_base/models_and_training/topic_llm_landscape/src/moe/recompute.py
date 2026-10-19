# Recompute every default the HTML reproduces, from the config.json files in src/ and the page's formulas.
import json, math
S = 'inputs/'
def cfg(n):
    c = json.load(open(S + n)); return c.get('text_config', c)

def mla(c):
    d, H = c['hidden_size'], c['num_attention_heads']
    nope, rope, vd = c['qk_nope_head_dim'], c['qk_rope_head_dim'], c['v_head_dim']
    ql, kl = c['q_lora_rank'], c['kv_lora_rank']
    q = d * ql + ql + ql * H * (nope + rope) if ql else d * H * (nope + rope)
    kv = d * (kl + rope) + kl + kl * H * (nope + vd)
    o = H * vd * d
    return q + kv + o + 2 * d  # plus the two RMSNorms of the block

def gqa(c, qknorm=False, bias=False, sinks=False):
    d, H, KV = c['hidden_size'], c['num_attention_heads'], c['num_key_value_heads']
    hd = c.get('head_dim') or d // H
    p = d * H * hd + 2 * d * KV * hd + H * hd * d + 2 * d
    if qknorm: p += 2 * hd
    if bias: p += H * hd + 2 * KV * hd + d
    if sinks: p += H
    return p

def model(name, L, Lmoe, d, N, k, Ns, dff, dff_s, dff_dense, attn, V, tied=False, ebias=False, rbias=False):
    PE = 3 * d * dff + (2 * dff + d if ebias else 0)
    PS = 3 * d * dff_s
    R = d * N + (N if rbias else 0)
    moe_total = Lmoe * (N * PE + Ns * PS + R)
    moe_active = Lmoe * (k * PE + Ns * PS + R)
    dense_ffn = (L - Lmoe) * 3 * d * dff_dense
    emb = V * d * (1 if tied else 2) + d
    rest = L * attn + dense_ffn + emb
    T, A = moe_total + rest, moe_active + rest
    print(f'{name:22s} total {T/1e9:8.2f}B active {A/1e9:7.2f}B ratio {T/A:5.1f}x  expert {PE/1e6:7.2f}M  attn/layer {attn/1e6:7.2f}M  rest {rest/1e9:6.2f}B  experts share of total {moe_total/T*100:4.1f}% of active {moe_active/A*100:4.1f}%')
    return T, A

c = cfg('cfg_DeepSeek-V3.json')
model('DeepSeek-V3', 61, 58, 7168, 256, 8, 1, 2048, 2048, 18432, mla(c), 129280)
print('  V3 MLA per layer', mla(c), ' router share of a MoE layer', 7168*256/(257*3*7168*2048+7168*256))
c = cfg('k2_config.json')
model('Kimi K2', 61, 60, 7168, 384, 8, 1, 2048, 2048, 18432, mla(c), 163840)
c = cfg('cfg_GLM-5.2.json')
print('  GLM-5.2 has a DSA indexer per layer, not counted here')
model('GLM-5.2 (no indexer)', 78, 75, 6144, 256, 8, 1, 2048, 2048, 12288, mla(c), 154880)
c = cfg('cfg_Mixtral-8x7B.json')
model('Mixtral 8x7B', 32, 32, 4096, 8, 2, 0, 14336, 0, 0, gqa(c), 32000)
c = cfg('cfg_Qwen3-235B-A22B.json')
model('Qwen3-235B-A22B', 94, 94, 4096, 128, 8, 0, 1536, 0, 0, gqa(c, qknorm=True), 151936)
c = cfg('cfg_gpt-oss-120b.json')
model('gpt-oss-120b', 36, 36, 2880, 128, 4, 0, 2880, 0, 0, gqa(c, bias=True, sinks=True), 201088, ebias=True, rbias=True)
c = cfg('cfg_gpt-oss-20b.json')
model('gpt-oss-20b', 24, 24, 2880, 32, 4, 0, 2880, 0, 0, gqa(c, bias=True, sinks=True), 201088, ebias=True, rbias=True)
c = cfg('cfg_Llama-4-Maverick.json')
model('Llama 4 Maverick text', 48, 24, 5120, 128, 1, 1, 8192, 8192, 16384, gqa(c), 202048)

print('\n== Worked examples')
s = [2.0, 1.0, 0.5, -1.0]
e = [math.exp(x) for x in s]; p = [x/sum(e) for x in e]
print('softmax p', [round(x, 3) for x in p], 'sum e', round(sum(e), 3), 'g', round(p[0]/(p[0]+p[1]), 3), round(p[1]/(p[0]+p[1]), 3))
sg = [1/(1+math.exp(-x)) for x in s]
print('sigmoid', [round(x, 3) for x in sg], 'g', round(sg[0]/(sg[0]+sg[1]), 3), round(sg[1]/(sg[0]+sg[1]), 3))
T, N, k, CF = 4096, 64, 2, 1.25
avg = k*T/N; C = CF*avg; print('capacity avg', avg, 'C', C, 'hot 200 drops', 200-C, 'cold 60 pads', C-60, 'CF2', 2*avg)
print('aux collapsed', 4*sum(f*q for f, q in zip([1, 0, 0, 0], [.7, .1, .1, .1])))
print('decode tokens/expert', 256*8/256, 'bytes per token per layer', 8*7168*2/1024, 'KiB')
print('combinations C(256,8)', f'{math.comb(256,8):.3e}', 'C(8,2)', math.comb(8, 2), 'C(384,8)', f'{math.comb(384,8):.3e}', 'C(896,16)', f'{math.comb(896,16):.3e}')
print('V3 memory GB bf16 fp8 4bit', 671.0*2, 671.0, 671.0/2)

print('\n== Landscape ratios (total / active)')
L = [('Mixtral 8x7B', 46.7, 12.9), ('DeepSeek-V3', 671, 37), ('Llama 4 Maverick', 400, 17), ('Qwen3 235B', 235, 22), ('Kimi K2', 1000, 32),
     ('gpt-oss-120b', 117, 5.1), ('GLM-5.2', 744, 40), ('V4 Pro', 1600, 49), ('V4 Flash', 284, 13), ('Qwen3.8-Max', 2400, 95), ('Kimi K3', 2800, 104),
     ('GLM-5.3-Flash', 320, 18), ('Hy4 preview', 770, 49), ('Qwen3.8-Flash-Next', 125, 6), ('Step 5 Preview', 600, 27), ('MiMo-V2.6-Pro', 1020, 42),
     ('V4.1-Flash prefill', 552, 8), ('V4.1-Flash decode', 552, 16)]
for n, t, a in L: print(f'{n:20s} {t/a:5.1f}x  active share {a/t*100:4.1f}%')

print('\n== Global-batch toy (the HTML default): 4 micro-batches, 4 experts, each micro-batch all on one domain expert')
def aux(f, P, N): return N*sum(x*y for x, y in zip(f, P))
mb = [[.7, .1, .1, .1], [.1, .7, .1, .1], [.1, .1, .7, .1], [.1, .1, .1, .7]]
micro = sum(aux(m, m, 4) for m in mb)/4
g = [sum(m[i] for m in mb)/4 for i in range(4)]
print('micro-batch mean', round(micro, 3), 'global', round(aux(g, g, 4), 3))
