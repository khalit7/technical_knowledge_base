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
# ---- lab numbers (window.RDL) against the labs' and children's recorded files (added 2026-10-19) ----
V = json.load(open(os.path.join(H, 'lab_values.json')))
S = os.path.join(H, '..'); KID = os.path.join(H, '..', '..')
def J(*p): return json.load(open(os.path.join(*p)))
def inv(key, s):
    global n
    assert s in V[key], (key, s); n += 1
runs = {r['run']: r for r in J(S, 'attn', 'out', 'runs_summary.json')['runs']}
for r, lab in [('at_mha', 'MHA <b>%.3f</b>'), ('at_gqa4', 'GQA-4 %.3f'), ('at_gqa2', 'GQA-2 %.3f'), ('at_mqa', 'MQA %.3f'), ('at_mla', 'MLA %.3f'),
               ('at_swa64', 'sliding window 64 %.3f'), ('at_swa64_g3', 'window 64 <b>%.3f</b>')]:
    inv('attn_variants', lab % runs[r]['val_loss_100win'])
for r, b in [('at_mha', '6,144'), ('at_gqa4', '3,072'), ('at_gqa2', '1,536'), ('at_mqa', '768'), ('at_mla', '960')]:
    assert '{:,}'.format(int(runs[r]['kv_bytes_per_token_bf16_ctx256'])) == b; inv('attn_variants', b)
inv('attn_variants', 'seed 1: %.3f' % runs['at_mla_s1']['val_loss_100win'])
inv('attn_variants', 'moved MHA by %.3f' % abs(runs['at_mha_s1']['val_loss_100win'] - runs['at_mha']['val_loss_100win']))
A = {(r['variant'], r['ctx']): r for r in J(S, 'attn', 'out', 'decode_bench.json')['part_a']}
m = A[('mha', 32768)]
for var, s in [('gqa8', '0.34 of MHA'), ('mqa', '0.09 with MQA'), ('mla_absorbed', '0.20 with absorbed MLA')]:
    assert '%.2f' % (A[(var, 32768)]['ms_median'] / m['ms_median']) in s, var; inv('attn_variants', s)
inv('attn_variants', 'cache bytes of %.2f, %.3f and %.3f' % tuple(A[(x, 32768)]['cache_bytes'] / m['cache_bytes'] for x in ('gqa8', 'mqa', 'mla_absorbed')))
bg = J(S, 'attn', 'out', 'cpu_evals.json')['gqa_expand_bug']
inv('mis_lab', 'from %.3f to %.3f' % (bg['loss_repeat_interleave'], bg['loss_repeat']))
inv('mis_lab', J(S, 'attn', 'out', 'sdpa_errors.json')['sdpa_no_enable_gqa'])
br = {k: J(S, 'block', 'out', 'runs', k + '.json')['final_val_loss'] for k in ('bl_post_lr3e-3', 'bl_pre_lr3e-3', 'bl_post_warm500', 'bl_post_lr1e-3', 'bl_pre_lr3e-2')}
for k, s in [('bl_post_lr3e-3', 'ends at %.3f'), ('bl_pre_lr3e-3', 'pre-norm reaches %.3f'), ('bl_post_warm500', 'reaches %.3f, the best'),
             ('bl_post_lr1e-3', 'at 1e-3 it reaches %.3f'), ('bl_pre_lr3e-2', 'degrading to %.3f')]:
    inv('prepost', s % br[k])
inv('prepost', '(%.3f)' % J(S, 'block', 'out', 'unigram.json')['val_cross_entropy_under_train_unigram_nats'])
gn = J(S, 'block', 'out', 'gradnorm.json')['runs']
inv('prepost', ('is %.1e' % gn['bl_post_lr3e-3']['trained']['per_block'][0]).replace('e-07', 'e-7')); inv('prepost', '%.2f for the same post-norm' % gn['bl_post_warm500']['trained']['per_block'][0])
inv('prepost', '%.2f for pre-norm at 1e-3' % gn['bl_pre_lr1e-3']['trained']['per_block'][0])
mk = J(S, 'block', 'out', 'mistakes.json'); c = {x['bug']: x['loss'] for x in mk['cases']}
inv('mis_lab', '1.96 when correct'); assert round(mk['baseline_loss'], 2) == 1.96
for b, s in [('no_scale', 'd<sub>h</sub> %.2f'), ('split_without_transpose', 'no transpose %.2f'), ('merge_without_transpose', 'transposing back %.2f'), ('no_mask', 'left out %.2f')]:
    inv('mis_lab', s % c[b])
for e in mk['errors']:
    if e['label'].startswith('learned') or e['label'].startswith('q @ k'): inv('mis_lab', e['error'])
F = J(S, 'inside', 'out', 'facts.json'); sm = J(S, 'inside', 'out', 'smol.json')
inv('massive', 'dimension %d' % F['smol_big_dim']); inv('massive', '{:,}'.format(round(F['smol_big_max']))); inv('massive', '{:,}'.format(round(F['smol_big_min'])))
inv('massive', 'about %.1f' % F['smol_med12']); inv('massive', 'dimension %d of the first token at {:,} in layer %d'.format(round(F['qwen_big_max'])) % (F['qwen_big_dim'], F['qwen_big_layer']))
inv('massive', 'entry after training is %d' % round(F['tiny_max_after']))
inv('sink', 'under %.2f' % (F['smol_sink_below12_max'] + 0.005)); inv('sink', '%.2f to %.2f from layer 12' % (F['smol_sink_from12_min'], F['smol_sink_from12_max']))
inv('sink', 'from %.3f to %.3f' % (sm['abl']['full']['loss'], sm['abl']['no_key0']['loss']))
w = sm['win']; inv('sink', '(%.2f against %.2f)' % (w['window']['loss_after_W'], w['full']['loss_after_W'])); inv('sink', 'back to %.2f' % w['window_sink1']['loss_after_W'])
assert F['tiny_sink_max'] <= 0.05; inv('sink', 'at most 0.05')
assert J(KID, 'mixture_of_experts', 'src', 'analysis', 'out', 'router_probs_8tok.json') == V['moe_route']; n += 1
pe = {(r['model'], r['scaling']): r for r in J(KID, 'positional_encodings', 'src', 'past', 'out', 'past.json')['runs']}
a = pe[('at_mha', 'plain')]['shifted']; inv('mis_rope', 'loss %.2f against %.2f' % (a['1024']['mean'], a['0']['mean']))
inv('mis_rope', a['1024']['greedy'][1:60].replace('\n', ' '))
inv('mis_rope', 'gives %.2f' % pe[('at_mha', 'mistake: yarn x8 with orig_ctx 2,048')]['shifted']['1024']['mean'])
# numbers the Reading prose quotes from the children: each must appear in that child's facts file
for kid, nums in [('normalisation_residuals_and_stability', ['20,865', '4.295', '2.432', '69.9', '4.289', '2.845', '4.361', '3.405', '2.506', '2.501', '2.396', '3.5565588', 'hc_mult 4']),
                  ('long_context', ['8,192 80%', '12,288 0%', '30/0/0/0%', '97%', 'H2O 12.5% 2.10', '2.07', '2.10 / 2.07 / 2.09', '3.82']),
                  ('beyond_attention', ['ba_ssm 2.152 / 2.024', '2.089 / 1.688', '2.082 / 1.629', 'at_mha 2.160 / 1.741', '93% / 85%', '90% / 29%', '86% / 7%']),
                  ('families_and_objectives', ['2.2413', '2.2776', '32%', '2.1601', '0.2146', '7.0242']),
                  ('mixture_of_experts', ['dense 2.278 (seed 1 2.264)', 'moe8top2 aux 2.256 (seed 1 2.254)', 'moe16top3_shared 2.210', '48%', '14 of 48', '2.296'])]:
    ft = open(os.path.join(KID, kid, 'src', 'facts.md'), encoding='utf-8').read()
    for x in nums:
        assert x in ft, (kid, x); n += 1
print('ok', n, 'quoted numbers checked; RDL keys', len(V))
