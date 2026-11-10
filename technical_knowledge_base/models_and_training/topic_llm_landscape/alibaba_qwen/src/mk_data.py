# Write parts/22_js_qw_0data.js (window.QW) from the Hugging Face config.json files in inputs/: one row per checkpoint with the
# fields the Configs tab and the two 3D stages draw. Run from src/: python3 mk_data.py
# Headline totals and actives (tot, act, billions) are the A-notation in each model's name, as published; Flash-Next's 125B / 6B is its card's.
import json
ROWS = [  # (config file stem, display name, headline total B, headline active B, note)
    ('Qwen3-32B', 'Qwen3-32B', 32, 32, 'dense, 64 layers of full attention'),
    ('Qwen3-30B-A3B', 'Qwen3-30B-A3B', 30, 3, ''),
    ('Qwen3-235B-A22B', 'Qwen3-235B-A22B', 235, 22, ''),
    ('Qwen3-Next-80B-A3B-Instruct', 'Qwen3-Next-80B-A3B', 80, 3, ''),
    ('Qwen3.5-397B-A17B', 'Qwen3.5-397B-A17B', 397, 17, ''),
    ('Qwen3.8-27B', 'Qwen3.8-27B', 27, 27, 'dense feed-forward (intermediate 17,408)'),
    ('Qwen3.8-2.4T-A95B', 'Qwen3.8-2.4T-A95B', 2400, 95, ''),
    ('Qwen3.8-Flash-Next', 'Qwen3.8-Flash-Next', 125, 6, '125B excludes 51B n-gram and 4B MTP'),
]
out = []
for stem, name, tot, act, note in ROWS:
    c = json.load(open('inputs/cfg_%s.json' % stem)); c = c.get('text_config', c)
    L = c['num_hidden_layers']; lt = c.get('layer_types'); fi = c.get('full_attention_interval')
    if lt: mix = ''.join('F' if x == 'full_attention' else 'L' for x in lt)
    elif fi: mix = ''.join('F' if (i + 1) % fi == 0 else 'L' for i in range(L))
    else: mix = 'F' * L
    assert len(mix) == L
    sparse = 1 if c.get('indexer_budget') else 0   # Flash-Next: its full-attention layers are QSA (indexer_* fields)
    E = c.get('num_experts') or 0
    r = dict(n=name, L=L, mix=mix, d=c['hidden_size'], kvh=c['num_key_value_heads'], dh=c['head_dim'],
             hv=c.get('linear_num_value_heads') or 0, dk=c.get('linear_key_head_dim') or 0, dv=c.get('linear_value_head_dim') or 0,
             E=E, k=c.get('num_experts_per_tok') or 0 if E else 0, sh=1 if c.get('shared_expert_intermediate_size') else 0,
             dff=c.get('moe_intermediate_size') or 0 if E else 0, ffn=c.get('intermediate_size') or 0, qsa=sparse,
             ib=c.get('indexer_budget') or 0, ir=c.get('indexer_compress_ratio') or 0, tot=tot, act=act, note=note)
    if E: r['k'] = c['num_experts_per_tok']; r['dff'] = c['moe_intermediate_size']
    out.append(r)
js = ('// ---- Data: eight Qwen config.json files, decoded by src/mk_data.py (do not edit by hand). mix: one letter per layer, F full (or QSA when qsa=1), L Gated DeltaNet ----\n'
      'window.QW=(function(){const rows=' + json.dumps(out, separators=(',', ':')) + ';const by={};rows.forEach(r=>by[r.n]=r);'
      'const pe=r=>3*r.d*r.dff,stored=r=>r.L*(r.E+r.sh)*pe(r),active=r=>r.L*(r.k+r.sh)*pe(r),nf=r=>(r.mix.match(/F/g)||[]).length;'
      'return {rows,by,pe,stored,active,nf}})();\n')
open('parts/22_js_qw_0data.js', 'w').write(js)
for r in out:
    E = r['E']
    if E:
        pe = 3 * r['d'] * r['dff']; print(r['n'], r['L'], r['mix'].count('F'), 'P_exp', pe, 'stored %.3fB active %.1fB' % (r['L'] * (E + r['sh']) * pe / 1e9, r['L'] * (r['k'] + r['sh']) * pe / 1e9))
    else: print(r['n'], r['L'], r['mix'].count('F'), 'dense')
