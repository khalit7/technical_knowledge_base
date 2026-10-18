"""Config calculator: the Python reference for the Config calculator tab (Topic: llm-architecture).

From a Hugging Face config.json to parameters (total and active, by component), forward FLOPs per token
for prefill and decode at a context length, KV cache (and recurrent state) bytes, and weight memory by dtype.
Standard library only. The JavaScript in parts/33_js_cc_1core.js is a line-by-line port of this file;
check_js_equals_py.mjs proves the two agree on every config in src/data/configs/.

Conventions (stated on the page):
- Parameters are the trainable tensors the config implies, counted as PyTorch would build them in
  transformers (weights, biases, norm gains). Buffers (rotary tables, causal masks) are not parameters.
- "total" is the main model; multi-token-prediction (MTP) modules and vision towers are reported apart.
- "active" counts the routed experts a token uses (top_k of n_experts per MoE layer); everything else is
  dense. The input embedding is a lookup, not a matmul: it is in the parameter count but not in FLOPs.
- Forward FLOPs per token = 2 x (matmul weights a token touches, including the LM head) + the attention
  term (2 FLOPs per multiply-add over every cached position it reads). Training is about 3x forward.
"""
import json, math, sys

GLU_ACTS = {'silu', 'swish', 'gelu_pytorch_tanh', 'gelu', 'gelu_new', 'swiglu', 'geglu'}


def _g(c, *keys, default=None):
    for k in keys:
        if k in c and c[k] is not None:
            return c[k]
    return default


def normalise(cfg):
    """Turn a config.json dict into a canonical spec: one entry per layer with its mixer and FFN."""
    top = cfg
    c = cfg.get('text_config') or cfg
    mt = c.get('model_type') or top.get('model_type') or ''
    s = {'model_type': mt, 'notes': [], 'vision': bool(top.get('vision_config'))}
    if mt == 'gpt2':
        d = c['n_embd']; L = c['n_layer']; nh = c['n_head']; V = c['vocab_size']
        s.update(d=d, V=V, tied=True, pos_embed=c.get('n_positions', 1024) * d, norm_bias=True, final_norm=d)
        lay = {'mix': {'t': 'attn', 'nh': nh, 'nkv': nh, 'hd': d // nh, 'hdv': d // nh, 'bqkv': True, 'bo': True,
                       'qk': 0, 'sinks': False, 'gate': False, 'win': 0},
               'ffn': {'t': 'mlp', 'ff': c.get('n_inner') or 4 * d, 'bias': True}, 'norms': 4 * d}
        s['layers'] = [lay] * L
        return s
    if mt in ('mamba2',) or ('ssm_cfg' in c and 'd_model' in c):
        d = c['d_model']; L = c['n_layer']; V = c['vocab_size']; m = c.get('pad_vocab_size_multiple', 1)
        if V % m: V += m - V % m
        sc = c.get('ssm_cfg') or {}
        ds = sc.get('d_state', 128); hd = sc.get('headdim', 64); di = sc.get('expand', 2) * d
        mix = {'t': 'mamba2', 'nh': di // hd, 'hd': hd, 'ds': ds, 'ng': sc.get('ngroups', 1), 'k': sc.get('d_conv', 4),
               'cb': sc.get('conv_bias', True), 'pb': sc.get('bias', False), 'norm': sc.get('rmsnorm', True)}
        s.update(d=d, V=V, tied=c.get('tie_embeddings', True), final_norm=d)
        ff = c.get('d_intermediate', 0)
        s['layers'] = [{'mix': mix, 'ffn': {'t': 'glu', 'ff': ff, 'bias': False} if ff else None,
                        'norms': d * (2 if ff else 1)}] * L
        s['notes'].append('vocab padded to a multiple of %d' % m)
        return s
    if mt == 'mamba':
        d = c['hidden_size']; L = c['num_hidden_layers']; V = c['vocab_size']
        di = c.get('intermediate_size') or c.get('expand', 2) * d
        dtr = c.get('time_step_rank', 'auto')
        if dtr == 'auto': dtr = math.ceil(d / 16)
        mix = {'t': 'mamba1', 'di': di, 'ds': c.get('state_size', 16), 'k': c.get('conv_kernel', 4), 'dtr': dtr,
               'cb': c.get('use_conv_bias', True), 'pb': c.get('use_bias', False), 'xn': False}
        s.update(d=d, V=V, tied=c.get('tie_word_embeddings', True), final_norm=d)
        s['layers'] = [{'mix': mix, 'ffn': None, 'norms': d}] * L
        return s

    d = c['hidden_size']; L = c['num_hidden_layers']; V = c['vocab_size']
    nh = c.get('num_attention_heads'); nkv = _g(c, 'num_key_value_heads', default=nh)
    hd = _g(c, 'head_dim', 'attention_head_dim', default=(d // nh if nh else 0))
    ff = c.get('intermediate_size')
    gemma = mt.startswith('gemma')
    tied = c.get('tie_word_embeddings', top.get('tie_word_embeddings', gemma))
    if mt in ('gemma', 'gemma2', 'gemma3', 'gemma3_text'): tied = True
    s.update(d=d, V=V, tied=bool(tied), final_norm=d)
    norm_bias = False

    # attention flavour
    bqkv = bool(c.get('attention_bias', False)) or mt in ('qwen2', 'qwen2_moe')
    bo = bool(c.get('attention_bias', False)) and mt not in ('glm4_moe', 'qwen2', 'qwen2_moe')
    qk = 0
    if mt in ('qwen3', 'qwen3_moe', 'gemma3', 'gemma3_text', 'qwen3_next') or \
            (mt == 'glm4_moe' and c.get('use_qk_norm')):
        qk = 2 * hd
    if mt in ('olmo2', 'olmo3') or (mt == 'minimax_m2' and c.get('use_qk_norm') and c.get('qk_norm_type') == 'per_layer'):
        qk = nh * hd + nkv * hd
    win = c.get('sliding_window') or 0
    lt = c.get('layer_types')
    if mt in ('gemma3', 'gemma3_text') and not lt:
        p = c.get('sliding_window_pattern', 6)
        lt = ['full_attention' if (i + 1) % p == 0 else 'sliding_attention' for i in range(L)]
    if mt == 'gemma2' and not lt:
        lt = ['sliding_attention' if i % 2 == 0 else 'full_attention' for i in range(L)]
    if mt == 'llama4_text':
        nrl = c.get('no_rope_layers') or []
        ch = c.get('attention_chunk_size') or 0
        lt = ['sliding_attention' if (nrl and nrl[i] and ch) else 'full_attention' for i in range(L)]
        win = ch
        if ch: s['notes'].append('chunked attention (%d) treated as a window of %d for cache and FLOPs' % (ch, ch))

    def attn(i):
        w = 0
        if lt:
            w = win if lt[i] == 'sliding_attention' else 0
        elif mt in ('mistral', 'mixtral', 'qwen2', 'phi3') and c.get('use_sliding_window', True):
            w = win
        return {'t': 'attn', 'nh': nh, 'nkv': nkv, 'hd': hd, 'hdv': hd, 'bqkv': bqkv, 'bo': bo, 'qk': qk,
                'sinks': mt == 'gpt_oss', 'gate': mt == 'qwen3_next', 'win': w}

    norms = 2 * d
    if mt in ('gemma2', 'gemma3', 'gemma3_text'): norms = 4 * d
    dense = {'t': 'glu', 'ff': ff, 'bias': bool(c.get('mlp_bias', False))}
    layers = []

    if mt in ('deepseek_v2', 'deepseek_v3', 'deepseek_v32', 'kimi_k2'):
        E = c['n_routed_experts']
        mla = {'t': 'mla', 'nh': nh, 'ql': c.get('q_lora_rank') or 0, 'nope': c['qk_nope_head_dim'],
               'rope': c['qk_rope_head_dim'], 'v': c['v_head_dim'], 'kvl': c['kv_lora_rank'],
               'inh': c.get('index_n_heads', 0) if mt == 'deepseek_v32' else 0,
               'ihd': c.get('index_head_dim', 0) if mt == 'deepseek_v32' else 0,
               'itop': c.get('index_topk', 0) if mt == 'deepseek_v32' else 0}
        moe = {'t': 'moe', 'E': E, 'k': c['num_experts_per_tok'], 'ff': c['moe_intermediate_size'],
               'sff': (c.get('n_shared_experts') or 0) * c['moe_intermediate_size'], 'sgate': False,
               'rbias': False, 'cbias': c.get('topk_method') == 'noaux_tc', 'ebias': False}
        fk = c.get('first_k_dense_replace', 0); fr = c.get('moe_layer_freq', 1)
        for i in range(L):
            f = moe if (i >= fk and i % fr == 0) else dense
            layers.append({'mix': mla, 'ffn': f, 'norms': norms})
        s['mtp'] = c.get('num_nextn_predict_layers', 0) or 0; s['mtp_copy'] = True
        s['layers'] = layers
        return s

    if mt == 'nemotron_h':
        pat = c['hybrid_override_pattern']
        m2 = {'t': 'mamba2', 'nh': c['mamba_num_heads'], 'hd': c['mamba_head_dim'], 'ds': c['ssm_state_size'],
              'ng': c['n_groups'], 'k': c['conv_kernel'], 'cb': c.get('use_conv_bias', True),
              'pb': c.get('mamba_proj_bias', False), 'norm': True}
        for ch in pat:
            if ch == 'M': layers.append({'mix': m2, 'ffn': None, 'norms': d})
            elif ch == '*': layers.append({'mix': attn(0) | {'win': 0}, 'ffn': None, 'norms': d})
            elif ch == '-': layers.append({'mix': None, 'ffn': {'t': 'mlp', 'ff': ff, 'bias': bool(c.get('mlp_bias'))}, 'norms': d})
        s['layers'] = layers
        return s

    if mt == 'granitemoehybrid':
        m2 = {'t': 'mamba2', 'nh': c['mamba_n_heads'], 'hd': c['mamba_d_head'], 'ds': c['mamba_d_state'],
              'ng': c['mamba_n_groups'], 'k': c['mamba_d_conv'], 'cb': c.get('mamba_conv_bias', True),
              'pb': c.get('mamba_proj_bias', False), 'norm': True}
        E = c.get('num_local_experts', 0)
        f = {'t': 'moe', 'E': E, 'k': c['num_experts_per_tok'], 'ff': ff, 'sff': c.get('shared_intermediate_size', 0),
             'sgate': False, 'rbias': False, 'cbias': False, 'ebias': False} if E else \
            {'t': 'glu', 'ff': c.get('shared_intermediate_size', 0), 'bias': False}
        for t in c['layer_types']:
            layers.append({'mix': m2 if t == 'mamba' else attn(0) | {'win': 0}, 'ffn': f, 'norms': 2 * d})
        s['layers'] = layers
        return s

    if mt == 'jamba':
        di = c.get('mamba_expand', 2) * d
        dtr = c.get('mamba_dt_rank', 'auto')
        if dtr == 'auto': dtr = math.ceil(d / 16)
        m1 = {'t': 'mamba1', 'di': di, 'ds': c['mamba_d_state'], 'k': c['mamba_d_conv'], 'dtr': dtr,
              'cb': c.get('mamba_conv_bias', True), 'pb': c.get('mamba_proj_bias', False), 'xn': True}
        moe = {'t': 'moe', 'E': c['num_experts'], 'k': c['num_experts_per_tok'], 'ff': ff, 'sff': 0, 'sgate': False,
               'rbias': False, 'cbias': False, 'ebias': False}
        ap, ao = c.get('attn_layer_period', 8), c.get('attn_layer_offset', 4)
        ep, eo = c.get('expert_layer_period', 2), c.get('expert_layer_offset', 1)
        for i in range(L):
            layers.append({'mix': attn(0) | {'win': 0} if i % ap == ao else m1,
                           'ffn': moe if i % ep == eo else dense, 'norms': 2 * d})
        s['layers'] = layers
        return s

    if mt == 'falcon_h1':
        di = c.get('mamba_d_ssm') or c['mamba_expand'] * d
        m2 = {'t': 'mamba2', 'nh': c['mamba_n_heads'], 'hd': di // c['mamba_n_heads'], 'ds': c['mamba_d_state'],
              'ng': c['mamba_n_groups'], 'k': c['mamba_d_conv'], 'cb': c.get('mamba_conv_bias', True),
              'pb': c.get('mamba_proj_bias', False), 'norm': bool(c.get('mamba_rms_norm'))}
        a = attn(0) | {'win': 0}
        for i in range(L):
            layers.append({'mix': a, 'mix2': m2, 'ffn': dense, 'norms': 2 * d})
        s['layers'] = layers
        return s

    if mt == 'qwen3_next':
        gdn = {'t': 'gdn', 'nk': c['linear_num_key_heads'], 'nv': c['linear_num_value_heads'],
               'dk': c['linear_key_head_dim'], 'dv': c['linear_value_head_dim'], 'k': c['linear_conv_kernel_dim']}
        fi = c.get('full_attention_interval', 4)
        lt = c.get('layer_types') or ['full_attention' if (i + 1) % fi == 0 else 'linear_attention' for i in range(L)]
        moe = {'t': 'moe', 'E': c['num_experts'], 'k': c['num_experts_per_tok'], 'ff': c['moe_intermediate_size'],
               'sff': c.get('shared_expert_intermediate_size', 0), 'sgate': True, 'rbias': False, 'cbias': False,
               'ebias': False}
        for i in range(L):
            layers.append({'mix': attn(i) | {'win': 0} if lt[i] == 'full_attention' else gdn, 'ffn': moe, 'norms': norms})
        s['layers'] = layers
        s['mtp'] = c.get('mtp_num_hidden_layers', 1); s['mtp_copy'] = False
        return s

    # MoE transformers and dense transformers
    moe = None
    if mt in ('mixtral', 'qwen3_moe', 'qwen2_moe', 'gpt_oss', 'llama4_text', 'minimax_m2', 'glm4_moe'):
        E = _g(c, 'num_local_experts', 'num_experts', 'n_routed_experts')
        k = _g(c, 'num_experts_per_tok', 'experts_per_token')
        eff = c.get('moe_intermediate_size') or ff
        sff = 0
        if mt == 'llama4_text': sff = ff
        if mt == 'glm4_moe': sff = (c.get('n_shared_experts') or 0) * eff
        if mt == 'qwen2_moe': sff = c.get('shared_expert_intermediate_size', 0)
        moe = {'t': 'moe', 'E': E, 'k': k, 'ff': eff, 'sff': sff, 'sgate': mt == 'qwen2_moe',
               'rbias': mt == 'gpt_oss', 'cbias': mt in ('minimax_m2', 'glm4_moe'), 'ebias': mt == 'gpt_oss'}
    for i in range(L):
        f = dense
        if moe:
            if mt in ('qwen3_moe', 'qwen2_moe'):
                st = c.get('decoder_sparse_step', 1)
                f = moe if (i not in (c.get('mlp_only_layers') or []) and (i + 1) % st == 0) else dense
            elif mt == 'llama4_text':
                ml = c.get('moe_layers')
                if ml is None:
                    st = c.get('interleave_moe_layer_step', 1); ml = list(range(st - 1, L, st))
                f = moe if i in ml else {'t': 'glu', 'ff': c.get('intermediate_size_mlp', ff), 'bias': False}
            elif mt == 'glm4_moe':
                f = moe if i >= c.get('first_k_dense_replace', 0) else dense
            else:
                f = moe
        layers.append({'mix': attn(i), 'ffn': f, 'norms': norms})
    s['layers'] = layers
    if mt == 'glm4_moe': s['mtp'] = c.get('num_nextn_predict_layers', 0) or 0; s['mtp_copy'] = True
    if mt == 'minimax_m2' and c.get('use_mtp'):
        s['notes'].append('MTP modules (num_mtp_modules=%s) are not in the released weights' % c.get('num_mtp_modules'))
    if mt in ('gemma', 'gemma2', 'gemma3', 'gemma3_text'):
        s['notes'].append('tied embeddings (Gemma always ties)')
    s['norm_bias'] = norm_bias
    return s


def mixer_params(m, d):
    """Parameters of one sequence mixer, split into (matmul weights, other: biases, norms, small vectors)."""
    if m is None: return 0, 0
    t = m['t']
    if t == 'attn':
        q = d * m['nh'] * m['hd'] * (2 if m['gate'] else 1)
        kv = 2 * d * m['nkv'] * m['hd']
        o = m['nh'] * m['hdv'] * d
        oth = (m['nh'] * m['hd'] * (2 if m['gate'] else 1) + 2 * m['nkv'] * m['hd'] if m['bqkv'] else 0) + \
              (d if m['bo'] else 0) + m['qk'] + (m['nh'] if m['sinks'] else 0)
        return q + kv + o, oth
    if t == 'mla':
        nh = m['nh']; qh = m['nope'] + m['rope']
        if m['ql']:
            q = d * m['ql'] + m['ql'] * nh * qh; oth = m['ql']
        else:
            q = d * nh * qh; oth = 0
        kv = d * (m['kvl'] + m['rope']) + m['kvl'] * nh * (m['nope'] + m['v'])
        oth += m['kvl']
        o = nh * m['v'] * d
        mm = q + kv + o
        if m['inh']:
            mm += (m['ql'] or d) * m['inh'] * m['ihd'] + d * m['ihd'] + d * m['inh']
            oth += 2 * m['ihd']
        return mm, oth
    if t == 'mamba2':
        di = m['nh'] * m['hd']; gs = 2 * m['ng'] * m['ds']
        inp = d * (2 * di + gs + m['nh']); out = di * d
        conv_dim = di + gs
        oth = conv_dim * m['k'] + (conv_dim if m['cb'] else 0) + 3 * m['nh'] + (di if m['norm'] else 0)
        if m['pb']: oth += 2 * di + gs + m['nh'] + d
        return inp + out, oth
    if t == 'mamba1':
        di = m['di']; ds = m['ds']; r = m['dtr']
        mm = d * 2 * di + di * (r + 2 * ds) + r * di + di * d
        oth = di * m['k'] + (di if m['cb'] else 0) + di + di * ds + di
        if m['pb']: oth += 2 * di + d
        if m['xn']: oth += r + 2 * ds  # Jamba's dt, B and C RMSNorms
        return mm, oth
    if t == 'gdn':
        kd = m['nk'] * m['dk']; vd = m['nv'] * m['dv']
        mm = d * (2 * kd + 2 * vd) + d * 2 * m['nv'] + vd * d
        oth = (2 * kd + vd) * m['k'] + 2 * m['nv'] + m['dv']
        return mm, oth
    raise ValueError(t)


def ffn_params(f, d):
    """Returns dict: dense matmul, dense other, routed experts (all), shared, router (matmul), other."""
    r = {'dense': 0, 'dense_o': 0, 'routed': 0, 'routed_o': 0, 'shared': 0, 'router': 0, 'moe_o': 0}
    if f is None: return r
    if f['t'] == 'glu':
        r['dense'] = 3 * d * f['ff']; r['dense_o'] = (2 * f['ff'] + d) if f['bias'] else 0
    elif f['t'] == 'mlp':
        r['dense'] = 2 * d * f['ff']; r['dense_o'] = (f['ff'] + d) if f['bias'] else 0
    else:
        E = f['E']
        r['routed'] = E * 3 * d * f['ff']
        r['routed_o'] = E * (2 * f['ff'] + d) if f['ebias'] else 0
        r['shared'] = 3 * d * f['sff'] + (d if f['sgate'] else 0)
        r['router'] = d * E
        r['moe_o'] = (E if f['rbias'] else 0) + (E if f['cbias'] else 0)
    return r


def params(spec):
    d = spec['d']; V = spec['V']
    b = {'embedding': V * d + spec.get('pos_embed', 0), 'unembedding': 0 if spec['tied'] else V * d,
         'attention': 0, 'ssm': 0, 'ffn_dense': 0, 'moe_routed': 0, 'moe_shared': 0, 'router': 0,
         'norms': spec.get('final_norm', d) * (2 if spec.get('norm_bias') else 1), 'biases_other': 0}
    act = {'routed': 0}; mm = 0  # matmul weights a token touches
    for lay in spec['layers']:
        b['norms'] += lay['norms']
        for key in ('mix', 'mix2'):
            m = lay.get(key)
            if m is None: continue
            w, o = mixer_params(m, d)
            if m['t'] in ('attn', 'mla'): b['attention'] += w + o
            else: b['ssm'] += w + o
            mm += w
        f = ffn_params(lay['ffn'], d)
        b['ffn_dense'] += f['dense'] + f['dense_o']
        b['moe_routed'] += f['routed'] + f['routed_o']
        b['moe_shared'] += f['shared']
        b['router'] += f['router'] + f['moe_o']
        mm += f['dense'] + f['shared'] + f['router']
        if lay['ffn'] and lay['ffn']['t'] == 'moe':
            per = (f['routed'] + f['routed_o']) / lay['ffn']['E']
            act['routed'] += per * lay['ffn']['k']
            mm += 3 * d * lay['ffn']['ff'] * lay['ffn']['k']
    total = sum(b.values())
    active = total - b['moe_routed'] + act['routed']
    mm += V * d  # LM head matmul (also when tied)
    mtp = 0
    if spec.get('mtp'):
        # one extra decoder layer like the last layer, plus a 2d x d projection and three norms (DeepSeek: eh_proj,
        # enorm, hnorm, shared_head.norm; Qwen3-Next: fc, two pre-fc norms, norm); DeepSeek and GLM also store a copy
        # of the embedding and the head inside the MTP layer
        last = spec['layers'][-1]
        w, o = mixer_params(last['mix'], d); f = ffn_params(last['ffn'], d)
        one = w + o + sum(f.values()) + last['norms'] + 2 * d * d + 3 * d
        mtp = spec['mtp'] * (one + (2 * V * d if spec.get('mtp_copy') else 0))
    active = int(round(active))
    return {'breakdown': b, 'total': int(total), 'active': active,
            'active_no_emb': active - b['embedding'],
            'active_no_emb_head': active - b['embedding'] - b['unembedding'],
            'matmul_active': int(round(mm)), 'mtp': int(mtp)}


def _attn_coef(m, mode):
    """FLOPs per (token, cached position) for one layer's attention: 2 x heads x (qk dim + v dim)."""
    if m['t'] == 'attn': return 2 * m['nh'] * (m['hd'] + m['hdv'])
    if m['t'] == 'mla':
        if mode == 'decode': return 2 * m['nh'] * (m['kvl'] + m['rope'] + m['kvl'])  # absorbed: attend over the latent
        return 2 * m['nh'] * (m['nope'] + m['rope'] + m['v'])
    return 0


def _state_flops(m, d):
    """Approximate FLOPs per token of a recurrent mixer's state update and readout (recurrent form)."""
    if m['t'] == 'mamba2':
        di = m['nh'] * m['hd']; return 6 * di * m['ds'] + 2 * (di + 2 * m['ng'] * m['ds']) * m['k']
    if m['t'] == 'mamba1': return 6 * m['di'] * m['ds'] + 2 * m['di'] * m['k']
    if m['t'] == 'gdn': return 8 * m['nv'] * m['dk'] * m['dv'] + 2 * (2 * m['nk'] * m['dk'] + m['nv'] * m['dv']) * m['k']
    return 0


def _span(m, L):
    """Positions one token reads at context L (window, chunk or DSA top-k caps it)."""
    if m['t'] == 'attn' and m['win']: return min(L, m['win'])
    if m['t'] == 'mla' and m['itop']: return min(L, m['itop'])
    return L


def _sum_span(m, S):
    """Sum over t = 1..S of positions read by token t (causal prefill of S tokens)."""
    cap = (m['win'] if m['t'] == 'attn' else m['itop'] if m['t'] == 'mla' else 0) or 0
    if not cap or S <= cap: return S * (S + 1) / 2
    return cap * (cap + 1) / 2 + (S - cap) * cap


def flops(spec, ctx):
    """Forward FLOPs per token: decode (one new token at context ctx) and prefill (average over ctx tokens)."""
    p = params(spec); d = spec['d']
    dense = 2 * p['matmul_active']
    dec_attn = 0; pre_attn = 0; state = 0
    for lay in spec['layers']:
        for key in ('mix', 'mix2'):
            m = lay.get(key)
            if m is None: continue
            if m['t'] in ('attn', 'mla'):
                dec_attn += _attn_coef(m, 'decode') * _span(m, ctx)
                pre_attn += _attn_coef(m, 'prefill') * _sum_span(m, ctx) / ctx
                if m['t'] == 'mla' and m['inh']:
                    dec_attn += 2 * m['inh'] * m['ihd'] * ctx
                    pre_attn += 2 * m['inh'] * m['ihd'] * (ctx + 1) / 2
            else:
                state += _state_flops(m, d)
    return {'weights': dense, 'decode_attn': dec_attn, 'prefill_attn': pre_attn, 'state': state,
            'decode': dense + dec_attn + state, 'prefill': dense + pre_attn + state}


def cache(spec, ctx, kv_bytes=2, state_bytes=4):
    """Bytes of KV cache (grows with ctx, capped by windows) plus fixed recurrent state, for ONE sequence."""
    kv = 0; st = 0
    for lay in spec['layers']:
        for key in ('mix', 'mix2'):
            m = lay.get(key)
            if m is None: continue
            if m['t'] == 'attn': kv += 2 * m['nkv'] * m['hd'] * _span(m, ctx) * kv_bytes
            elif m['t'] == 'mla': kv += (m['kvl'] + m['rope'] + m['ihd']) * ctx * kv_bytes
            elif m['t'] == 'mamba2':
                di = m['nh'] * m['hd']; st += (di * m['ds'] + (di + 2 * m['ng'] * m['ds']) * (m['k'] - 1)) * state_bytes
            elif m['t'] == 'mamba1': st += (m['di'] * m['ds'] + m['di'] * (m['k'] - 1)) * state_bytes
            elif m['t'] == 'gdn':
                st += (m['nv'] * m['dk'] * m['dv'] + (2 * m['nk'] * m['dk'] + m['nv'] * m['dv']) * (m['k'] - 1)) * state_bytes
    return {'kv': kv, 'state': st, 'total': kv + st}


def summary(cfg, ctx=8192):
    s = normalise(cfg); p = params(s); f = flops(s, ctx); k1 = cache(s, 1); kc = cache(s, ctx)
    nl = len(s['layers'])
    kinds = {}
    for lay in s['layers']:
        for key in ('mix', 'mix2'):
            m = lay.get(key)
            if m is not None:
                kk = m['t'] + ('_win' if m['t'] == 'attn' and m['win'] else '')
                kinds[kk] = kinds.get(kk, 0) + 1
    return {'model_type': s['model_type'], 'd': s['d'], 'V': s['V'], 'layers': nl, 'tied': s['tied'],
            'mixers': kinds, 'params': p, 'flops_%d' % ctx: f, 'kv_per_token_bf16': k1['kv'],
            'cache_%d_bf16' % ctx: kc, 'notes': s['notes'], 'vision': s['vision']}


if __name__ == '__main__':
    for path in sys.argv[1:]:
        print(path)
        print(json.dumps(summary(json.load(open(path))), indent=1))
