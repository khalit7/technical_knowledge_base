"""Locate the position code the page quotes, by pattern, in transformers 5.20.1 (the topic's pinned version, installed in the
shared venv) and in the tiny GPT (root src/data/tiny_gpt.py), so every file:line on the page is checked.
Writes out/code_refs.json: for each excerpt the file (package-relative), first and last line, the version and the exact text.
Run: <venv>/bin/python -I code_refs.py   (needs only the installed transformers package, nothing is imported from it)."""
import json, os, re, sys, importlib.util

H = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.find_spec('transformers')
T = os.path.dirname(spec.origin)
ver = re.search(r'__version__ = "([^"]+)"', open(os.path.join(T, '__init__.py')).read()).group(1)
assert ver == '5.20.1', ver
TINY = os.path.normpath(os.path.join(H, '../../../src/data/tiny_gpt.py'))

# (key, file relative to the package or 'tiny', start pattern, end pattern (inclusive, first match after start) or a line count)
WANT = [
    ('rotate_half', 'models/llama/modeling_llama.py', r'^def rotate_half', 5),
    ('apply_rotary', 'models/llama/modeling_llama.py', r'^def apply_rotary_pos_emb', r'^    return q_embed, k_embed'),
    ('rotary_forward', 'models/llama/modeling_llama.py', r'^    def forward\(self, x, position_ids\)', r'^        return cos\.to'),
    ('default_inv_freq', 'models/llama/modeling_llama.py', r'^    def compute_default_rope_parameters', r'^        return inv_freq, attention_factor'),
    ('linear', 'modeling_rope_utils.py', r'^    # Gets `factor` from the config|^    factor = rope_parameters_dict\["factor"\]', 8),
    ('dynamic', 'modeling_rope_utils.py', r'^    # seq_len: default to max_position_embeddings', r'^    return inv_freq, attention_factor'),
    ('yarn', 'modeling_rope_utils.py', r'^    def get_mscale\(scale, mscale=1\)', r'^    return inv_freq, attention_factor'),
    ('llama3', 'modeling_rope_utils.py', r'^    factor = rope_parameters_dict\["factor"\]  # `8` in the original implementation', r'^    return inv_freq_llama, attention_factor'),
    ('longrope', 'modeling_rope_utils.py', r'^    # NOTE: Phi3 \(and potentially other models\) modify `max_position_embeddings`', r'^    return inv_freq, attention_factor'),
    ('proportional', 'modeling_rope_utils.py', r'^    rope_angles = int\(rope_proportion', r'^    return inv_freq, attention_factor'),
    ('llama4_temp', 'models/llama4/modeling_llama4.py', r'^        # Use temperature tuning from', 9),
    ('ds_interleave', 'models/deepseek_v3/modeling_deepseek_v3.py', r'^def apply_rotary_pos_emb_interleave', r'^    return q_embed, k_embed'),
    ('gptoss_rotary', 'models/gpt_oss/modeling_gpt_oss.py', r'^def _apply_rotary_emb', r'^    return torch\.cat'),
    ('llama4_scaling', 'models/ministral3/modeling_ministral3.py', r'^def get_llama_4_attn_scale', 3),
    ('nemotron_def', 'models/nemotron_h/modeling_nemotron_h.py', r'^def apply_rotary_pos_emb', 1),
    ('tiny_inv_freq', 'tiny', r'^def rope_inv_freq', r'^    return inv, mscale'),
    ('tiny_rope', 'tiny', r'^class Rope\(nn\.Module\)', r'^        return x \* cos'),
    ('tiny_alibi', 'tiny', r'^def alibi_slopes', r'^    return torch\.tensor\(p2\(c\)'),
    ('tiny_bias', 'tiny', r'^def attn_bias', r'^    return bias'),
    ('tiny_learned', 'tiny', r'^    def embed\(self, idx, start=0\)', r'^        return self\.drop'),
]

out = {'transformers': ver, 'refs': {}}
for key, rel, start, end in WANT:
    path = TINY if rel == 'tiny' else os.path.join(T, rel)
    lines = open(path).read().split('\n')
    i = next(n for n, l in enumerate(lines) if re.search(start, l))
    if isinstance(end, int):
        j = i + end - 1
    else:
        j = next(n for n in range(i + 1, len(lines)) if re.search(end, lines[n]))
    txt = '\n'.join(lines[i:j + 1])
    out['refs'][key] = dict(file=('src/data/tiny_gpt.py (root)' if rel == 'tiny' else 'transformers/' + rel), first=i + 1, last=j + 1,
                            version=('tiny GPT, 2026-10-18' if rel == 'tiny' else 'transformers ' + ver), text=txt)
    print('%-16s %s:%d-%d (%d lines)' % (key, out['refs'][key]['file'], i + 1, j + 1, j - i + 1))
# hybrids whose modeling file defines apply_rotary_pos_emb: is it ever called (outside its own definition and decorators)?
out['rope_calls'] = {}
for m in ('nemotron_h', 'jamba', 'falcon_h1', 'granitemoehybrid', 'qwen3_next'):
    src = open(os.path.join(T, 'models', m, 'modeling_%s.py' % m)).read()
    calls = len(re.findall(r'(?<!def )\bapply_rotary_pos_emb\(', src))
    out['rope_calls'][m] = calls
print('rope calls', out['rope_calls'])
json.dump(out, open(os.path.join(H, 'out/code_refs.json'), 'w'), indent=1)
