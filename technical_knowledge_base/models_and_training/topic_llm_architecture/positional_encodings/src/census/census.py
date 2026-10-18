"""Position census: what carries position in every config.json the topic holds, read field by field.
Inputs (all committed): the root's src/data/configs (45, manifest with URL and revision, fetched 2026-10-18), the root's
src/map/inputs/configs (49, file name owner__repo, fetched 2026-10-18) and this page's src/inputs (fetched 2026-10-03).
Each model is read once (the newest copy wins). Whether a model applies RoPE at all is decided from its transformers 5.20.1
modeling file where the config cannot say (Nemotron-H and Jamba define apply_rotary_pos_emb but never call it).
Writes out/census.json. Run: python3 census.py (stdlib only)."""
import json, math, os, glob, re

H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(H, '../../../src'))
MINE = os.path.normpath(os.path.join(H, '../inputs'))

files = {}
man = json.load(open(os.path.join(ROOT, 'data/configs/manifest.json')))
for m in man['models']:
    files[m['official_repo'].lower()] = dict(path=os.path.join(ROOT, 'data/configs', m['file']), repo=m['official_repo'],
                                             url=m['config_url'], rev=m.get('revision'), fetched=m.get('fetched'))
for f in sorted(glob.glob(os.path.join(ROOT, 'map/inputs/configs/*.json'))):
    repo = os.path.basename(f)[:-5].replace('__', '/')
    key = repo.lower()
    files.setdefault(key, dict(path=f, repo=repo, url='https://huggingface.co/%s/blob/main/config.json' % repo, rev=None, fetched='2026-10-18'))
OLD = {'mpt7b_config.json': 'mosaicml/mpt-7b', 'bloom_config.json': 'bigscience/bloom', 'command_a_config.json': 'CohereLabs/c4ai-command-a-03-2025',
       'phi3_mini_128k_config.json': 'microsoft/Phi-3-mini-128k-instruct', 'phi2_config.json': 'microsoft/phi-2', 'gptneox20b_config.json': 'EleutherAI/gpt-neox-20b',
       'qwen2vl_7b_config.json': 'Qwen/Qwen2-VL-7B-Instruct', 'bert_base_config.json': 'google-bert/bert-base-uncased', 'llama4_scout_unsloth_config.json': 'meta-llama/Llama-4-Scout-17B-16E-Instruct'}
for f, repo in OLD.items():
    files.setdefault(repo.lower(), dict(path=os.path.join(MINE, f), repo=repo, url='https://huggingface.co/%s/blob/main/config.json' % repo, rev=None, fetched='2026-10-03'))

# models whose transformers 5.20.1 code never applies RoPE in attention although the config may carry rope fields
NO_ROPE_CODE = {'nemotron_h': 'modeling_nemotron_h.py defines apply_rotary_pos_emb but no attention layer calls it',
                'jamba': 'modeling_jamba.py defines apply_rotary_pos_emb but no attention layer calls it'}


def text(d):
    for k in ('text_config', 'language_config', 'llm_config'):
        if isinstance(d.get(k), dict) and d[k].get('num_hidden_layers', d[k].get('hidden_size')):
            return {**d[k], 'model_type': d[k].get('model_type') or d.get('model_type')}
    return d


def row(info):
    d0 = json.load(open(info['path']))
    d = text(d0)
    mt = d.get('model_type') or d0.get('model_type') or ('mistral_large3' if 'yarn' in d else None)
    nl = d.get('num_hidden_layers') or d.get('n_layer') or d.get('n_layers') or d.get('num_layers')
    nh = d.get('num_attention_heads') or d.get('n_head') or d.get('n_heads')
    hd = d.get('head_dim') or ((d.get('hidden_size') or d.get('n_embd') or d.get('d_model') or d.get('dim') or 0) // nh if nh else None)
    rp = d.get('rope_parameters') if isinstance(d.get('rope_parameters'), dict) else None
    rs = d.get('rope_scaling') if isinstance(d.get('rope_scaling'), dict) else None
    r = dict(repo=info['repo'], url=info['url'], rev=info['rev'], fetched=info['fetched'], model_type=mt, layers=nl, head_dim=hd,
             max_pos=d.get('max_position_embeddings') or d.get('n_positions') or d.get('max_seq_len'), notes=[])
    theta = d.get('rope_theta') or d.get('rotary_emb_base')
    scaling = rs
    partial = d.get('partial_rotary_factor') or d.get('rotary_pct')
    if rp:
        if 'rope_theta' in rp or 'rope_type' in rp:
            theta = rp.get('rope_theta', theta); partial = rp.get('partial_rotary_factor', partial)
            if rp.get('rope_type') not in (None, 'default'):
                scaling = rp
            if rp.get('mrope_section'):
                r['notes'].append('M-RoPE sections %s%s' % (rp['mrope_section'], ', interleaved' if rp.get('mrope_interleaved') else ''))
        else:  # nested per layer type (Gemma 4)
            r['per_layer'] = {k: {kk: v[kk] for kk in ('rope_type', 'rope_theta', 'partial_rotary_factor', 'factor') if kk in v} for k, v in rp.items()}
            g = rp.get('full_attention', {})
            theta, partial = g.get('rope_theta'), g.get('partial_rotary_factor')
            if g.get('rope_type') not in (None, 'default'):
                scaling = g
    if 'yarn' in d and isinstance(d['yarn'], dict):  # Mistral Large 3 native params.json layout
        y = d['yarn']; scaling = dict(rope_type='yarn', factor=y['factor'], original_max_position_embeddings=y['original_max_position_embeddings'],
                                      beta_fast=y.get('beta'), beta_slow=y.get('alpha'), apply_scale=y.get('apply_scale'))
    if isinstance(d.get('llama_4_scaling'), dict):
        r['notes'].append('llama_4_scaling beta %s from %s (attention temperature by position)' % (d['llama_4_scaling']['beta'], d['llama_4_scaling']['original_max_position_embeddings']))
    rot = None
    pet = d.get('position_embedding_type')
    if d.get('alibi') or (d.get('attn_config') or {}).get('alibi') or mt == 'bloom':
        r['scheme'] = 'ALiBi'
    elif mt in ('gpt2', 'bert'):
        r['scheme'] = 'learned absolute'
    elif mt in NO_ROPE_CODE or pet == 'nope' or (mt in ('kimi_linear',) and d.get('mla_use_nope')):
        r['scheme'] = 'none (NoPE)'
        if mt in NO_ROPE_CODE:
            r['notes'].append(NO_ROPE_CODE[mt] + ('; config still says rope_theta %s' % theta if theta else ''))
        if pet == 'nope':
            r['notes'].append('position_embedding_type "nope"')
        if mt == 'kimi_linear':
            r['notes'].append('mla_use_nope true: the MLA layers carry no RoPE; the KDA (linear attention) layers order tokens by recurrence')
        theta = None
    elif theta or d.get('qk_rope_head_dim'):
        r['scheme'] = 'RoPE'
        if d.get('qk_rope_head_dim'):
            rot = d['qk_rope_head_dim']; r['notes'].append('decoupled RoPE key of %d dims (MLA)' % rot)
        elif d.get('rotary_dim'):
            rot = d['rotary_dim']
        elif partial:
            rot = int(hd * partial)
        else:
            rot = hd
    elif mt in ('mamba', 'mamba2') or 'ssm_cfg' in d or d.get('architectures', [''])[0].startswith('Mamba'):
        r['scheme'] = 'no attention (SSM)'
    elif mt in DEFAULT_ROPE:
        r['scheme'] = 'RoPE'; theta = 10000.0; rot = hd
        r['notes'].append('no rope_theta in the config: the transformers default 10,000 applies')
    else:
        r['scheme'] = 'unknown'
    if r.get('per_layer'):
        g = r['per_layer'].get('full_attention', {})
        if g.get('rope_type') == 'proportional':
            rot = int(hd if not d.get('global_head_dim') else d['global_head_dim'])
            r['notes'].append('global layers: "proportional" RoPE, %d of %d pairs rotate with exponents over the full %d dims (the slow pairs are zeroed, not respaced)'
                              % (int((g.get('partial_rotary_factor') or 1) * rot // 2), rot // 2, rot))
    r['theta'] = theta
    r['rot_dims'] = rot
    r['partial'] = partial if partial and partial != 1 else None
    if scaling:
        t = scaling.get('rope_type') or scaling.get('type')
        r['scaling'] = {k: v for k, v in dict(type=t, factor=scaling.get('factor'), orig=scaling.get('original_max_position_embeddings') or d.get('original_max_position_embeddings'),
                                                 beta_fast=scaling.get('beta_fast'), beta_slow=scaling.get('beta_slow'), low=scaling.get('low_freq_factor'),
                                                 high=scaling.get('high_freq_factor'), mscale=scaling.get('mscale'), mscale_all_dim=scaling.get('mscale_all_dim'),
                                                 truncate=scaling.get('truncate'), apply_scale=scaling.get('apply_scale')).items() if v is not None}
    # local layers with their own base
    if d.get('rope_local_base_freq'):
        r['local_theta'] = d['rope_local_base_freq']
    if r.get('per_layer') and 'sliding_attention' in r['per_layer']:
        r['local_theta'] = r['per_layer']['sliding_attention'].get('rope_theta')
    if d.get('compress_rope_theta'):
        r['notes'].append('compressed-attention layers use compress_rope_theta %s' % d['compress_rope_theta'])
    sw = d.get('sliding_window')
    if sw:
        r['window'] = sw
    if d.get('sliding_window_pattern') and mt == 'cohere2':
        r['nope_layers'] = 'every %d (the full-attention layers, %d of %d)' % (d['sliding_window_pattern'], nl // d['sliding_window_pattern'], nl)
    lt = d.get('layer_types')
    if isinstance(lt, list):
        r['layer_types'] = sorted(set(lt))
    if d.get('no_rope_layers'):
        z = d['no_rope_layers']; r['nope_layers'] = '%d of %d' % (sum(1 for x in z if x == 0), len(z))
    if d.get('no_rope_layer_interval'):
        r['nope_layers'] = 'every %d (%d of %d)' % (d['no_rope_layer_interval'], nl // d['no_rope_layer_interval'], nl)
    if r['scheme'] == 'RoPE' and theta and rot:
        L = (r.get('scaling') or {}).get('orig') or r['max_pos']
        inv = [theta ** (-2 * i / rot) for i in range(rot // 2)]
        r['pairs'] = rot // 2
        r['longest_wavelength'] = round(2 * math.pi / inv[-1])
        r['full_turn_pairs_at_orig'] = sum(1 for f in inv if L * f >= 2 * math.pi) if L else None
    return r


# the same checkpoint read twice (official repo in the root's data, mirror in the map's inputs): keep one
SKIP = {'unsloth/meta-llama-3.1-8b', 'unsloth/meta-llama-3.1-70b', 'unsloth/meta-llama-3.1-405b-instruct-bnb-4bit', 'unsloth/gemma-3-27b-it', 'unsloth/gemma-7b',
        'unsloth/llama-3-8b', 'unsloth/llama-4-maverick-17b-128e-instruct', 'allenai/olmo-2-1124-7b-instruct', 'moonshotai/kimi-k2-instruct', 'unsloth/gemma-2-27b'}
DEFAULT_ROPE = ('llama', 'mistral', 'mixtral', 'falcon', 'gemma', 'qwen2')
rows = []
for k, info in sorted(files.items()):
    if k in SKIP:
        continue
    try:
        rows.append(row(info))
    except Exception as e:
        rows.append(dict(repo=info['repo'], error=repr(e)))
json.dump(dict(what='position fields of every config the topic holds, read 2026-10-18 by census.py', rows=rows),
          open(os.path.join(H, 'out/census.json'), 'w'), indent=1)
for r in rows:
    print('%-48s %-15s %-18s theta=%-10s rot=%-4s L=%-8s sc=%s %s' % (r['repo'][:48], str(r.get('model_type'))[:15], r.get('scheme'), r.get('theta'), r.get('rot_dims'),
          r.get('max_pos'), json.dumps(r.get('scaling')) if r.get('scaling') else '', '; '.join(r.get('notes', [])) + (' ERR ' + r['error'] if 'error' in r else '')))
