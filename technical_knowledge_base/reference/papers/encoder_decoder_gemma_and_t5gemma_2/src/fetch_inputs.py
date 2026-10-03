"""Fetch the small public inputs recompute.py needs into inputs/ (no gated files are needed).

  python3 fetch_inputs.py
- inputs/configs.json: the decoder-only configs (Gemma 2 2B/9B, Gemma 3 270M/1B/4B) from the ungated
  unsloth mirrors of Google's config.json files (identical copies; the google/ repos need a login).
- inputs/hf_params.json: the parameter count Hugging Face reports for every released checkpoint (its
  safetensors metadata, from the public model API), plus release dates and licences.
"""
import json, os, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
get = lambda u: json.load(urllib.request.urlopen(u, timeout=60))
KEYS = ['hidden_size', 'intermediate_size', 'num_hidden_layers', 'num_attention_heads', 'num_key_value_heads', 'head_dim',
        'vocab_size', 'max_position_embeddings', 'sliding_window', 'rope_theta', 'rope_local_base_freq', 'rope_scaling', 'query_pre_attn_scalar']
cfg = {}
for name, repo in [('gemma-2-2b', 'unsloth/gemma-2-2b'), ('gemma-2-9b', 'unsloth/gemma-2-9b'), ('gemma-3-270m', 'unsloth/gemma-3-270m'),
                   ('gemma-3-1b', 'unsloth/gemma-3-1b-pt'), ('gemma-3-4b', 'unsloth/gemma-3-4b-pt')]:
    url = 'https://huggingface.co/%s/resolve/main/config.json' % repo
    d = get(url); t = d.get('text_config', d)
    cfg[name] = {k: t.get(k) for k in KEYS}; cfg[name]['source'] = url
    if 'layer_types' in t: cfg[name]['layer_types_global'] = sum(1 for x in t['layer_types'] if x == 'full_attention')
    if 'vision_config' in d: cfg[name]['mm_tokens_per_image'] = d.get('mm_tokens_per_image')
json.dump(cfg, open(os.path.join(HERE, 'inputs', 'configs.json'), 'w'), indent=1)
hf = {}
for m in ['google/gemma-2-2b', 'google/gemma-2-9b', 'google/gemma-3-270m', 'google/gemma-3-1b-pt', 'google/gemma-3-4b-pt',
          'google/t5gemma-s-s-prefixlm', 'google/t5gemma-b-b-prefixlm', 'google/t5gemma-l-l-prefixlm', 'google/t5gemma-ml-ml-prefixlm',
          'google/t5gemma-xl-xl-prefixlm', 'google/t5gemma-2b-2b-prefixlm', 'google/t5gemma-9b-2b-prefixlm', 'google/t5gemma-9b-9b-prefixlm',
          'google/t5gemma-2-270m-270m', 'google/t5gemma-2-1b-1b', 'google/t5gemma-2-4b-4b', 'google/embeddinggemma-300m']:
    d = get('https://huggingface.co/api/models/%s?expand[]=safetensors&expand[]=createdAt&expand[]=cardData' % m)
    hf[m] = {'safetensors': d.get('safetensors'), 'created': d.get('createdAt'), 'license': (d.get('cardData') or {}).get('license')}
hf['_source'] = 'https://huggingface.co/api/models/<repo>?expand[]=safetensors (fetched by fetch_inputs.py)'
hf['_fetched'] = __import__('datetime').date.today().isoformat()
json.dump(hf, open(os.path.join(HERE, 'inputs', 'hf_params.json'), 'w'), indent=1)
print('ok', list(cfg), len(hf))
