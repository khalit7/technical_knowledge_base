#!/usr/bin/env python3
"""Gallery data: every model of Raschka's LLM Architecture Gallery (models.yml) rebuilt from its own config.json.

Inputs (all in src/inputs/): models.yml (rasbt/llm-architecture-gallery at commit 589d213, 2026-10-04, Apache 2.0, read
2026-10-18), configs/*.json (Hugging Face config.json; params.json for Mistral Large 3; public mirrors for gated repos).
Outputs: src/out/gallery.json (every row, every field), src/out/report.txt (computed against the gallery's figure),
parts/22_js_ag_0data.js (window.AGD, the fields the page shows, and the config fields each row was decoded from).

The per-layer codes and the KV arithmetic are the root Architecture map's (src/map/build_map.py of Topic:
llm-architecture), copied branch for branch so both pages print the same numbers; check_data.py proves it on every model
the two pages share. Branches marked GALLERY handle configs the map does not carry and never fire on a map model.
  mixer  G full softmax attention, S sliding-window or chunked, M MLA, D trained-sparse selection, L linear or recurrent,
         H parallel hybrid (attention and SSM heads in one layer), F no mixer (FFN-only block)
  ffn    d dense, e mixture of experts, '.' none
  pos    A learned absolute, R RoPE, P partial RoPE (or MLA's decoupled RoPE key), N none (NoPE), B learned relative
         bias, '-' no attention
KV bytes per token: bf16 (2 bytes), cache-growing layers only, every layer at full cost (the gallery's and the map's
convention). kvw: the average per token at 131,072 tokens when sliding windows are credited (min(T, W) per windowed
layer). idx: trained-sparse indexer keys, an extra growing cache reported apart. st: fixed recurrent state, elements per
linear layer.
"""
import json, os, re, sys
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = os.path.join(HERE, 'inputs', 'configs')
G = yaml.safe_load(open(os.path.join(HERE, 'inputs', 'models.yml')))
T_CREDIT = 131072
GALLERY_COMMIT = '589d213a12188abc4b554a0c32ca735ceda75616'

# gated repos read from public mirrors with the same shapes (named on the page)
MIR = {'Gemma 3 270M': 'unsloth/gemma-3-270m', 'Gemma 3 27B': 'unsloth/gemma-3-27b-it',
       'Llama 4 Maverick': 'unsloth/Llama-4-Maverick-17B-128E-Instruct', 'Llama 3 8B': 'unsloth/llama-3-8b',
       'Llama 3.2 1B': 'unsloth/Llama-3.2-1B', 'Llama 3.2 3B': 'unsloth/Llama-3.2-3B'}
# rows the gallery does not list, added because the page uses them
EXTRA = {
    'Llama 3.1 8B': dict(company='Meta', date='2024-07-23', repo='unsloth/Meta-Llama-3.1-8B', scale='8B parameters', decoder_type='Dense',
                         attention='GQA with RoPE', context_tokens='131,072', license_name='Llama 3.1 Community License',
                         note='Not in the gallery (it lists Llama 3 8B, the same attention shape). The root page\'s worked config.'),
    'Llama 3.1 70B': dict(company='Meta', date='2024-07-23', repo='unsloth/Meta-Llama-3.1-70B', scale='70B parameters', decoder_type='Dense',
                          attention='GQA with RoPE', context_tokens='131,072', license_name='Llama 3.1 Community License',
                          note='Not in the gallery. Worked example for cache at context.'),
    'Granite 4.0-H Small': dict(company='IBM', date='2025-10-02', repo='ibm-granite/granite-4.0-h-small', scale='32B total, 9B active', decoder_type='Hybrid MoE',
                                attention='Mostly Mamba-2 with a few GQA layers, NoPE', context_tokens='', license_name='Apache License 2.0',
                                note='Not in the gallery; config fetched directly.'),
}
# the topic's running example, its config written out from src/data/configs.py (baseline preset)
TINY = {'model_type': 'gpt2', 'n_layer': 6, 'n_embd': 256, 'n_head': 8, 'n_positions': 256, 'vocab_size': 4096, 'tie_word_embeddings': True}
# gallery rows with no config this page can read, and why (shown on the page)
NOCFG = {
    'Tiny Aya 3.35B': 'gated repo (CohereLabs/tiny-aya-base returns "Access to model ... is restricted"); no public mirror found',
    'Soofi S 30B-A3B': 'gated repo (Soofi-Project/Soofi-S-Base); no public mirror found',
    'Antares 1B': 'gated repo (fdtn-ai/antares-1b); no public mirror found',
    'BTL-3 27B': 'a LoRA adapter on Qwen3.6-27B: its repo has no config.json ("Entry not found"); see Qwen3.6 27B',
}
# gallery-only KV figures: compressed caches the per-layer formula does not rebuild (shown as the gallery's number)
GALLERY_KV_ONLY = {'deepseek_v4', 'deepseek_v41_text'}


class Track(dict):
    """A config dict that records which keys were read, so the page can show the fields each row was decoded from."""
    def __init__(self, d):
        super().__init__(d)
        self.used = []

    def _u(self, k):
        if k not in self.used:
            self.used.append(k)

    def get(self, k, d=None):
        self._u(k)
        return super().get(k, d)

    def __getitem__(self, k):
        self._u(k)
        return super().__getitem__(k)


def load(stem):
    j = json.load(open(os.path.join(CFG, stem + '.json')))
    t = j.get('text_config') or j.get('llm_config') or j
    if isinstance(t, str):  # GALLERY: DeepSeek V4.1-Flash stores text_config as a Python-repr string
        import ast
        t = ast.literal_eval(t)
    nest = 'text_config' if j.get('text_config') else ('llm_config' if j.get('llm_config') else '')
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
        nest = 'params.json'
    for k in ('tie_word_embeddings',):
        if k in j and k not in t:
            t[k] = j[k]
    return t, nest


def g(t, *ks, d=None):
    for k in ks:
        if t.get(k) is not None:
            return t[k]
    return d


def derive(t, stem, name):
    """Per-layer codes and cache arithmetic. The body follows src/map/build_map.py derive() line for line; GALLERY
    branches are the additions (from this page's 2026-10-01 build) for configs the map does not carry."""
    mt = t.get('model_type', '') or ''
    note = []
    L = g(t, 'num_hidden_layers', 'n_layer', 'num_layers')
    D = g(t, 'hidden_size', 'n_embd', 'd_model')
    H = g(t, 'num_attention_heads', 'n_head', 'num_heads')
    Hkv = g(t, 'num_key_value_heads', 'num_kv_heads', 'num_attention_groups', d=H)  # GALLERY: Step's num_attention_groups
    if mt == 'falcon' and not t.get('new_decoder_architecture') and t.get('multi_query'):
        Hkv = 1
    dh = g(t, 'head_dim', 'attention_head_dim', d=(D // H if D and H else None))
    mla = bool(t.get('kv_lora_rank'))
    if mt == 'Motif':  # GALLERY: Motif's released code caches the expanded keys and values, not the latent
        mla = False
        note.append('latent projections, but modeling_motif.py caches the expanded keys (16 heads x 192) and values (16 x 128)')
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
    elif lt and mt == 'nemotron_h':  # GALLERY: newer Nemotron configs spell the pattern as layers_block_type
        mix = ''.join({'mamba': 'L', 'attention': 'G', 'moe': 'F', 'mlp': 'F'}[x] for x in lt)
        ffn = ''.join({'mamba': '.', 'attention': '.', 'moe': 'e', 'mlp': 'd'}[x] for x in lt)
    elif t.get('gqa_layers') is not None:  # GALLERY: Solar Open 2 lists its GQA layers, the rest linear
        fa = set(t['gqa_layers']); mix = ''.join('G' if i in fa else 'L' for i in range(L))
    elif mt == 'bailing_hybrid':  # GALLERY: Ling, one MLA layer closing each group of layer_group_size
        n = t['layer_group_size']; mix = ''.join('M' if (i + 1) % n == 0 else 'L' for i in range(L))
    elif t.get('hybrid_layer_pattern'):  # GALLERY: MiMo, 0 = global, 1 = sliding
        mix = ''.join('G' if x == 0 else 'S' for x in t['hybrid_layer_pattern'])
    elif t.get('local_layer_ids') is not None:  # GALLERY: Inkling
        lo = set(t['local_layer_ids']); mix = ''.join('S' if i in lo else 'G' for i in range(L))
    elif lt:
        m = {'full_attention': 'G', 'attention': 'G', 'global': 'G', 'sliding_attention': 'S', 'linear_attention': 'L',
             'deepseek_sparse_attention': 'D', 'chunked_attention': 'S', 'conv': 'L', 'short_conv': 'L', 'mamba': 'L',
             'hybrid': 'G', 'hybrid_sliding': 'S'}  # GALLERY: ZAYA's CCA attention layers keep an ordinary K/V cache
        mix = ''.join(m.get(x, '?') for x in lt[:L])
    elif t.get('sliding_window_pattern') == 'interleave':  # GALLERY: Motif 3, a full layer every sliding_window_period, from layer 0
        n = t['sliding_window_period']; mix = ''.join('G' if i % n == 0 else 'S' for i in range(L))
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
    elif mt == 'longcat_flash' or 'LongcatFlashNgramForCausalLM' in (t.get('architectures') or []):  # GALLERY: two MLA sublayers per layer
        L = 2 * L; mix = 'G' * L; note.append('each of the %d layers holds two MLA sublayers (transformers modeling_longcat_flash.py)' % (L // 2))
    elif mt == 'xlstm':  # GALLERY: xLSTM 7B, mLSTM blocks only
        L = t.get('num_blocks') or L or 32; mix = 'L' * L
    elif t.get('global_attn_every_n') and t.get('sliding_window_size'):  # GALLERY: Grok 2.5
        n = t['global_attn_every_n']; mix = ''.join('G' if (i + 1) % n == 0 else 'S' for i in range(L))
    else:
        mix = 'G' * L
    if mla:
        mix = mix.replace('G', 'M')
    if (t.get('index_topk') or t.get('index_top_k')) and mt not in ('deepseek_v4', 'deepseek_v41_text'):
        mix = mix.replace('M', 'D').replace('G', 'D')
    if t.get('indexer_budget'):  # GALLERY: Qwen3.8-Flash-Next QSA on its full layers
        mix = mix.replace('G', 'D')
    if stem == 'MiniMaxAI__MiniMax-M3':  # three dense prefix layers then MiniMax Sparse Attention (model card, gallery)
        mix = 'G' * 3 + 'D' * (L - 3)
    if mt in ('deepseek_v4', 'deepseek_v41_text'):
        mix = 'D' * L
        if isinstance(t.get('compress_ratios'), list):  # GALLERY: compress ratio 0 = a sliding-window-only layer (V4-Flash layers 0 and 1)
            mix = ''.join('S' if r == 0 else 'D' for r in t['compress_ratios'][:L])
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
        elif t.get('moe_layers_enum'):  # GALLERY: Step 3.5 Flash
            ml = set(int(x) for x in str(t['moe_layers_enum']).split(',')); ffn = ''.join('e' if i in ml else 'd' for i in range(L))
        elif t.get('interleave_moe_layer_step') and E:
            s = t['interleave_moe_layer_step']; ffn = ''.join('e' if (i + 1) % s == 0 else 'd' for i in range(L))
        elif mt == 'longcat_flash' or 'LongcatFlashNgramForCausalLM' in (t.get('architectures') or []):  # GALLERY: shortcut MoE beside the first MLP of each pair
            ffn = 'ed' * (L // 2)
        elif E and (t.get('num_experts_per_tok') or t.get('num_experts_per_token') or t.get('moe_top_k') or t.get('experts_per_token')
                    or t.get('top_k_experts') or t.get('moe_topk')):  # GALLERY: Gemma 4's top_k_experts, LongCat's moe_topk
            k0 = t.get('first_k_dense_replace') or 0
            if not k0:  # GALLERY: other spellings of a dense prefix
                k0 = g(t, 'num_dense_layers', 'n_dense_first_layers', 'dense_mlp_idx', d=0) or 0
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
    nope_model = mt in ('jamba', 'granitemoehybrid')
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
        # GALLERY additions
        if isinstance(t.get('layer_rope_theta'), list) and t['layer_rope_theta'][i] == 0: p = 'N'
        if isinstance(t.get('partial_rotary_factors'), list) and t['partial_rotary_factors'][i] < 1: p = 'P'
        if isinstance(t.get('use_rope_layers'), list) and i < len(t['use_rope_layers']) and not t['use_rope_layers'][i]: p = 'N'
        if t.get('d_rel'): p = 'B'  # learned relative-position bias (Inkling)
        pos.append(p)
    pos = ''.join(pos)
    if mt == 'granitemoehybrid' and t.get('position_embedding_type') not in (None, 'none', 'nope'):
        pos = pos.replace('N', 'R')
    # ---- KV bytes per token, bf16 ---- (ph: the same arithmetic as text, for the page's Decode tab)
    b = 2
    if mla:
        per = {'M': (t['kv_lora_rank'] + rr) * b, 'D': (t['kv_lora_rank'] + rr) * b}
        ph = {'M': '(kv_lora_rank %d + qk_rope_head_dim %d) × 2 bytes' % (t['kv_lora_rank'], rr)}
        ph['D'] = ph['M']
        if 'S' in mix:  # GALLERY: MLA-style latents on sliding layers too (Motif 3)
            per['S'] = per['M']; ph['S'] = ph['M']
    else:
        pg = 2 * Hkv * dh * b
        pt = '2 (K and V) × %d KV heads × %d head_dim × 2 bytes' % (Hkv, dh)
        if mt == 'Motif':  # GALLERY: K is nope + rope (head_dim 192), V is v_head_dim
            pg = Hkv * (dh + t['v_head_dim']) * b
            pt = '%d KV heads × (%d key + %d value) × 2 bytes' % (Hkv, dh, t['v_head_dim'])
        per = {'G': pg, 'S': pg, 'D': pg, 'H': pg}
        ph = {'G': pt, 'S': pt, 'D': pt, 'H': pt}
        if t.get('attention_k_eq_v') and t.get('global_head_dim'):  # Gemma 4: one tensor for K and V on global layers
            per['G'] = t['num_global_key_value_heads'] * t['global_head_dim'] * b
            per['S'] = 2 * Hkv * dh * b
            ph['G'] = '%d global KV heads × %d global_head_dim × 2 bytes (K = V: one tensor)' % (t['num_global_key_value_heads'], t['global_head_dim'])
        if t.get('global_head_dim') and not t.get('attention_k_eq_v') and 'G' in mix:  # GALLERY: Gemma 4 E2B/E4B global layers
            per['G'] = 2 * Hkv * t['global_head_dim'] * b  # transformers gemma4 per_layer_config: head_dim = global_head_dim
            ph['G'] = '2 × %d KV heads × %d global_head_dim × 2 bytes' % (Hkv, t['global_head_dim'])
        if t.get('swa_num_key_value_heads'):  # GALLERY: MiMo, Inkling, Naive: sliding layers have their own KV heads and dims
            vk = t.get('v_head_dim') or dh
            sk = t.get('swa_head_dim') or dh
            svk = t.get('swa_v_head_dim') or t.get('swa_head_dim') or dh
            per['G'] = per['D'] = Hkv * (dh + vk) * b
            per['S'] = t['swa_num_key_value_heads'] * (sk + svk) * b
            ph['G'] = ph['D'] = '%d KV heads × (%d key + %d value) × 2 bytes' % (Hkv, dh, vk)
            ph['S'] = '%d sliding KV heads × (%d key + %d value) × 2 bytes' % (t['swa_num_key_value_heads'], sk, svk)
            note.append('sliding layers keep their own %d KV heads of %d + %d; global layers %d of %d + %d' % (t['swa_num_key_value_heads'], sk, svk, Hkv, dh, vk))
    if mt in GALLERY_KV_ONLY:
        per = {}; ph = {}
    # GALLERY: cross-layer KV sharing (Gemma 4 E2B, E4B): the last num_kv_shared_layers reuse an earlier layer's cache
    shared = t.get('num_kv_shared_layers') or 0
    own = [True] * L
    if shared:
        for i in range(L - shared, L):
            own[i] = False
        note.append('the last %d of %d layers reuse an earlier layer\'s keys and values (cross-layer KV sharing)' % (shared, L))
    # GALLERY: looped depth (Ouro, Nanbeige 4.2): each pass over the stack keeps its own cache
    passes = t.get('total_ut_steps') or t.get('num_loops') or 1
    if passes > 1:
        note.append('looped: %d passes over the same %d layers, each keeping its own cache' % (passes, L))
    kv = sum(per.get(c, 0) for c, o in zip(mix, own) if o) * passes or None
    W = g(t, 'sliding_window', 'sliding_window_size', 'attention_chunk_size') if 'S' in mix else None
    if mt == 'gemma2' and not W:
        W = 4096
    kvw = None
    if kv:
        tot = 0
        for c, o in zip(mix, own):
            if not o:
                continue
            if c == 'S' and W:
                tot += per[c] * min(T_CREDIT, W)
            else:
                tot += per.get(c, 0) * T_CREDIT
        kvw = round(tot * passes / T_CREDIT, 1)
    # GALLERY: DeepSeek V4 compressed caches, in the gallery's bf16 convention: one 512-number entry per r tokens on
    # each layer with compress ratio r > 0 (CSA r = 4, HCA r = 128); windows (128 tokens per layer) and indexer keys apart
    kvc = None
    if mt == 'deepseek_v4':
        cr = t['compress_ratios'][:L]
        kvc = dict(main=sum(t['head_dim'] * b / r for r in cr if r), idx=sum(t['index_head_dim'] * b / r for r in cr if r == 4),
                   csa=sum(1 for r in cr if r == 4), hca=sum(1 for r in cr if r == 128), win=sum(1 for r in cr if r == 0), W=t.get('sliding_window'))
    # GALLERY: trained-sparse indexer keys, a second growing cache (reported apart; the map counts main KV only)
    idx = None
    ihd = g(t, 'index_head_dim', 'indexer_head_dim')
    if ihd and 'D' in mix and mt not in GALLERY_KV_ONLY:
        idx = mix.count('D') * ihd * b
    # ---- experts ----
    k = g(t, 'num_experts_per_tok', 'num_experts_per_token', 'experts_per_token', 'moe_top_k', 'top_k_experts', 'moe_topk')
    sh = g(t, 'n_shared_experts', 'num_shared_experts')
    if sh is None and (t.get('shared_expert_intermediate_size') or t.get('moe_shared_expert_intermediate_size') or t.get('shared_intermediate_size')):
        sh = 1
    if mt.startswith('llama4'):
        sh = 1  # Llama 4 MoE layers add a shared expert (model card: 128 routed experts and a shared expert)
    if sh is None and t.get('share_expert_dim'):  # GALLERY: Step 3.5
        sh = 1
    if 'e' not in ffn:
        E = k = sh = None
    dff = g(t, 'intermediate_size', 'n_inner', 'ffn_hidden_size', 'hidden_dim')
    if mt == 'gpt2':
        dff = dff or 4 * D
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
    elif t.get('swa_rope_theta'):  # GALLERY: MiMo, Motif
        theta = '%g local, %g global' % (t['swa_rope_theta'], t['rope_theta'])
    elif isinstance(theta, list):  # GALLERY: per-layer bases
        nz = [x for x in theta if x]
        theta = '%g to %g per layer' % (min(nz), max(nz)) if nz else None
    if mt == 'gpt2' or 'R' not in pos and 'P' not in pos:
        theta = None
    scale = ''
    if isinstance(rs, dict) and (rs.get('rope_type') or rs.get('type')) and rs.get('factor'):
        scale = '%s x%g' % (rs.get('rope_type') or rs.get('type'), rs.get('factor') or 0)
        if rs.get('original_max_position_embeddings'):
            scale += ' from %d' % rs['original_max_position_embeddings']
    if not scale and t.get('rope_type') == 'original' and t.get('scaling_factor'):  # GALLERY: Grok 2.5
        scale = 'scaled x%g' % t['scaling_factor']
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
    return dict(L=L, D=D, H=H, Hkv=None if mla else Hkv, dh=dh, mix=mix, ffn=ffn, pos=pos, kv=kv, kvw=kvw, idx=idx,
                per=per, ph={c: ph[c] for c in per if c in mix}, W=W, E=E, k=k, sh=sh, dff=dff, dffe=dffe, theta=theta, scale=scale,
                dc=t.get('kv_lora_rank'), dr=rr or None, V=g(t, 'vocab_size'),
                ctxc=g(t, 'max_position_embeddings', 'n_positions', 'max_seq_len', 'model_max_length'),
                st=st, tied=bool(tied), mt=mt, passes=passes, shared=shared or None, kvc=kvc, note='; '.join(note))


# Every row whose computed figure differs from the gallery's: how the gallery's number reconstructs (checked by
# check_data.py: the arithmetic must equal the gallery's figure), and which reading the config and code support.
RECON = {
    'Xiaomi MiMo-V2-Flash 309B': dict(galbytes=48 * 4 * (192 + 192) * 2, galhow='48 layers × 4 KV heads × (192 + 192) × 2',
        why='The config gives sliding layers their own 8 KV heads and every layer 128-dimension values (swa_num_key_value_heads, v_head_dim, swa_v_head_dim): 9 global × 4 × (192 + 128) × 2 + 39 sliding × 8 × (192 + 128) × 2 = 222,720 bytes. The gallery\'s figure treats every layer as global with 192-dimension values (our reconstruction); MiMo-V2.5-Pro, configured the same way, matches.', kind='gallery'),
    'Xiaomi MiMo-V2.5 310B': dict(galbytes=48 * 4 * (192 + 192) * 2, galhow='48 layers × 4 KV heads × (192 + 192) × 2', why='As MiMo-V2-Flash: same config fields, same gap.', kind='gallery'),
    'LongCat-Flash-Lite 68.5B-A3B': dict(galbytes=56 * 576 * 2, galhow='56 MLA sublayers × (512 + 64) × 2',
        why='The config sets num_layers 14 and the released code (modeling_longcat_ngram.py) reuses transformers\' LongcatFlashDecoderLayer, which holds two MLA sublayers per layer (modeling_longcat_flash.py, the layer_idx * 2 + i line): 28 sublayers, 32,256 bytes. The gallery lists 28 logical layers and 56 sublayers; we could not find 28 layers in the config.', kind='gallery'),
    'Step 3.5 Flash 196B': dict(galbytes=48 * 8 * 128 * 4, galhow='48 layers × 8 KV heads × 128 × 4',
        why='Convention, not an error: layer_types has 48 entries, the 45 decoder layers plus 3 multi-token-prediction layers (num_nextn_predict_layers 3) that Step runs at inference. This page counts the 45 decoder layers (KV heads from num_attention_groups 8); with the 3 MTP layers the gallery\'s 192 KiB follows.', kind='conv'),
    'Gemma 4 E2B': dict(galbytes=35 * 1 * 256 * 4, galhow='35 layers × 1 KV head × 256 × 4',
        why='The gallery counts all 35 layers at the sliding-layer size. In transformers 5.20.1 the global layers use head_dim = global_head_dim 512 (configuration_gemma4.py per_layer_config) and the last num_kv_shared_layers = 20 layers reuse earlier layers\' keys and values without storing their own (modeling_gemma4.py, is_kv_shared_layer): 12 sliding × 1,024 + 3 global × 2,048 = 18,432 bytes. The gallery\'s own KV notes describe this sharing but its figure does not apply it.', kind='gallery'),
    'Gemma 4 E4B': dict(galbytes=42 * 2 * 256 * 4, galhow='42 layers × 2 KV heads × 256 × 4',
        why='As Gemma 4 E2B: 18 of 42 layers share KV and global layers have 512-dimension heads, so 20 sliding × 2,048 + 4 global × 4,096 = 57,344 bytes.', kind='gallery'),
}


def kib(s):
    m = re.match(r'([\d.]+)\s*(KiB|MiB|B)\b', str(s or ''))
    return float(m.group(1)) * {'KiB': 1024, 'MiB': 2 ** 20, 'B': 1}[m.group(2)] if m else None


def stem_of(repo):
    return repo.replace('/', '__')


rows, rep = [], []
items = [(k, v, MIR.get(k) or (v.get('config') or {}).get('repo')) for k, v in G.items()] + [(k, v, v['repo']) for k, v in EXTRA.items()]
for name, meta, repo in sorted(items, key=lambda x: (str(x[1].get('date')), x[0])):
    gal = kib(meta.get('kv_cache_per_token_bf16'))
    r = dict(n=name, co=meta.get('company'), dt=str(meta.get('date')), sc=meta.get('scale'), dec=meta.get('decoder_type'),
             att=meta.get('attention'), mixg=meta.get('layer_mix'), cx=meta.get('context_tokens'), lic=meta.get('license_name'),
             gal=gal, galtxt=meta.get('kv_cache_per_token_bf16'), tr=(meta.get('tech_report') or {}).get('url'),
             x=name in EXTRA, xn=meta.get('note'), aa=meta.get('aa_intelligence_index'), hl=meta.get('highlight'))
    if name in NOCFG or not repo or not os.path.exists(os.path.join(CFG, stem_of(repo) + '.json')):
        r.update(status='nocfg', why=NOCFG.get(name, 'no config.json fetched'))
        rep.append('NOCFG    %-36s gallery %-10s %s' % (name, meta.get('kv_cache_per_token_bf16'), r['why']))
        rows.append(r)
        continue
    stem = stem_of(repo)
    raw, nest = load(stem)
    t = Track(raw)
    c = derive(t, stem, name)
    r.update(c)
    r['repo'] = repo
    r['nest'] = nest
    r['cfg'] = 'https://huggingface.co/%s/blob/main/%s' % (repo, 'params.json' if 'Mistral-Large-3' in repo else 'config.json')
    used = [k for k in t.used if k in raw]
    r['fields'] = {k: raw[k] for k in used}
    if c['mt'] in GALLERY_KV_ONLY:
        r['status'] = 'galkv'
        r['kvnote'] = 'compressed caches (CSA/HCA): the per-layer formula does not rebuild them; the gallery\'s figure is shown'
    elif gal is None:
        r['status'] = 'extra'
    else:
        calc = c['kv'] or 0
        if abs(calc - gal) <= max(0.006 * gal, 60):
            r['status'] = 'match'
        elif c['idx'] and abs(calc + c['idx'] - gal) <= max(0.006 * gal, 60):
            r['status'] = 'match'; r['galidx'] = True  # the gallery's figure includes the indexer keys
        else:
            r['status'] = 'differs'
            if name in RECON:
                r.update(RECON[name])
    rep.append('%-8s %-36s calc %9s KiB  idx %7s  gallery %-12s kvw %9s  mix %s ffn %s pos %s' % (
        r['status'], name, '%.2f' % (c['kv'] / 1024) if c['kv'] else '-', '%.2f' % (c['idx'] / 1024) if c['idx'] else '-',
        meta.get('kv_cache_per_token_bf16'), c['kvw'], c['mix'], c['ffn'], c['pos']))
    rows.append(r)

# the running example (not a gallery row): its baseline config through the same function
tt = Track(dict(TINY))
tc = derive(tt, 'tiny', 'Tiny GPT')
tiny = dict(n='Tiny GPT (this topic\'s running example)', co='trained on this Mac', dt='2026-10-18', sc='5.8M parameters', dec='Dense',
            att='MHA, learned positions', status='tiny', x=True, fields={k: TINY[k] for k in tt.used if k in TINY}, **tc)
rows.append(tiny)

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(rows, open(os.path.join(HERE, 'out', 'gallery.json'), 'w'), indent=1, ensure_ascii=False)
open(os.path.join(HERE, 'out', 'report.txt'), 'w').write('\n'.join(rep) + '\n')
cnt = {}
for r in rows:
    cnt[r['status']] = cnt.get(r['status'], 0) + 1
print('\n'.join(x for x in rep if not x.startswith('match')))
print('rows', len(rows), cnt)


# ---- parsed headline sizes (the gallery's scale line, a third-party summary of each model card) ----
def billions(s):
    m = re.match(r'\s*~?([\d.]+)\s*([TBM])', s or '')
    return float(m.group(1)) * {'T': 1000, 'B': 1, 'M': 0.001}[m.group(2)] if m else None


for r in rows:
    sc = r.get('sc') or ''
    m = re.search(r'([\d.]+\s*[TBM])\s*(?:total|core|backbone),\s*~?([\d.]+\s*[TBM])', sc)
    if m:
        r['tot'], r['act'] = billions(m.group(1)), billions(m.group(2))
    elif re.search(r'active prefill', sc):  # DeepSeek V4.1-Flash: two active counts; the decode one is kept
        m2 = re.search(r'([\d.]+B) backbone.*?([\d.]+B) active decode', sc)
        r['tot'], r['act'] = billions(m2.group(1)), billions(m2.group(2))
    elif billions(sc) is not None:
        r['tot'] = r['act'] = billions(sc)
    if 'e' in (r.get('ffn') or '') and 'active' not in sc:
        r.pop('act', None)  # an MoE whose gallery line states no active count
    # QK-norm: the config flag where one exists, else the gallery's attention text (labelled on the page)
    f = r.get('fields') or {}
    txt = ' '.join(str(r.get(k) or '') for k in ('att', 'hl'))
    r['qk'] = 'gallery' if re.search(r'QK[- ]?Norm|Q/K L2 norm|qk-norm', txt, re.I) else None

# ---- census over the gallery's rows rebuilt from a config (extras and the tiny GPT left out) ----
def census_of(sel):
    n = len(sel)
    pick = lambda f: sum(1 for r in sel if f(r))
    moe = [r for r in sel if 'e' in r['ffn']]
    return dict(
        n=n,
        moe=pick(lambda r: 'e' in r['ffn']),
        mla=pick(lambda r: bool(r.get('dc')) and r.get('mt') != 'Motif'),
        sparse=pick(lambda r: 'D' in r['mix']),
        win=pick(lambda r: 'S' in r['mix']),
        hyb=pick(lambda r: 'L' in r['mix'] or 'H' in r['mix']),
        mha=pick(lambda r: not r.get('dc') and r.get('Hkv') == r.get('H') and r.get('H') and set(r['mix']) <= set('GS')),
        prope=pick(lambda r: 'P' in r['pos'] and not r.get('dc')),
        nope=pick(lambda r: 'N' in r['pos']),
        rope=pick(lambda r: 'R' in r['pos'] or 'P' in r['pos']),
        qk=pick(lambda r: r.get('qk')),
        shared=sum(1 for r in moe if r.get('sh')),
        prefix=sum(1 for r in moe if r['ffn'][0] == 'd'),
        loops=pick(lambda r: (r.get('passes') or 1) > 1),
        kvshare=pick(lambda r: r.get('shared')),
    )


base = [r for r in rows if r.get('mix') and not r.get('x')]
by = {'2024': [r for r in base if r['dt'] < '2025'], '2025': [r for r in base if '2025' <= r['dt'] < '2026'],
      '2026': [r for r in base if r['dt'] >= '2026'], 'all': base}
census = {k: census_of(v) for k, v in by.items()}
for k, v in by.items():
    ks = sorted(r['kv'] for r in v if r.get('kv'))
    kw = sorted(r['kvw'] for r in v if r.get('kvw'))
    census[k]['kv_median'] = ks[len(ks) // 2] if ks else None
    census[k]['kvw_median'] = kw[len(kw) // 2] if kw else None
    census[k]['n_kv'] = len(ks)
st = {s: sum(1 for r in rows if r['status'] == s) for s in ('match', 'differs', 'nocfg', 'galkv', 'extra')}
census['status'] = st
census['n_gallery'] = len(G)
census['n_cfg'] = sum(1 for r in rows if r.get('mix') and not r.get('x'))
census['n_rows'] = len(rows)
json.dump(census, open(os.path.join(HERE, 'out', 'census.json'), 'w'), indent=1)
json.dump(rows, open(os.path.join(HERE, 'out', 'gallery.json'), 'w'), indent=1, ensure_ascii=False)

KEEP = ['n', 'co', 'dt', 'sc', 'dec', 'att', 'mixg', 'cx', 'lic', 'gal', 'galtxt', 'tr', 'status', 'repo', 'cfg', 'nest', 'L', 'D', 'H',
        'Hkv', 'dh', 'mix', 'ffn', 'pos', 'kv', 'kvw', 'idx', 'per', 'ph', 'W', 'E', 'k', 'sh', 'dffe', 'theta', 'scale', 'dc', 'dr', 'V', 'ctxc',
        'st', 'passes', 'shared', 'kvc', 'note', 'x', 'xn', 'galhow', 'galbytes', 'why', 'kind', 'galidx', 'tot', 'act', 'qk', 'mt', 'fields', 'kvnote']
page = [{k: r.get(k) for k in KEEP if r.get(k) not in (None, '', [], {}, False)} for r in rows]
js = ('// written by src/gen_data.py from src/inputs (models.yml at rasbt/llm-architecture-gallery %s and config.json files); do not edit by hand.\n'
      'window.AGD=' % GALLERY_COMMIT[:7]) + json.dumps(dict(rows=page, census=census, commit=GALLERY_COMMIT[:7], read='2026-10-18'), separators=(',', ':'), ensure_ascii=False) + ';\n'
open(os.path.join(HERE, 'parts', '22_js_ag_0data.js'), 'w').write(js)
print('census 2026', census['2026'])
print('census 2025', census['2025'])
print('page data bytes', len(js.encode()))
