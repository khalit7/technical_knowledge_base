#!/usr/bin/env python3
"""Rebuild the architecture table from config.json files and check it against Raschka's gallery.

Inputs: src/models.yml (rasbt/llm-architecture-gallery, Apache 2.0, fetched 1 Oct 2026) and
src/configs/*.json (Hugging Face config.json, or params.json for Mistral Large 3; gated repos via
unsloth mirrors). Output: parts/15a_gal_data.js and src/recompute_report.txt.

Per-layer codes. Mixer: G full softmax attention, S sliding-window or chunked attention,
M MLA (full), D trained-sparse selection over an MLA or GQA cache, L linear or recurrent
(Gated DeltaNet, KDA, Mamba-2, Lightning, mLSTM), F a block with no mixer (FFN-only block in
Nemotron-H). FFN: e MoE, d dense, '.' none. Position: R full RoPE, P partial RoPE (or MLA's
decoupled RoPE key), N none (NoPE), A learned absolute, '-' not applicable (recurrent layer).
KV bytes per token: bf16 (2 bytes), growing cache only, every layer counted at full per-token
cost (the gallery's convention, so windowed layers are not credited here).
"""
import json, os, re, yaml

HERE = os.path.dirname(os.path.abspath(__file__))
G = yaml.safe_load(open(os.path.join(HERE, 'inputs/models.yml')))
CFG = os.path.join(HERE, 'inputs/configs')
MIR = {'Gemma 3 270M': 'unsloth/gemma-3-270m', 'Gemma 3 27B': 'unsloth/gemma-3-27b-it',
       'Llama 4 Maverick': 'unsloth/Llama-4-Maverick-17B-128E-Instruct'}
# models not in the gallery, added because the page uses them
EXTRA = {
 'Llama 3.1 8B': dict(company='Meta', date='2024-07-23', repo='unsloth/Meta-Llama-3.1-8B', scale='8B parameters', decoder_type='Dense', attention='GQA with RoPE', context_tokens='131,072', license_name='Llama 3.1 Community License', note='Not in the gallery (it lists Llama 3 8B at 128 KiB, the same shape). Page worked example.'),
 'Llama 3.1 70B': dict(company='Meta', date='2024-07-23', repo='unsloth/Meta-Llama-3.1-70B', scale='70B parameters', decoder_type='Dense', attention='GQA with RoPE', context_tokens='131,072', license_name='Llama 3.1 Community License', note='Not in the gallery. Page worked example.'),
 'Granite 4.0-H Small': dict(company='IBM', date='2025-10-02', repo='ibm-granite/granite-4.0-h-small', scale='', decoder_type='Hybrid MoE', attention='Mostly Mamba-2 with a few GQA layers', context_tokens='', license_name='Apache License 2.0', note='Not in the gallery; config fetched directly. Total and active parameters not checked here.'),
}
SKIP = {'Llama 3 8B', 'Llama 3.2 1B', 'Llama 3.2 3B', 'Tiny Aya 3.35B', 'Soofi S 30B-A3B', 'BTL-3 27B', 'Antares 1B',
        'Gemma 4 E2B', 'Gemma 4 E4B', 'Motif 3 Beta', 'ZAYA1-8B', 'LongCat-Flash-Lite 68.5B-A3B', 'Step 3.5 Flash 196B',
        'Qwen3 Coder Flash 30B-A3B', 'Kimi K2.7 Code', 'Laguna XS 2.1'}
GALLERY_ONLY = {'DeepSeek V4-Pro', 'DeepSeek V4-Flash', 'DeepSeek V4.1-Flash'}


def load(repo):
    fn = os.path.join(CFG, repo.replace('/', '__') + '.json')
    if not os.path.exists(fn):
        import subprocess
        subprocess.run(['curl', '-sL', '-m', '25', '-o', fn, 'https://huggingface.co/%s/raw/main/config.json' % repo])
    j = json.load(open(fn))
    t = j.get('text_config') or j.get('llm_config') or j
    for k, v in list(t.items()):
        if isinstance(v, str) and v[:1] == '[':
            try: t[k] = json.loads(v)
            except Exception: pass
    if 'dim' in t and 'n_layers' in t:  # Mistral params.json
        t = dict(t, hidden_size=t['dim'], num_hidden_layers=t['n_layers'], num_attention_heads=t['n_heads'], num_key_value_heads=t['n_kv_heads'], vocab_size=t.get('vocab_size'))
        moe = t.get('moe') or {}
        t.update(n_routed_experts=moe.get('num_experts'), num_experts_per_tok=moe.get('num_experts_per_tok'), n_shared_experts=moe.get('num_shared_experts'), first_k_dense_replace=moe.get('first_k_dense_replace'))
    return t


def g(t, *ks, d=None):
    for k in ks:
        if t.get(k) is not None:
            return t[k]
    return d


def kib(s):
    m = re.match(r'([\d.]+)\s*(KiB|MiB|B)', s or '')
    return float(m.group(1)) * {'KiB': 1024, 'MiB': 2 ** 20, 'B': 1}[m.group(2)] if m else None


def build(name, meta, repo):
    t = load(repo)
    L = g(t, 'num_hidden_layers', 'n_layer', 'num_layers')
    D = g(t, 'hidden_size', 'n_embd', 'd_model')
    H = g(t, 'num_attention_heads', 'n_head', 'num_heads')
    Hkv = g(t, 'num_key_value_heads', 'num_kv_heads', d=H)
    dh = g(t, 'head_dim', d=(D // H if D and H else None))
    if name.startswith('GPT-2'): L = t['n_layer']
    mla = bool(t.get('kv_lora_rank'))
    rr = t.get('qk_rope_head_dim', 64) if mla else 0
    note = []
    lt = t.get('layer_types') or t.get('layers_block_type')
    mix = None
    ffn = None
    # ---- mixer per layer ----
    if t.get('hybrid_override_pattern'):
        p = t['hybrid_override_pattern']; mix = ''.join({'M': 'L', '*': 'G', 'E': 'F', '-': 'F'}[c] for c in p)
        ffn = ''.join({'M': '.', '*': '.', 'E': 'e', '-': 'd'}[c] for c in p); L = len(p)
    elif lt and t.get('model_type') in ('nemotron_h',):
        mix = ''.join({'mamba': 'L', 'attention': 'G', 'moe': 'F', 'mlp': 'F'}[x] for x in lt)
        ffn = ''.join({'mamba': '.', 'attention': '.', 'moe': 'e', 'mlp': 'd'}[x] for x in lt); L = len(lt)
    elif lt and t.get('model_type') == 'granitemoehybrid':
        mix = ''.join('L' if x == 'mamba' else 'G' for x in lt)
    elif t.get('linear_attn_config') and t['linear_attn_config'].get('full_attn_layers') and not lt:
        fa = set(t['linear_attn_config']['full_attn_layers'])  # 1-indexed in Kimi configs
        mix = ''.join(('M' if mla else 'G') if (i + 1) in fa else 'L' for i in range(L))
    elif t.get('gqa_layers') is not None:
        fa = set(t['gqa_layers']); mix = ''.join('G' if i in fa else 'L' for i in range(L))
    elif t.get('model_type') == 'bailing_hybrid':
        n = t['layer_group_size']; mix = ''.join('M' if (i + 1) % n == 0 else 'L' for i in range(L))
    elif t.get('hybrid_layer_pattern'):
        mix = ''.join('G' if x == 0 else 'S' for x in t['hybrid_layer_pattern'])
    elif t.get('local_layer_ids') is not None:
        lo = set(t['local_layer_ids']); mix = ''.join('S' if i in lo else 'G' for i in range(L))
    elif lt:
        m = {'full_attention': 'G', 'attention': 'G', 'global': 'G', 'sliding_attention': 'S', 'linear_attention': 'L',
             'deepseek_sparse_attention': 'D', 'chunked_attention': 'S', 'conv': 'L', 'short_conv': 'L'}
        mix = ''.join(m.get(x, '?') for x in lt[:L])
    elif t.get('sliding_window_pattern'):
        n = t['sliding_window_pattern']; mix = ''.join('G' if (i + 1) % n == 0 else 'S' for i in range(L))
    elif t.get('full_attention_interval'):
        n = t['full_attention_interval']; mix = ''.join('G' if (i + 1) % n == 0 else 'L' for i in range(L))
    elif t.get('attention_chunk_size') and t.get('no_rope_layers'):  # Llama 4: chunked RoPE layers, global NoPE layers
        mix = ''.join('S' if x else 'G' for x in t['no_rope_layers'])
    elif t.get('model_type') == 'xlstm':
        L = t.get('num_blocks') or L or 32; mix = 'L' * L
    else:
        mix = 'G' * L
    if mla: mix = mix.replace('G', 'M')
    if t.get('indexer_budget'): mix = mix.replace('G', 'D')
    if t.get('index_topk') or name.startswith('MiniMax M3'):
        if name.startswith('MiniMax M3'):
            mix = 'G' * 3 + 'D' * (L - 3)
        else:
            mix = mix.replace('M', 'D').replace('G', 'D')
    L = len(mix)
    # ---- FFN per layer ----
    if ffn is None:
        moeish = 'MoE' in (meta.get('decoder_type') or '') or 'hybrid' in (meta.get('decoder_type') or '').lower() and g(t, 'num_experts', 'n_routed_experts', 'num_local_experts')
        if t.get('mlp_layer_types'):
            ffn = ''.join('e' if x == 'sparse' else 'd' for x in t['mlp_layer_types'][:L])
        elif isinstance(t.get('moe_layer_freq'), list):
            ffn = ''.join('e' if x else 'd' for x in t['moe_layer_freq'][:L])
        elif t.get('moe_layers') is not None:
            ml = set(t['moe_layers']); ffn = ''.join('e' if i in ml else 'd' for i in range(L))
        elif t.get('mlp_only_layers'):
            ml = set(t['mlp_only_layers']); ffn = ''.join('d' if i in ml else 'e' for i in range(L))
        elif t.get('moe_layers_enum'):
            ml = set(int(x) for x in t['moe_layers_enum'].split(',')); ffn = ''.join('e' if i in ml else 'd' for i in range(L))
        elif t.get('dense_mlp_idx') is not None and t.get('n_routed_experts'):
            ffn = ''.join('d' if i < t['dense_mlp_idx'] else 'e' for i in range(L))
        elif moeish:
            k = t.get('first_k_dense_replace') or 0
            ffn = ''.join('d' if i < k else 'e' for i in range(L))
        else:
            ffn = 'd' * L
    # ---- position per layer ----
    prf = t.get('partial_rotary_factor')
    rp = t.get('rope_parameters') or {}
    if isinstance(rp, dict) and 'full_attention' in rp:
        prf_full = rp['full_attention'].get('partial_rotary_factor')
    else:
        prf_full = None
        if prf is None and isinstance(rp, dict): prf = rp.get('partial_rotary_factor')
    if t.get('rotary_dim') and dh and t['rotary_dim'] < dh and not mla: prf = t['rotary_dim'] / dh
    pos = []
    for i, c in enumerate(mix):
        if c in 'LF': pos.append('-'); continue
        if name.startswith('GPT-2'): pos.append('A'); continue
        p = 'R'
        if mla: p = 'P'
        if prf and prf < 1: p = 'P'
        if c == 'G' and prf_full and prf_full < 1: p = 'P'
        if t.get('no_rope_layer_interval') and (i + 1) % t['no_rope_layer_interval'] == 0: p = 'N'
        if t.get('no_rope_layers') is not None and not t['no_rope_layers'][i]: p = 'N'
        if t.get('mla_use_nope') and c in 'MD': p = 'N'
        if t.get('use_rope') is False: p = 'N'
        if isinstance(t.get('layer_rope_theta'), list) and t['layer_rope_theta'][i] == 0: p = 'N'
        if isinstance(t.get('partial_rotary_factors'), list) and t['partial_rotary_factors'][i] < 1: p = 'P'
        if t.get('d_rel'): p = 'B'  # learned relative-position bias (Inkling)
        pos.append(p)
    pos = ''.join(pos)
    # ---- KV bytes per token (bf16, all cache-growing layers at full cost) ----
    b = 2
    if mla:
        per = {'M': (t['kv_lora_rank'] + rr) * b, 'D': (t['kv_lora_rank'] + rr) * b}
    else:
        per_g = 2 * Hkv * dh * b
        per = {'G': per_g, 'S': per_g, 'D': per_g}
        if t.get('swa_num_key_value_heads'):  # MiMo, Inkling: separate sliding-layer KV heads and head dims
            vk = t.get('v_head_dim') or dh; svk = t.get('swa_v_head_dim') or t.get('swa_head_dim') or dh
            per['G'] = Hkv * (dh + vk) * b
            per['S'] = t['swa_num_key_value_heads'] * ((t.get('swa_head_dim') or dh) + svk) * b
            note.append('sliding layers have their own KV heads: %d of %d+%d dims' % (t['swa_num_key_value_heads'], t.get('swa_head_dim') or dh, svk))
        if t.get('attention_k_eq_v') and t.get('global_head_dim'):  # Gemma 4: unified K=V on global layers
            per['G'] = t['num_global_key_value_heads'] * t['global_head_dim'] * b
            note.append('global layers store one unified K=V tensor: %d heads of %d' % (t['num_global_key_value_heads'], t['global_head_dim']))
    passes = t.get('total_ut_steps') or t.get('num_loops') or 1
    if passes > 1: note.append('looped: %d passes over the same layers, each keeping its own cache' % passes)
    kv = sum(per.get(c, 0) for c in mix) * passes
    perL = {k: v for k, v in per.items() if k in mix}
    W = g(t, 'sliding_window', 'sliding_window_size', 'attention_chunk_size') if 'S' in mix else None
    if isinstance(W, int) and W < 0: W = None
    # experts
    E = g(t, 'n_routed_experts', 'num_experts', 'num_local_experts', 'moe_num_experts')
    k = g(t, 'num_experts_per_tok', 'num_experts_per_token', 'experts_per_token', 'moe_top_k', 'top_k_experts')
    sh = g(t, 'n_shared_experts', 'num_shared_experts')
    if sh is None and (t.get('shared_expert_intermediate_size') or t.get('moe_shared_expert_intermediate_size') or t.get('share_expert_dim')): sh = 1
    if 'e' not in ffn: E = k = sh = None
    rs = t.get('rope_scaling') or (rp if isinstance(rp, dict) and rp.get('rope_type') not in (None, 'default') else None) or {}
    if isinstance(rs, dict) and 'full_attention' in rs: rs = {}
    theta = t.get('rope_theta') or (rp.get('rope_theta') if isinstance(rp, dict) else None)
    if isinstance(rp, dict) and 'full_attention' in rp:
        theta = '%g local, %g global' % (rp['sliding_attention']['rope_theta'], rp['full_attention']['rope_theta'])
    elif t.get('rope_local_base_freq'):
        theta = '%g local, %g global' % (t['rope_local_base_freq'], t['rope_theta'])
    elif t.get('swa_rope_theta'):
        theta = '%g local, %g global' % (t['swa_rope_theta'], t['rope_theta'])
    elif isinstance(theta, list):
        theta = '%g / %g per layer' % (max(theta), min(theta))
    scale = ''
    if isinstance(rs, dict) and (rs.get('rope_type') or rs.get('type')) and rs.get('factor'):
        scale = '%s x%g' % (rs.get('rope_type') or rs.get('type'), rs.get('factor') or 0)
        if rs.get('original_max_position_embeddings'): scale += ' from %d' % rs['original_max_position_embeddings']
    elif t.get('rope_type') == 'original' and t.get('scaling_factor'):
        scale = 'scaled x%g from %d' % (t['scaling_factor'], t.get('original_max_position_embeddings', 0))
    # fixed recurrent state per linear layer, in elements (None where the config does not determine it here)
    st = None
    la = t.get('linear_attn_config') if isinstance(t.get('linear_attn_config'), dict) else {}
    if t.get('linear_num_value_heads'):
        st = t['linear_num_value_heads'] * t['linear_key_head_dim'] * t['linear_value_head_dim']
    elif la.get('num_heads') and la.get('head_dim'):
        st = la['num_heads'] * la['head_dim'] ** 2
    elif t.get('mamba_num_heads'):
        st = t['mamba_num_heads'] * t['mamba_head_dim'] * t['ssm_state_size']
    elif t.get('mamba_n_heads'):
        st = t['mamba_n_heads'] * t['mamba_d_head'] * t['mamba_d_state']
    if 'L' not in mix: st = None
    if mla: dh = (t.get('qk_nope_head_dim') or 0) + (t.get('qk_rope_head_dim') or 0) or dh
    return dict(st=st, L=L, D=D, H=H, Hkv=Hkv if not mla else None, dh=dh, mix=mix, ffn=ffn, pos=pos, kv=kv, per=perL, W=W,
                E=E, k=k, sh=sh, theta=theta, scale=scale, dc=t.get('kv_lora_rank'), dr=rr or None,
                V=t.get('vocab_size'), ctx=g(t, 'max_position_embeddings', 'max_seq_len', 'model_max_length'),
                passes=passes, note='; '.join(note))


rows, rep = [], []
items = [(k, v, MIR.get(k) or (v.get('config') or {}).get('repo')) for k, v in G.items()] + [(k, v, v['repo']) for k, v in EXTRA.items()]
for name, meta, repo in sorted(items, key=lambda x: str(x[1].get('date'))):
    if name in SKIP or not repo: continue
    gal = kib(meta.get('kv_cache_per_token_bf16'))
    r = dict(n=name, co=meta.get('company'), dt=str(meta.get('date')), sc=meta.get('scale'), dec=meta.get('decoder_type'),
             att=meta.get('attention'), mixg=meta.get('layer_mix'), cx=meta.get('context_tokens'), lic=meta.get('license_name'),
             gal=gal, cfg='https://huggingface.co/%s/blob/main/%s' % (repo, 'params.json' if 'Mistral-Large-3' in repo else 'config.json'),
             tr=(meta.get('tech_report') or {}).get('url'), x=name in EXTRA, xn=meta.get('note'))
    if name in GALLERY_ONLY:
        r.update(status='gallery', kv=None)
        rep.append('GALLERY-ONLY %-34s gallery %s' % (name, meta.get('kv_cache_per_token_bf16')))
    else:
        c = build(name, meta, repo)
        r.update(c)
        if gal is None:
            r['status'] = 'extra'
        elif abs(c['kv'] - gal) <= max(0.006 * gal, 60):
            r['status'] = 'match'
        else:
            r['status'] = 'differs'
        rep.append('%-8s %-34s calc %9.2f KiB  gallery %-10s mix %s' % (r['status'], name, c['kv'] / 1024, meta.get('kv_cache_per_token_bf16'), c['mix']))
    rows.append(r)

open(os.path.join(HERE, 'inputs/recompute_report.txt'), 'w').write('\n'.join(rep) + '\n')
print('\n'.join(x for x in rep if not x.startswith('match')))
print('rows', len(rows), 'match', sum(r['status'] == 'match' for r in rows), 'differs', sum(r['status'] == 'differs' for r in rows))
keep = ['n', 'co', 'dt', 'sc', 'dec', 'att', 'mixg', 'cx', 'lic', 'gal', 'cfg', 'tr', 'status', 'kv', 'L', 'D', 'H', 'Hkv', 'dh', 'mix', 'ffn', 'pos', 'per', 'W', 'E', 'k', 'sh', 'theta', 'scale', 'dc', 'dr', 'V', 'ctx', 'passes', 'note', 'x', 'xn', 'st']
out = [{k: r.get(k) for k in keep if r.get(k) not in (None, '', False)} for r in rows]
js = '// Generated by gen_data.py from config.json files and the gallery models.yml (Apache 2.0); do not edit by hand.\nconst GAL=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n'
open(os.path.join(HERE, 'parts/15a_gal_data.js'), 'w').write(js)
print('bytes', len(js.encode()))
