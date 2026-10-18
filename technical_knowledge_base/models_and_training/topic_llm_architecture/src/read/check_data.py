"""Check that the built page embeds exactly lab_values.json (window.RDL) and that every derived number quoted
in the Reading tab matches derived.json (run derive.py first). Lab numbers are added here when they are filled."""
import json, os, re, html
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, '..', '..', 'index.html'), encoding='utf-8').read()
m = re.search(r'window\.RDL=(\{.*?\});\n', page)
assert m and json.loads(m.group(1)) == json.load(open(os.path.join(H, 'lab_values.json'))), 'RDL differs from lab_values.json'
read = html.unescape(re.search(r'id="t-read".*?<script', page, re.S).group(0))
D = json.load(open(os.path.join(H, 'derived.json')))
n = 0
def has(s):
    global n
    assert s in read, s; n += 1
K, Mi, G = 1024, 1024**2, 1024**3
v = D['variants_per_token_bytes']; v128 = D['variants_at_128k_bytes']
for k, a, b in [('MHA', '512 KiB', '64 GiB'), ('GQA8', '128 KiB', '16 GiB'), ('MQA', '16 KiB', '2 GiB'), ('MLA', '36 KiB', '4.5 GiB')]:
    assert f"{v[k]/K:g} KiB" == a and f"{v128[k]/G:g} GiB" == b, k; has(a); has(b)
assert D['swa4096_all_layers_cap_bytes'] == 512*Mi; has('512 MiB (capped)')
l = D['l8b']
assert round(l['layer']/1e6, 1) == 218.1 and round(l['attn']/1e6, 1) == 41.9 and round(l['mlp']/1e6, 1) == 176.2 and round(100*l['mlp_share']) == 81
has('218.1M weights per block'); has('41.9M in attention'); has('176.2M (81%)')
assert round(l['total']/1e9, 2) == 8.03 and round(l['emb']/1e6, 1) == 525.3; has('8.03B parameters'); has('two 525.3M embedding tables')
assert round(l['flops_2N']/1e9, 1) == 15.0 and round(l['attn_flops_128k']/1e9, 1) == 68.7; has('2N = 15.0 GFLOP'); has('= 68.7 GFLOP')
assert round(l['crossover_T'], -2) == 28600; has('T &asymp; 28,600'.replace('&asymp;', '≈'))
a = D['l70b']; assert a['kv_per_token'] == 320*K and a['kv_128k'] == 40*G and a['kv_128k_x32'] == 1.25*1024*G and round(a['params']/1e9, 1) == 70.6
has('327,680 bytes (320 KiB)'); has('= 40 GiB'); has('1.25 TiB'); has('70.6 billion parameters')
d = D['dsv3']; assert d['mla_per_token'] == 70272 and d['mha_same_shape']//K == 3904 and round(d['ratio']) == 57
has('68.6 KiB'); has('3,904 KiB'); has('57 times less')
g = D['gemma3_27b']; assert g['headline_per_token'] == 496*K and round(g['at128k']/G, 1) == 10.4 and round(g['full_at128k']/G) == 62
has('496 KiB per token'); has('about 10.4 GiB'); has('62 GiB')
q = D['qwen3next']; assert q['kv_per_token'] == 24*K and q['all_attn_per_token'] == 96*K; has('24 KiB of cache per token against 96 KiB')
e = D['dsv3_moe_layer']; assert round(e['total']/1e9, 1) == 11.3 and round(e['active']/1e9, 2) == 0.40 and round(100*e['active_share'], 1) == 3.5
has('11.3 billion weights'); has('0.40 billion'); has('3.5%')
z = D['design']; assert round(z['budget_per_token']/1e3) == 15 and z['l8b_cache_total'] == 512*G and z['hybrid_cache_total'] == 16*G and z['hybrid_state_per_req'] == 24*Mi and z['hybrid_state_total'] == 768*Mi
has('about 15 KB per token'); has('512 GiB in total'); has('16 GiB in total'); has('about 24 MiB per request'); has('768 MiB in total')
print('ok', n, 'quoted numbers checked; RDL keys', len(json.load(open(os.path.join(H, 'lab_values.json')))))
