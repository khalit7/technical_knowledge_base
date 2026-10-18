"""Check this page's RoPE ports (recompute.py, mirrored line by line in the page's JavaScript) against the real functions of
transformers 5.20.1 (modeling_rope_utils.ROPE_INIT_FUNCTIONS) on every preset, and Gemma 4's proportional RoPE on its own config.
CPU, a second. Writes out/hf_check.json. Run: <venv>/bin/python -I hf_check.py"""
import json, math, os, sys
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(H))
import recompute as RC  # noqa: E402  (stdlib only; rewrites inputs/recompute.json, harmless)
import torch  # noqa: E402
from transformers import LlamaConfig  # noqa: E402
from transformers.modeling_rope_utils import ROPE_INIT_FUNCTIONS  # noqa: E402
import transformers  # noqa: E402

out = {'transformers': transformers.__version__, 'presets': {}}
for k, p in RC.presets.items():
    b, d, L, s = p['base'], p['dim'], p['L'], p['s']
    mine, _, _ = RC.all_methods(p)
    def hf(rp):
        c = LlamaConfig(hidden_size=d * 4, num_attention_heads=4, head_dim=d, max_position_embeddings=int(L * s),
                        rope_parameters={'rope_theta': b, **rp})
        fn = ROPE_INIT_FUNCTIONS[rp['rope_type']] if rp['rope_type'] != 'default' else None
        if fn is None:
            inv = 1.0 / (b ** (torch.arange(0, d, 2, dtype=torch.int64).float() / d)); return inv.tolist(), 1.0
        inv, att = fn(c, 'cpu', seq_len=int(L * s)) if rp['rope_type'] == 'longrope' else fn(c, 'cpu'); return inv.tolist(), float(att)
    res = {}
    cases = {'plain': {'rope_type': 'default'}, 'pi': {'rope_type': 'linear', 'factor': s},
             'yarn': {'rope_type': 'yarn', 'factor': s, 'original_max_position_embeddings': L, 'beta_fast': p.get('beta_fast', 32), 'beta_slow': p.get('beta_slow', 1),
                      **({'truncate': p['truncate']} if 'truncate' in p else {})},
             'llama3': {'rope_type': 'llama3', 'factor': s, 'original_max_position_embeddings': L, 'low_freq_factor': p.get('low', 1.0), 'high_freq_factor': p.get('high', 4.0)}}
    if 'long' in p:
        cases['longrope'] = {'rope_type': 'longrope', 'original_max_position_embeddings': L, 'long_factor': p['long'], 'short_factor': p['short'], 'factor': s}
    for m, rp in cases.items():
        if m == 'llama3' and p.get('high', 4.0) == p.get('low', 1.0):
            res[m] = 'skipped: low == high divides by zero in both'; continue
        inv, att = hf(rp)
        ref = mine[m]
        err = max(abs(a - c) / c for a, c in zip(inv, ref))
        res[m] = {'max_rel_err': float('%.3g' % err), 'attention_factor': round(att, 6)}
    out['presets'][k] = res
    print(k, res)
json.dump(out, open(os.path.join(H, 'out/hf_check.json'), 'w'), indent=1)
