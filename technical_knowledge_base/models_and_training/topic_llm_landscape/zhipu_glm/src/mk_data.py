# Write parts/22_js_zg_0data.js: the numbers the three 3D stages draw, from the config.json files in inputs/ and the GLM-4.5 report's Table 1.
# Run from src/: python3 mk_data.py   (no network, no heavy compute)
import json

def cfg(m):
    d = json.load(open(f'inputs/cfg_{m}.json'))
    return d.get('text_config', d)

a, g, f = cfg('GLM-4.5'), cfg('GLM-5.3'), cfg('GLM-5.3-Flash')

# Layer towers (Shape stage). GLM-4.5, GLM-5 (the GLM-5 to 5.3 base, config of 5.3) and Flash from their configs;
# DeepSeek-V3 and Kimi K2 from the GLM-4.5 report's Table 1 (layers, hidden size, routed experts, heads, dense layers).
fl_types = ''.join('K' if t == 'linear_attention' else 'S' for t in f['layer_types'])
towers = [
    dict(id='ds3', n='DeepSeek-V3', L=61, dense=3, d=7168, E=256, H=128, src='GLM-4.5 report, Table 1'),
    dict(id='k2', n='Kimi K2', L=61, dense=1, d=7168, E=384, H=64, src='GLM-4.5 report, Table 1'),
    dict(id='g45', n='GLM-4.5', L=a['num_hidden_layers'], dense=a['first_k_dense_replace'], d=a['hidden_size'], E=a['n_routed_experts'],
         H=a['num_attention_heads'], kvh=a['num_key_value_heads'], hd=a['head_dim'], src='config.json'),
    dict(id='g5', n='GLM-5', L=g['num_hidden_layers'], dense=g['first_k_dense_replace'], d=g['hidden_size'], E=g['n_routed_experts'],
         H=g['num_attention_heads'], src='config.json (GLM-5.3, same base)'),
    dict(id='fl', n='GLM-5.3-Flash', L=f['num_hidden_layers'], dense=f['first_k_dense_replace'], d=f['hidden_size'], E=f['n_routed_experts'],
         H=f['num_attention_heads'], types=fl_types, hc=f['hc_mult'], src='config.json'),
]

# Attention per release (Attention stage): numbers each layer caches per decoded token, and which layers run an indexer.
idx = g['index_head_dim']; mla = g['kv_lora_rank'] + g['qk_rope_head_dim']; mlaF = f['kv_lora_rank'] + f['qk_rope_head_dim']; pool = f['index_kpool']
gqa = 2 * a['num_key_value_heads'] * a['head_dim']
g53_ix = ''.join('F' if t == 'full' else 's' for t in g['indexer_types'])
la = f['linear_attn_config']
att = dict(
    g45=dict(n='GLM-4.5', sub='GQA', pat='G' * a['num_hidden_layers'], per=dict(G=[gqa, 0])),
    g5=dict(n='GLM-5', sub='MLA + DSA', pat='F' * g['num_hidden_layers'], per=dict(F=[mla, idx])),
    g53=dict(n='GLM-5.3', sub='IndexShare', pat=g53_ix, per=dict(F=[mla, idx], s=[mla, 0])),
    fl=dict(n='GLM-5.3-Flash', sub='3 KDA : 1 sparse', pat=fl_types, per=dict(K=[0, 0], S=[mlaF, idx / pool])),
)
for m in att.values():
    m['tot'] = sum(sum(m['per'][t]) for t in m['pat'])
K = g['index_topk']; IH = g['index_n_heads']
nums = dict(topk=K, ih=IH, idx=idx, mla=mla, mlaF=mlaF, pool=pool, kdaH=la['num_heads'], kdaD=la['head_dim'],
            kdaState=fl_types.count('K') * la['num_heads'] * la['head_dim'] ** 2, nK=fl_types.count('K'), nS=fl_types.count('S'),
            nIx53=g53_ix.count('F'), L1M=1048576)
out = ('// ---- Data for the 3D stages, written by src/mk_data.py from inputs/cfg_*.json and the GLM-4.5 report\'s Table 1 (do not edit by hand) ----\n'
       'window.ZG=' + json.dumps(dict(towers=towers, att=att, nums=nums), separators=(',', ':')) + ';\n')
open('parts/22_js_zg_0data.js', 'w').write(out)
for k, m in att.items():
    print(k, m['tot'], 'numbers per token', m['tot'] * 2 / 1024, 'KiB')
print(nums)
