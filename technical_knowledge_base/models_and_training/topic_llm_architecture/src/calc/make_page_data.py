"""Write parts/33_js_cc_0data.js (window.CCD) from src/data/configs/ (configs and manifest), inputs/hf_param_counts.json
and out/validation.json. Run validate.py first. Configs are pruned to the keys calc.py reads.
For each published headline, records which accounting (main, + MTP, + vision; active with or without the embedding
and head) rounds to the published figure at the precision it was printed with."""
import json, os, re, sys
from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import calc  # noqa: E402
CFG = os.path.join(HERE, '..', 'data', 'configs')
OUT = os.path.join(HERE, '..', 'parts', '33_js_cc_0data.js')

LABEL = {
    'gpt2': 'GPT-2 (124M)', 'gpt2-xl': 'GPT-2 XL (1.5B)', 'llama-1-7b': 'LLaMA 7B', 'llama-2-7b': 'Llama 2 7B',
    'llama-3-8b': 'Llama 3 8B', 'llama-3.1-8b': 'Llama 3.1 8B', 'llama-3.1-70b': 'Llama 3.1 70B',
    'llama-3.1-405b': 'Llama 3.1 405B', 'llama-4-scout': 'Llama 4 Scout', 'llama-4-maverick': 'Llama 4 Maverick',
    'mistral-7b-v0.1': 'Mistral 7B v0.1', 'mixtral-8x7b': 'Mixtral 8x7B', 'mistral-small-3.1-24b': 'Mistral Small 3.1 24B',
    'qwen2-7b': 'Qwen2 7B', 'qwen2.5-7b': 'Qwen2.5 7B', 'qwen3-0.6b': 'Qwen3 0.6B', 'qwen3-8b': 'Qwen3 8B',
    'qwen3-32b': 'Qwen3 32B', 'qwen3-30b-a3b': 'Qwen3 30B-A3B', 'qwen3-235b-a22b': 'Qwen3 235B-A22B',
    'qwen3-next-80b-a3b': 'Qwen3-Next 80B-A3B', 'deepseek-v2': 'DeepSeek-V2', 'deepseek-v3': 'DeepSeek-V3',
    'deepseek-v3.2-exp': 'DeepSeek-V3.2-Exp', 'deepseek-v3.2': 'DeepSeek-V3.2', 'kimi-k2': 'Kimi K2',
    'gpt-oss-20b': 'gpt-oss-20b', 'gpt-oss-120b': 'gpt-oss-120b', 'gemma-7b': 'Gemma 7B', 'gemma-2-9b': 'Gemma 2 9B',
    'gemma-3-1b': 'Gemma 3 1B', 'gemma-3-27b': 'Gemma 3 27B', 'olmo-2-7b': 'OLMo 2 7B', 'olmo-3-7b': 'Olmo 3 7B',
    'phi-4': 'Phi-4', 'smollm2-135m': 'SmolLM2 135M', 'glm-4.5': 'GLM-4.5', 'glm-4.5-air': 'GLM-4.5-Air',
    'minimax-m2': 'MiniMax-M2', 'nemotron-h-8b': 'Nemotron-H 8B', 'granite-4.0-h-small': 'Granite 4.0-H Small',
    'falcon-h1-7b': 'Falcon-H1 7B', 'jamba-v0.1': 'Jamba v0.1', 'mamba-2.8b': 'Mamba 2.8B', 'mamba2-2.7b': 'Mamba-2 2.7B',
}
GROUP = [('Dense transformers', ['smollm2-135m', 'qwen3-0.6b', 'gemma-3-1b', 'mistral-7b-v0.1', 'qwen2.5-7b',
                                 'olmo-3-7b', 'llama-3.1-8b', 'qwen3-8b', 'gemma-2-9b', 'phi-4', 'mistral-small-3.1-24b',
                                 'gemma-3-27b', 'qwen3-32b', 'llama-3.1-70b', 'llama-3.1-405b']),
         ('Mixture of experts', ['mixtral-8x7b', 'gpt-oss-20b', 'gpt-oss-120b', 'qwen3-30b-a3b', 'qwen3-235b-a22b',
                                 'llama-4-scout', 'llama-4-maverick', 'glm-4.5-air', 'glm-4.5', 'minimax-m2']),
         ('MLA (DeepSeek family)', ['deepseek-v2', 'deepseek-v3', 'deepseek-v3.2-exp', 'deepseek-v3.2', 'kimi-k2']),
         ('Hybrids and state-space models', ['nemotron-h-8b', 'falcon-h1-7b', 'granite-4.0-h-small', 'jamba-v0.1',
                                             'qwen3-next-80b-a3b', 'mamba-2.8b', 'mamba2-2.7b']),
         ('History', ['gpt2', 'gpt2-xl', 'llama-1-7b', 'llama-2-7b', 'llama-3-8b', 'qwen2-7b', 'gemma-7b', 'olmo-2-7b'])]

KEEP_DROP = {'initializer_range', 'bos_token_id', 'eos_token_id', 'pad_token_id', 'transformers_version', 'use_cache',
             'attention_dropout', 'auto_map', 'output_router_logits', 'architectures', 'time_step_limit',
             'task_specific_params', 'summary_activation', 'summary_first_dropout', 'summary_proj_to_labels',
             'summary_type', 'summary_use_proj', 'unsloth_fixed', 'unsloth_version', 'boi_token_index',
             'eoi_token_index', 'image_token_index', 'tokenizer_class', 'router_jitter_noise', 'for_llm_compressor',
             'embd_pdrop', 'resid_pdrop', 'attn_pdrop', 'hidden_dropout', 'num_logits_to_keep', 'mm_tokens_per_image',
             '_name_or_path', 'pretraining_tp', 'ep_size', 'dtype', 'torch_dtype', 'attn_type_list', 'ssm_multipliers',
             'mlp_multipliers'}


def prune(c):
    out = {}
    for k, v in c.items():
        if k in KEEP_DROP: continue
        if k == 'vision_config': out[k] = {'model_type': v.get('model_type')}; continue
        if k == 'quantization_config': out[k] = {kk: v[kk] for kk in ('quant_method', 'fmt', 'weight_block_size') if kk in v}; continue
        if isinstance(v, dict): out[k] = prune(v); continue
        out[k] = v
    return out


def label_parts(lbl):
    """'109B / 17B active' -> (total_str, active_str)."""
    p = [x.strip() for x in lbl.split('/')]
    return p[0], (p[1].replace('active', '').strip() if len(p) > 1 else None)


def matches(value, printed):
    """Does value round to the printed figure ('3.3B', '1T', '124M', '0.6B') at its printed precision?"""
    m = re.match(r'^([\d.]+)\s*([KMBT])$', printed)
    if not m: return False
    num, unit = m.group(1), m.group(2)
    scale = {'K': 10**3, 'M': 10**6, 'B': 10**9, 'T': 10**12}[unit]
    q = Decimal(1).scaleb(-len(num.split('.')[1])) if '.' in num else Decimal(1)
    x = Decimal(value) / scale
    if x.quantize(q, rounding=ROUND_HALF_UP) == Decimal(num): return 'rounded'
    if x.quantize(q, rounding=ROUND_DOWN) == Decimal(num): return 'truncated'
    return False


def main():
    man = {m['key']: m for m in json.load(open(os.path.join(CFG, 'manifest.json')))['models']}
    hub = json.load(open(os.path.join(HERE, 'inputs', 'hf_param_counts.json')))
    val = {r['key']: r for r in json.load(open(os.path.join(HERE, 'out', 'validation.json')))}
    models = []; seen = set()
    for gname, keys in GROUP:
        for k in keys:
            seen.add(k)
            cfg = json.load(open(os.path.join(CFG, k + '.json')))
            mm = man.get(k, {}); v = val[k]; h = hub.get(k) or {}
            pub = None
            if mm.get('published_label'):
                ts, as_ = label_parts(mm['published_label'])
                tot = {'main': v['calc_total']}
                if v['mtp']: tot['main+MTP'] = v['calc_total'] + v['mtp']
                if v['vision']: tot['main+vision'] = v['calc_total'] + v['vision']
                act = {'all': v['active'], 'no input embedding': v['active_no_emb'],
                       'no embedding or head': v['active_no_emb_head']}
                pub = {'label': mm['published_label'], 'src': mm.get('published_source'), 'note': mm.get('note'),
                       'tot_match': [[n, matches(x, ts)] for n, x in tot.items() if matches(x, ts)],
                       'act_match': [[n, matches(x, as_)] for n, x in act.items() if matches(x, as_)] if as_ else None}
            models.append({'key': k, 'label': LABEL.get(k, k), 'group': gname, 'cfg': prune(cfg),
                           'license': mm.get('license'), 'kind': mm.get('kind'), 'repo': mm.get('official_repo'),
                           'cfg_from': mm.get('config_fetched_from'), 'rev': mm.get('revision'),
                           'pub': pub, 'hub': {'total': h.get('total'), 'dtype': h.get('by_dtype'), 'sha': h.get('sha')},
                           'val': {x: v.get(x) for x in ('mtp', 'vision', 'extra', 'extra_kind', 'extra_why', 'residual')}})
    missing = set(val) - seen
    if missing: print('NOT IN GROUPS', missing)
    data = {'date': '2026-10-18', 'models': models}
    js = '// written by src/calc/make_page_data.py; do not edit by hand\nwindow.CCD=' + \
         json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n'
    assert 'Infinity' not in js and '\u2014' not in js
    open(OUT, 'w').write(js)
    print(len(models), 'models,', len(js), 'bytes')
    for m in models:
        if m['pub']: print('%-22s %-22s tot %-28s act %s' % (m['key'], m['pub']['label'], m['pub']['tot_match'], m['pub']['act_match']))


if __name__ == '__main__':
    main()
