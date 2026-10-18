#!/usr/bin/env python3
"""Architecture map data: curated facts (inputs/facts.yml) joined with config.json files (inputs/configs/).

Writes src/map/out/map.json, src/map/out/report.txt and parts/35_js_am_0data.js.
Run from anywhere with the repo's .venv Python (PyYAML): python3 src/map/build_map.py

Per-layer codes (same convention as the Architecture Gallery child page, so the two agree):
  mixer  G full softmax attention, S sliding-window or chunked attention, M MLA, D trained-sparse selection,
         L linear or recurrent (Mamba-2, Gated DeltaNet, KDA, lightning), H parallel hybrid (attention and SSM heads
         in the same layer, Falcon-H1), F a block with no mixer (FFN-only block in Nemotron-H)
  ffn    d dense, e mixture of experts, '.' none
  pos    A learned absolute, R RoPE, P partial RoPE (or MLA's decoupled RoPE key), N none (NoPE), '-' no attention
KV bytes per token: bf16 (2 bytes), cache-growing layers only. kv counts every attention layer at full cost (the
gallery convention). kvw is the average per token at a 131,072-token context when sliding windows are credited
(a windowed layer holds min(T, W) tokens). Recurrent state (fixed size) is reported apart in st (elements per layer).
"""
import json, os, re, sys
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
CFG = os.path.join(HERE, 'inputs', 'configs')
FACTS = yaml.safe_load(open(os.path.join(HERE, 'inputs', 'facts.yml')))
T_CREDIT = 131072


def load(stem):
    j = json.load(open(os.path.join(CFG, stem + '.json')))
    t = j.get('text_config') or j.get('llm_config') or j
    t = dict(t)
    for k, v in list(t.items()):
        if isinstance(v, str) and v[:1] == '[':
            try:
                t[k] = json.loads(v)
            except Exception:
                pass
    if 'dim' in t and 'n_layers' in t:  # Mistral params.json
        moe = t.get('moe') or {}
        t.update(hidden_size=t['dim'], num_hidden_layers=t['n_layers'], num_attention_heads=t['n_heads'],
                 num_key_value_heads=t['n_kv_heads'], n_routed_experts=moe.get('num_experts'),
                 num_experts_per_tok=moe.get('num_experts_per_tok'), n_shared_experts=moe.get('num_shared_experts'),
                 first_k_dense_replace=moe.get('first_k_dense_replace'), moe_intermediate_size=moe.get('expert_hidden_dim') or t.get('moe_intermediate_size'))
    for k in ('tie_word_embeddings',):
        if k in j and k not in t:
            t[k] = j[k]
    return t


def g(t, *ks, d=None):
    for k in ks:
        if t.get(k) is not None:
            return t[k]
    return d


def derive(f):
    t = load(f['cfg'])
    mt = t.get('model_type', '')
    L = g(t, 'num_hidden_layers', 'n_layer', 'num_layers')
    D = g(t, 'hidden_size', 'n_embd', 'd_model')
    H = g(t, 'num_attention_heads', 'n_head', 'num_heads')
    Hkv = g(t, 'num_key_value_heads', 'num_kv_heads', d=H)
    if mt == 'falcon' and not t.get('new_decoder_architecture') and t.get('multi_query'):
        Hkv = 1
    dh = g(t, 'head_dim', 'attention_head_dim', d=(D // H if D and H else None))
    mla = bool(t.get('kv_lora_rank'))
    rr = t.get('qk_rope_head_dim', 64) if mla else 0
    lt = t.get('layer_types') or t.get('layers_block_type')
    ffn = None
    # ---- mixer per layer ----
    if t.get('hybrid_override_pattern'):
        p = t['hybrid_override_pattern']
        mix = ''.join({'M': 'L', '*': 'G', 'E': 'F', '-': 'F'}[c] for c in p)
        ffn = ''.join({'M': '.', '*': '.', 'E': 'e', '-': 'd'}[c] for c in p)
    elif mt == 'jamba':
        ap, ao = t['attn_layer_period'], t['attn_layer_offset']
        ep, eo = t['expert_layer_period'], t['expert_layer_offset']
        mix = ''.join('G' if i % ap == ao else 'L' for i in range(L))
        ffn = ''.join('e' if i % ep == eo else 'd' for i in range(L))
    elif mt == 'falcon_h1':
        mix = 'H' * L
    elif t.get('attn_type_list') is not None and mt.startswith('minimax'):
        mix = ''.join('G' if x == 1 else 'L' for x in t['attn_type_list'])
    elif lt and mt == 'granitemoehybrid':
        mix = ''.join('L' if x == 'mamba' else 'G' for x in lt)
    elif t.get('linear_attn_config') and t['linear_attn_config'].get('full_attn_layers') and not lt:
        fa = set(t['linear_attn_config']['full_attn_layers'])  # 1-indexed in Kimi configs
        mix = ''.join(('M' if mla else 'G') if (i + 1) in fa else 'L' for i in range(L))
    elif lt:
        m = {'full_attention': 'G', 'attention': 'G', 'global': 'G', 'sliding_attention': 'S', 'linear_attention': 'L',
             'deepseek_sparse_attention': 'D', 'chunked_attention': 'S', 'conv': 'L', 'short_conv': 'L', 'mamba': 'L'}
        mix = ''.join(m.get(x, '?') for x in lt[:L])
    elif t.get('sliding_window_pattern'):
        n = t['sliding_window_pattern']
        mix = ''.join('G' if (i + 1) % n == 0 else 'S' for i in range(L))
    elif t.get('full_attention_interval'):
        n = t['full_attention_interval']
        mix = ''.join('G' if (i + 1) % n == 0 else 'L' for i in range(L))
    elif t.get('attention_chunk_size') and t.get('no_rope_layers'):  # Llama 4: chunked RoPE layers, global NoPE layers
        mix = ''.join('S' if x else 'G' for x in t['no_rope_layers'])
    elif mt == 'gemma2':
        mix = ''.join('S' if i % 2 == 0 else 'G' for i in range(L))
    elif t.get('sliding_window') and mt in ('mistral',):
        mix = 'S' * L
    else:
        mix = 'G' * L
    if mla:
        mix = mix.replace('G', 'M')
    if t.get('index_topk') and mt not in ('deepseek_v4',):
        mix = mix.replace('M', 'D').replace('G', 'D')
    if f['id'] == 'minimaxm3':  # three dense prefix layers then MiniMax Sparse Attention (model card, gallery)
        mix = 'G' * 3 + 'D' * (L - 3)
    if mt == 'deepseek_v4':
        mix = 'D' * L
    L = len(mix)
    # ---- FFN per layer ----
    E = g(t, 'n_routed_experts', 'num_experts', 'num_local_experts', 'moe_num_experts')
    if ffn is None:
        if t.get('mlp_layer_types'):
            ffn = ''.join('e' if x == 'sparse' else 'd' for x in t['mlp_layer_types'][:L])
        elif isinstance(t.get('moe_layer_freq'), list):
            ffn = ''.join('e' if x else 'd' for x in t['moe_layer_freq'][:L])
        elif t.get('moe_layers') is not None:
            ml = set(t['moe_layers']); ffn = ''.join('e' if i in ml else 'd' for i in range(L))
        elif t.get('mlp_only_layers'):
            ml = set(t['mlp_only_layers']); ffn = ''.join('d' if i in ml else 'e' for i in range(L))
        elif t.get('interleave_moe_layer_step') and E:
            s = t['interleave_moe_layer_step']; ffn = ''.join('e' if (i + 1) % s == 0 else 'd' for i in range(L))
        elif E and (t.get('num_experts_per_tok') or t.get('num_experts_per_token') or t.get('moe_top_k') or t.get('experts_per_token')):
            k0 = t.get('first_k_dense_replace') or 0
            ffn = ''.join('d' if i < k0 else 'e' for i in range(L))
        else:
            ffn = 'd' * L
    if mt == 'falcon_h1':
        ffn = 'd' * L
    # ---- position per layer ----
    prf = t.get('partial_rotary_factor')
    rp = t.get('rope_parameters') or {}
    prf_full = None
    if isinstance(rp, dict) and 'full_attention' in rp:
        prf_full = rp['full_attention'].get('partial_rotary_factor')
    elif prf is None and isinstance(rp, dict):
        prf = rp.get('partial_rotary_factor')
    if t.get('rotary_dim') and dh and t['rotary_dim'] < dh and not mla:
        prf = t['rotary_dim'] / dh
    nope_model = mt in ('jamba', 'granitemoehybrid') or f['id'] in ('nemoh',)
    pos = []
    for i, c in enumerate(mix):
        if c in 'LF':
            pos.append('-'); continue
        if mt == 'gpt2':
            pos.append('A'); continue
        p = 'R'
        if mla: p = 'P'
        if prf and prf < 1: p = 'P'
        if c == 'G' and prf_full and prf_full < 1: p = 'P'
        if t.get('no_rope_layer_interval') and (i + 1) % t['no_rope_layer_interval'] == 0: p = 'N'
        if t.get('no_rope_layers') is not None and not t['no_rope_layers'][i]: p = 'N'
        if t.get('mla_use_nope') and c in 'MD': p = 'N'
        if t.get('use_rope') is False or nope_model: p = 'N'
        if t.get('position_embedding_type') == 'none': p = 'N'
        pos.append(p)
    pos = ''.join(pos)
    if mt == 'granitemoehybrid' and t.get('position_embedding_type') not in (None, 'none', 'nope'):
        pos = pos.replace('N', 'R')
    # ---- KV bytes per token, bf16 ----
    b = 2
    if mla:
        per = {'M': (t['kv_lora_rank'] + rr) * b, 'D': (t['kv_lora_rank'] + rr) * b}
    else:
        pg = 2 * Hkv * dh * b
        per = {'G': pg, 'S': pg, 'D': pg, 'H': pg}
        if t.get('attention_k_eq_v') and t.get('global_head_dim'):  # Gemma 4: one tensor for K and V on global layers
            per['G'] = t['num_global_key_value_heads'] * t['global_head_dim'] * b
            per['S'] = 2 * Hkv * dh * b
    if mt == 'deepseek_v4':
        per = {}
    kv = sum(per.get(c, 0) for c in mix) or None
    W = g(t, 'sliding_window', 'sliding_window_size', 'attention_chunk_size') if 'S' in mix else None
    if mt == 'gemma2' and not W:
        W = 4096
    kvw = None
    if kv:
        tot = 0
        for c in mix:
            if c == 'S' and W:
                tot += per[c] * min(T_CREDIT, W)
            else:
                tot += per.get(c, 0) * T_CREDIT
        kvw = round(tot / T_CREDIT, 1)
    # ---- experts ----
    k = g(t, 'num_experts_per_tok', 'num_experts_per_token', 'experts_per_token', 'moe_top_k', 'top_k_experts')
    sh = g(t, 'n_shared_experts', 'num_shared_experts')
    if sh is None and (t.get('shared_expert_intermediate_size') or t.get('moe_shared_expert_intermediate_size') or t.get('shared_intermediate_size')):
        sh = 1
    if mt.startswith('llama4'):
        sh = 1  # Llama 4 MoE layers add a shared expert (model card: 128 routed experts and a shared expert)
    if 'e' not in ffn:
        E = k = sh = None
    dff = g(t, 'intermediate_size', 'n_inner', 'ffn_hidden_size', 'hidden_dim')
    if mt == 'gpt2':
        dff = dff or 4 * D
    if mt == 'falcon':
        dff = 4 * D  # Falcon MLP is 4x (modeling_falcon: dense_h_to_4h)
    dffe = g(t, 'moe_intermediate_size', 'expert_intermediate_size') if E else None
    if E and not dffe:
        dffe = dff
    # ---- position parameters ----
    rs = t.get('rope_scaling') or (rp if isinstance(rp, dict) and rp.get('rope_type') not in (None, 'default') else None) or {}
    if isinstance(rs, dict) and 'full_attention' in rs:
        rs = {}
    theta = t.get('rope_theta') or (rp.get('rope_theta') if isinstance(rp, dict) else None)
    if isinstance(rp, dict) and 'full_attention' in rp:
        theta = '%g local, %g global' % (rp['sliding_attention']['rope_theta'], rp['full_attention']['rope_theta'])
    elif t.get('rope_local_base_freq'):
        theta = '%g local, %g global' % (t['rope_local_base_freq'], t['rope_theta'])
    if mt == 'gpt2' or 'R' not in pos and 'P' not in pos:
        theta = None
    scale = ''
    if isinstance(rs, dict) and (rs.get('rope_type') or rs.get('type')) and rs.get('factor'):
        scale = '%s x%g' % (rs.get('rope_type') or rs.get('type'), rs.get('factor') or 0)
        if rs.get('original_max_position_embeddings'):
            scale += ' from %d' % rs['original_max_position_embeddings']
    # ---- recurrent state per linear layer (elements) ----
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
    elif mt == 'jamba':
        st = t['mamba_expand'] * D * t['mamba_d_state']
    if 'L' not in mix and 'H' not in mix:
        st = None
    if mla:
        dh = (t.get('qk_nope_head_dim') or 0) + (t.get('qk_rope_head_dim') or 0) or dh
    tied = t.get('tie_word_embeddings')
    if tied is None:
        tied = mt in ('gpt2',)
    return dict(L=L, D=D, H=H, Hkv=None if mla else Hkv, dh=dh, mix=mix, ffn=ffn, pos=pos, kv=kv, kvw=kvw,
                per=per, W=W, E=E, k=k, sh=sh, dff=dff, dffe=dffe, theta=theta, scale=scale,
                dc=t.get('kv_lora_rank'), dr=rr or None, V=g(t, 'vocab_size'),
                ctxc=g(t, 'max_position_embeddings', 'n_positions', 'max_seq_len', 'model_max_length'),
                st=st, tied=bool(tied), mt=mt)


def from_arch(f):
    a = f['arch']
    L, D, H, Hkv, dh = a['L'], a['D'], a['H'], a['Hkv'], a['dh']
    mix = 'G' * L
    pg = 2 * Hkv * dh * 2
    return dict(L=L, D=D, H=H, Hkv=Hkv, dh=dh, mix=mix, ffn='d' * L, pos=a['pos'] * L, kv=pg * L, kvw=float(pg * L),
                per={'G': pg}, W=None, E=None, k=None, sh=None, dff=a['dff'], dffe=None, theta=10000 if a['pos'] == 'R' else None,
                scale='', dc=None, dr=None, V=a['V'], ctxc=a['ctx'], st=None, tied=bool(a.get('tied', True)), mt='paper',
                mixnote=a.get('mixnote'))


def labels(r):
    mix, H, Hkv = r['mix'], r['H'], r['Hkv']
    nA = sum(c in 'GSMDH' for c in mix)
    nL = mix.count('L')
    nS = mix.count('S')
    nF = mix.count('F')
    if r.get('dc'):
        base = 'MLA'
    elif Hkv == H:
        base = 'MHA'
    elif Hkv == 1:
        base = 'MQA'
    else:
        base = 'GQA %d:%d' % (H, Hkv)
    parts = [base]
    if nS:
        nG = nA - nS
        parts.append(('SWA on every layer' if nG == 0 else '%d:%d sliding:global' % (nS // max(1, nG) if nS % max(1, nG) == 0 else nS, 1 if nS % max(1, nG) == 0 else nG)) + (' (window %s)' % format(r['W'], ',') if r.get('W') else ''))
    if 'D' in mix:
        parts.append('trained sparse')
    if 'H' in mix:
        parts.append('parallel with Mamba-2 heads in every layer')
    elif nL:
        parts.append('%d of %d layers attention' % (nA, nA + nL))
    att = ', '.join(parts)
    # categories for colour
    if nL or 'H' in mix:
        attk = 'Hybrid'
    elif 'D' in mix or r.get('sparse'):
        attk = 'Sparse'
    elif r.get('dc'):
        attk = 'MLA'
    elif Hkv == H:
        attk = 'MHA'
    elif Hkv == 1:
        attk = 'MQA'
    else:
        attk = 'GQA'
    moe = 'e' in r['ffn']
    hyb = bool(nL) or 'H' in mix
    ffk = ('Hybrid MoE' if moe else 'Hybrid dense') if hyb else ('MoE' if moe else 'Dense')
    hr = None
    if nL:
        g_ = nA
        hr = '%d:%d' % (nL // g_, 1) if g_ and nL % g_ == 0 else '%d:%d' % (nL, g_)
    sr = None
    if nS:
        nG = nA - nS
        sr = 'all' if nG == 0 else ('%d:1' % (nS // nG) if nS % nG == 0 else '%d:%d' % (nS, nG))
    return dict(att=att, attk=attk, ffk=ffk, hr=hr, sr=sr, nA=nA, nL=nL, nS=nS, nF=nF)


rows, rep = [], []
for f in FACTS:
    r = {k: v for k, v in f.items() if k != 'arch'}
    d = derive(f) if f.get('cfg') else from_arch(f)
    r.update(d)
    if f.get('cfg'):
        stem = f['cfg']
        repo = stem.replace('__', '/', 1)
        fn = 'params.json' if 'Mistral-Large-3' in repo else 'config.json'
        r['cfgu'] = 'https://huggingface.co/%s/blob/main/%s' % (repo, fn)
    r.update(labels(r))
    if f.get('attl'):
        r['att'] = f['attl']
    if f.get('attk'):
        r['attk'] = f['attk']
    r['ar'] = round(r['D'] / r['L'], 1)
    if not r.get('ctxc') and re.match(r'^[\d,]+$', str(r.get('cx') or '')):
        r['ctxc'] = int(r['cx'].replace(',', '')); r['ctxp'] = True  # config has no position limit: use the published context
    rows.append(r)
    rep.append('%-22s %-10s L%-3d D%-6d H%-4s kv%-4s dh%-4s %-44s kv/tok %-9s kvw@128K %-9s E%s k%s sh%s V%s ctx%s %s' % (
        r['n'], r['dt'], r['L'], r['D'], r['H'], r['Hkv'], r['dh'], r['att'][:44], r['kv'], r['kvw'], r['E'], r['k'], r['sh'], r['V'], r['ctxc'], r['ffk']))

rows.sort(key=lambda r: r['dt'])
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(rows, open(os.path.join(HERE, 'out', 'map.json'), 'w'), indent=1, ensure_ascii=False)
open(os.path.join(HERE, 'out', 'report.txt'), 'w').write('\n'.join(rep) + '\n')
keep = ['id', 'n', 'lab', 'lane', 'dt', 'dts', 'dtu', 'lic', 'lk', 'tot', 'act', 'pu', 'pnote', 'cx', 'paper', 'cfgu', 'nk', 'nt', 'qk',
        'ffa', 'sparse', 'ns', 'new', 'kvnote', 'posnote', 'mixnote', 'L', 'D', 'H', 'Hkv', 'dh', 'mix', 'ffn', 'pos', 'kv', 'kvw', 'W', 'E', 'k',
        'sh', 'dff', 'dffe', 'theta', 'scale', 'dc', 'dr', 'V', 'ctxc', 'ctxp', 'st', 'tied', 'att', 'attk', 'ffk', 'hr', 'sr', 'ar']
out = [{k: r.get(k) for k in keep if r.get(k) not in (None, '', [])} for r in rows]
js = ('// written by src/map/build_map.py from src/map/inputs (facts.yml and config.json files); do not edit by hand.\n'
      'window.AMD=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
open(os.path.join(SRC, 'parts', '35_js_am_0data.js'), 'w').write(js)
print('\n'.join(rep))
print('rows', len(out), 'bytes', len(js.encode()))
