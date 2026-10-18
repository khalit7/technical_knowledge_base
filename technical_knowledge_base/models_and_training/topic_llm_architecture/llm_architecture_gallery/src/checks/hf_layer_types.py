#!/usr/bin/env python3
"""Independent check of the mixer strips: let transformers parse each config and compare its own per-layer types.

For every gallery config whose model_type has a config class in transformers 5.20.1, build that class from the saved
config.json (no weights, no network) and read the per-layer list transformers itself derives (layer_types, or
layers_block_type for the Mamba hybrids). Map it to this page's codes and compare with src/out/gallery.json.
Run with the topic's venv (transformers 5.20.1), CPU only: python3 src/checks/hf_layer_types.py
Writes src/out/hf_layer_types.json and prints one line per model.
"""
import json, os, sys, warnings
warnings.filterwarnings('ignore')
os.environ.setdefault('TRANSFORMERS_OFFLINE', '1')
os.environ.setdefault('HF_HUB_OFFLINE', '1')
import transformers
from transformers.models.auto.configuration_auto import CONFIG_MAPPING

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
rows = json.load(open(os.path.join(SRC, 'out', 'gallery.json')))
CODE = {'full_attention': 'A', 'attention': 'A', 'global': 'A', 'sliding_attention': 'S', 'chunked_attention': 'S',
        'linear_attention': 'L', 'mamba': 'L', 'conv': 'L', 'short_conv': 'L', 'deepseek_sparse_attention': 'A',
        'hybrid': 'A', 'hybrid_sliding': 'S', 'moe': 'F', 'mlp': 'F', 'indexed_attention': 'A',
        'compressed_sparse_attention': 'A', 'heavily_compressed_attention': 'A'}
page_code = lambda m: ''.join({'G': 'A', 'M': 'A', 'D': 'A', 'H': 'A'}.get(c, c) for c in m)  # attention kinds merged
out, n_ok, n_bad, n_skip = [], 0, 0, 0
for r in rows:
    if not r.get('repo') or not r.get('mix'):
        continue
    raw = json.load(open(os.path.join(SRC, 'inputs', 'configs', r['repo'].replace('/', '__') + '.json')))
    t = raw.get('text_config') if isinstance(raw.get('text_config'), dict) else raw
    mt = t.get('model_type') or raw.get('model_type')
    if mt not in CONFIG_MAPPING:
        out.append(dict(n=r['n'], mt=mt, status='no transformers class')); n_skip += 1; continue
    try:
        cfg = CONFIG_MAPPING[mt](**{k: v for k, v in t.items() if k not in ('model_type', 'transformers_version')})
    except Exception as e:
        out.append(dict(n=r['n'], mt=mt, status='class rejects config: %s' % str(e)[:120])); n_skip += 1; continue
    lt = getattr(cfg, 'layer_types', None) or getattr(cfg, 'layers_block_type', None)
    if not lt:
        out.append(dict(n=r['n'], mt=mt, status='no per-layer list (uniform stack)', uniform=len(set(r['mix'])) == 1)); n_skip += 1; continue
    hf = ''.join(CODE.get(x, '?') for x in lt)
    mine = page_code(r['mix'])
    if mt == 'nemotron_h':  # transformers lists FFN blocks as layers too; so does the page (F)
        pass
    hf = hf[:len(mine)]
    ok = hf == mine
    n_ok += ok; n_bad += (not ok)
    out.append(dict(n=r['n'], mt=mt, status='agree' if ok else 'DIFFER', hf=hf, page=mine))
json.dump(dict(transformers=transformers.__version__, rows=out), open(os.path.join(SRC, 'out', 'hf_layer_types.json'), 'w'), indent=1)
for o in out:
    print('%-8s %-34s %-22s %s' % (o['status'][:8], o['n'][:34], o['mt'], '' if o['status'] == 'agree' else (o.get('hf', '') + ' | ' + o.get('page', ''))[:120] or o['status']))
print('transformers', transformers.__version__, 'agree', n_ok, 'differ', n_bad, 'not checkable', n_skip)
