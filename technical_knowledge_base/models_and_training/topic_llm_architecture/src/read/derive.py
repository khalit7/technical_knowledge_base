"""Derived numbers quoted in the Reading tab, computed from config values (hard-coded here with their source;
check_configs() compares them with src/data/configs/ once the setup agent has saved those files).
Run: python3 derive.py  (writes derived.json beside this file)."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
KiB, MiB, GiB = 1024, 1024**2, 1024**3
# config.json values (Hugging Face repos named in SRC); dh = head_dim
CFG = {
 'llama31_8b':  dict(L=32, d=4096, H=32, kv=8, dh=128, ff=14336, V=128256, tied=False),
 'llama31_70b': dict(L=80, d=8192, H=64, kv=8, dh=128, ff=28672, V=128256, tied=False),
 'dsv3': dict(L=61, d=7168, H=128, dc=512, dr=64, dense_layers=3, ff=18432, moe_ff=2048, E=256, k=8, shared=1, V=129280),
 'gemma3_27b': dict(L=62, local=52, glob=10, kv=16, dh=128, W=1024),
 'gptoss_120b': dict(L=36, local=18, glob=18, kv=8, dh=64, W=128),
 'qwen3next_80b': dict(L=48, attn=12, kv=2, dh=256),
}
SRC = {'llama31_8b': 'meta-llama/Llama-3.1-8B', 'llama31_70b': 'meta-llama/Llama-3.1-70B', 'dsv3': 'deepseek-ai/DeepSeek-V3',
       'gemma3_27b': 'google/gemma-3-27b-pt', 'gptoss_120b': 'openai/gpt-oss-120b', 'qwen3next_80b': 'Qwen/Qwen3-Next-80B-A3B-Instruct'}
T128 = 131072
out = {}
# 1. Attention variants at Llama 3.1 8B's shape (32 layers, 32 query heads of 128), BF16
c = CFG['llama31_8b']; b = 2
per = {'MHA': 2*c['L']*c['H']*c['dh']*b, 'GQA8': 2*c['L']*8*c['dh']*b, 'MQA': 2*c['L']*1*c['dh']*b,
       'MLA': c['L']*(512+64)*b}
out['variants_per_token_bytes'] = per
out['variants_at_128k_bytes'] = {k: v*T128 for k, v in per.items()}
# sliding window 4096 on every layer (illustrative): capped at the window
out['swa4096_all_layers_cap_bytes'] = 2*c['L']*8*c['dh']*b*4096
# 2. Llama 3.1 8B parameters
d, ff, kv, dh, L, V = c['d'], c['ff'], c['kv'], c['dh'], c['L'], c['V']
attn = d*d + 2*d*kv*dh + d*d            # q, k, v, o (no biases)
mlp = 3*d*ff                             # gate, up, down
layer = attn + mlp + 2*d                 # two RMSNorm gains
emb = V*d
total = L*layer + emb + emb + d          # untied unembedding, final norm
out['l8b'] = dict(attn=attn, mlp=mlp, layer=layer, emb=emb, total=total, non_emb=L*layer + d,
                  mlp_share=mlp/layer, kv_per_token=2*L*kv*dh*2, kv_128k=2*L*kv*dh*2*T128)
# FLOPs per token: 2 x non-embedding params (+ unembedding matmul) and attention term 4 L T (H dh) (QK^T and AV, forward)
N = L*layer
out['l8b']['flops_2N'] = 2*(N + emb)
out['l8b']['attn_flops_128k'] = 4*L*T128*c['H']*dh
out['l8b']['crossover_T'] = round(2*(N+emb)/(4*L*c['H']*dh))
# 3. Llama 3.1 70B KV
c = CFG['llama31_70b']
out['l70b'] = dict(kv_per_token=2*c['L']*c['kv']*c['dh']*2, kv_128k=2*c['L']*c['kv']*c['dh']*2*T128,
                   kv_128k_x32=2*c['L']*c['kv']*c['dh']*2*T128*32, weights_bf16=70.6e9*2)
# 4. DeepSeek-V3 MLA vs MHA at its shape
c = CFG['dsv3']
out['dsv3'] = dict(mla_per_token=c['L']*(c['dc']+c['dr'])*2, mha_same_shape=c['L']*2*c['H']*128*2,
                   ratio=round(c['L']*2*c['H']*128*2/(c['L']*(c['dc']+c['dr'])*2), 1))
# 5. windows
for key in ['gemma3_27b', 'gptoss_120b']:
    c = CFG[key]; per_layer = 2*c['kv']*c['dh']*2
    out[key] = dict(headline_per_token=per_layer*c['L'], at128k=per_layer*(c['glob']*T128 + c['local']*min(T128, c['W'])),
                    full_at128k=per_layer*c['L']*T128)
c = CFG['qwen3next_80b']
out['qwen3next'] = dict(kv_per_token=c['attn']*2*c['kv']*c['dh']*2, all_attn_per_token=c['L']*2*c['kv']*c['dh']*2)
# 6. MoE arithmetic for DeepSeek-V3's FFN (one MoE layer), SwiGLU experts of 3 x d x moe_ff
c = CFG['dsv3']; e = 3*c['d']*c['moe_ff']
out['dsv3_moe_layer'] = dict(expert=e, total=e*(c['E']+c['shared']), active=e*(c['k']+c['shared']),
                             router=c['d']*c['E'], active_share=(c['k']+c['shared'])/(c['E']+c['shared']))
# 7. Design question: 128K context, batch 32, one 80 GB GPU, 8B-class model
B, T = 32, T128
w = 8.03e9*2
out['design'] = dict(weights_bytes=w, budget_per_token=(80e9 - w)/(B*T),
  l8b_cache_total=2*32*8*128*2*T*B,
  hybrid_kv_per_token=8*2*2*128*1, hybrid_cache_total=8*2*2*128*1*T*B,
  hybrid_state_per_req=24*32*128*128*2, hybrid_state_total=24*32*128*128*2*B)
# 8. Llama 3.1 70B parameter count
c = CFG['llama31_70b']; d=c['d']
l70 = c['L']*(2*d*d + 2*d*c['kv']*c['dh'] + 3*d*c['ff'] + 2*d) + 2*c['V']*d + d
out['l70b']['params'] = l70
def fmt_bytes(x):
    for u, n in [('GiB', GiB), ('MiB', MiB), ('KiB', KiB)]:
        if x >= n: return f'{x/n:,.1f} {u}'.replace('.0 ', ' ')
    return f'{x} B'
out['fmt'] = {k: fmt_bytes(v) for k, v in out['variants_per_token_bytes'].items()}
out['fmt128k'] = {k: fmt_bytes(v) for k, v in out['variants_at_128k_bytes'].items()}
json.dump(out, open(os.path.join(H, 'derived.json'), 'w'), indent=1)
def check_configs():
    """Compare CFG and the other config values the page quotes with src/data/configs/ and with the Config
    calculator (src/calc/calc.py, the Python twin of window.CC). Raises on any difference."""
    import sys
    D = os.path.join(H, '..', 'data', 'configs')
    def C(k):
        j = json.load(open(os.path.join(D, k + '.json'))); return j.get('text_config') or j
    n = 0
    def eq(a, b, what):
        nonlocal n
        assert a == b, '%s: page %r config %r' % (what, a, b); n += 1
    for key, f in [('llama31_8b', 'llama-3.1-8b'), ('llama31_70b', 'llama-3.1-70b')]:
        c, x = C(f), CFG[key]
        for a, b in [('L', 'num_hidden_layers'), ('d', 'hidden_size'), ('H', 'num_attention_heads'), ('kv', 'num_key_value_heads'),
                     ('ff', 'intermediate_size'), ('V', 'vocab_size'), ('tied', 'tie_word_embeddings')]:
            eq(x[a], c[b], key + '.' + a)
        eq(x['dh'], c.get('head_dim') or c['hidden_size'] // c['num_attention_heads'], key + '.dh')
    c, x = C('deepseek-v3'), CFG['dsv3']
    for a, b in [('L', 'num_hidden_layers'), ('d', 'hidden_size'), ('H', 'num_attention_heads'), ('dc', 'kv_lora_rank'), ('dr', 'qk_rope_head_dim'),
                 ('dense_layers', 'first_k_dense_replace'), ('ff', 'intermediate_size'), ('moe_ff', 'moe_intermediate_size'),
                 ('E', 'n_routed_experts'), ('k', 'num_experts_per_tok'), ('shared', 'n_shared_experts'), ('V', 'vocab_size')]:
        eq(x[a], c[b], 'dsv3.' + a)
    c, x = C('gemma-3-27b'), CFG['gemma3_27b']
    p = c['sliding_window_pattern']; glob = sum(1 for i in range(c['num_hidden_layers']) if (i + 1) % p == 0)
    eq((x['L'], x['glob'], x['local'], x['kv'], x['dh'], x['W']),
       (c['num_hidden_layers'], glob, c['num_hidden_layers'] - glob, c['num_key_value_heads'], c['head_dim'], c['sliding_window']), 'gemma3_27b')
    c, x = C('gpt-oss-120b'), CFG['gptoss_120b']; lt = c['layer_types']
    eq((x['L'], x['local'], x['glob'], x['kv'], x['dh'], x['W']),
       (c['num_hidden_layers'], lt.count('sliding_attention'), lt.count('full_attention'), c['num_key_value_heads'], c['head_dim'], c['sliding_window']), 'gptoss_120b')
    eq((c['rope_scaling']['factor'], c['rope_scaling']['original_max_position_embeddings'], c['max_position_embeddings']), (32.0, 4096, 131072), 'gpt-oss YaRN')
    c, x = C('qwen3-next-80b-a3b'), CFG['qwen3next_80b']
    eq((x['L'], x['attn'], x['kv'], x['dh']), (c['num_hidden_layers'], c['num_hidden_layers'] // c['full_attention_interval'], c['num_key_value_heads'], c['head_dim']), 'qwen3next')
    # section 8 shape table and other quoted fields
    for f, d, L in [('smollm2-135m', 576, 30), ('llama-3.1-8b', 4096, 32), ('llama-3.1-70b', 8192, 80), ('llama-3.1-405b', 16384, 126), ('deepseek-v3', 7168, 61)]:
        eq((d, L), (C(f)['hidden_size'], C(f)['num_hidden_layers']), f + ' shape')
    s = C('smollm2-135m'); eq((s['vocab_size'], s['tie_word_embeddings'], s['num_attention_heads'], s['num_key_value_heads']), (49152, True, 9, 3), 'smollm2')
    eq(C('llama-3.1-8b')['rope_scaling']['original_max_position_embeddings'], 8192, 'llama3.1 rope orig')
    eq((C('mixtral-8x7b')['num_local_experts'], C('mixtral-8x7b')['num_experts_per_tok']), (8, 2), 'mixtral')
    q = C('qwen3-235b-a22b'); eq((q['num_experts'], q['num_experts_per_tok']), (128, 8), 'qwen3-235b')
    # parameter counts against the Config calculator (window.CC's Python twin)
    sys.path.insert(0, os.path.join(H, '..', 'calc')); import calc
    for key, f in [('l8b', 'llama-3.1-8b'), ('l70b', 'llama-3.1-70b')]:
        tot = calc.params(calc.normalise(json.load(open(os.path.join(D, f + '.json')))))['total']
        want = out[key]['total'] if key == 'l8b' else out[key]['params']
        eq(want, tot, key + ' params vs calc.py')
    print('check_configs: %d config values agree with src/data/configs and calc.py' % n)
if __name__ == '__main__':
    print(json.dumps(out, indent=1)); check_configs()
