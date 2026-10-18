"""Validate calc.py against the stored parameter counts of every config in src/data/configs/.

The target is the parameter count Hugging Face reports for each repository's safetensors files
(inputs/hf_param_counts.json, read from the Hub API on 2026-10-18 at the commit listed there). It is exact,
so every residual must be explained by something calc.py deliberately leaves out of "total":
  mtp      multi-token-prediction layers shipped in the checkpoint (reported apart by calc.py)
  vision   the vision tower and projector of a multimodal checkpoint (computed here from vision_config)
  buffers  non-parameter tensors saved in the file (GPT-2 causal masks, rotary inv_freq tables)
  scales   FP8 block-scale tensors (one float per 128 x 128 block) counted by the Hub for some repos
  dup      a tied LM head that is nevertheless stored as its own tensor
The script fails (exit 1) if any residual is left unexplained.
Usage: python3 validate.py   (writes out/validation.json)
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import calc  # noqa: E402

CFG = os.path.join(HERE, '..', 'data', 'configs')


def vit_siglip(v, text_d):
    d, ff, L, p, img = v['hidden_size'], v['intermediate_size'], v['num_hidden_layers'], v['patch_size'], v['image_size']
    lay = 2 * 2 * d + 4 * (d * d + d) + (d * ff + ff) + (ff * d + d)
    tower = (3 * p * p * d + d) + (img // p) ** 2 * d + L * lay + 2 * d
    proj = d * text_d + d  # mm_input_projection_weight and mm_soft_emb_norm
    return tower + proj


def vit_pixtral(v, text_d, merge=2):
    d, ff, L, p = v['hidden_size'], v['intermediate_size'], v['num_hidden_layers'], v['patch_size']
    lay = 2 * d + 4 * d * d + 3 * d * ff
    tower = 3 * p * p * d + d + L * lay
    proj = d + (d * merge * merge) * d + d * text_d + text_d * text_d
    return tower + proj


def vit_llama4(v, text_d):
    d, ff, L, p, img = v['hidden_size'], v['intermediate_size'], v['num_hidden_layers'], v['patch_size'], v['image_size']
    n = (img // p) ** 2
    lay = 4 * (d * d + d) + (d * ff + ff) + (ff * d + d) + 2 * 2 * d
    tower = 3 * p * p * d + d + (n + 1) * d + 2 * 2 * d + L * lay
    adapter = ff * v['projector_input_dim'] + v['projector_output_dim'] * v['projector_output_dim']
    proj = v['vision_output_dim'] * text_d
    return tower + adapter + proj


def fp8_scales(spec, skip_eh_proj=True):
    sc = lambda o, i: math.ceil(o / 128) * math.ceil(i / 128)
    d = spec['d']; tot = 0
    for l in spec['layers'] + [spec['layers'][-1]] * spec.get('mtp', 0):
        m = l['mix']; nh = m['nh']
        tot += sc(m['ql'], d) + sc(nh * (m['nope'] + m['rope']), m['ql']) + sc(m['kvl'] + m['rope'], d) + \
            sc(nh * (m['nope'] + m['v']), m['kvl']) + sc(d, nh * m['v'])
        if m['inh']: tot += sc(m['inh'] * m['ihd'], m['ql']) + sc(m['ihd'], d)
        f = l['ffn']
        if f['t'] == 'glu': tot += 2 * sc(f['ff'], d) + sc(d, f['ff'])
        else:
            tot += f['E'] * (2 * sc(f['ff'], d) + sc(d, f['ff']))
            if f['sff']: tot += 2 * sc(f['sff'], d) + sc(d, f['sff'])
    return tot


# Things the checkpoint stores beyond calc.py's "total + mtp + vision", each checked against a file header or index.
EXTRA = {
    'gpt2': ('buffers', lambda c, s: c['n_layer'] * c['n_positions'] ** 2,
             'attn.bias causal-mask buffers (1 x 1 x 1024 x 1024 per layer) saved in the old checkpoint'),
    'gpt2-xl': ('buffers', lambda c, s: c['n_layer'] * c['n_positions'] ** 2,
                'attn.bias causal-mask buffers (1 x 1 x 1024 x 1024 per layer) saved in the old checkpoint'),
    'llama-1-7b': ('buffers', lambda c, s: c['num_hidden_layers'] * (c['hidden_size'] // c['num_attention_heads']) // 2,
                   'rotary_emb.inv_freq buffers (64 floats per layer, F32)'),
    'llama-2-7b': ('buffers', lambda c, s: c['num_hidden_layers'] * (c['hidden_size'] // c['num_attention_heads']) // 2,
                   'rotary_emb.inv_freq buffers (64 floats per layer, F32)'),
    'kimi-k2': ('buffers', lambda c, s: c['num_hidden_layers'] * 56,
                'rotary_emb.inv_freq tensors, BF16 [56] per layer (read from the shard header); the F32 FP8 scale '
                'tensors are in the files but not in the Hub count'),
    'deepseek-v3': ('scales', lambda c, s: fp8_scales(s),
                    'F32 weight_scale_inv tensors, one per 128 x 128 block of every FP8 matrix (eh_proj is BF16)'),
    'deepseek-v3.2-exp': ('scales', lambda c, s: fp8_scales(s),
                          'F32 weight_scale_inv tensors, one per 128 x 128 block of every FP8 matrix (eh_proj is BF16)'),
    'qwen3-0.6b': ('dup', lambda c, s: s['V'] * s['d'],
                   'tie_word_embeddings is true, but lm_head.weight is also saved as its own [151936, 1024] tensor'),
}
VISION = {'gemma3': vit_siglip, 'mistral3': vit_pixtral, 'llama4': vit_llama4}


def main():
    api = json.load(open(os.path.join(HERE, 'inputs', 'hf_param_counts.json')))
    rows = []; bad = 0
    for f in sorted(os.listdir(CFG)):
        if not f.endswith('.json') or f == 'manifest.json': continue
        key = f[:-5]
        cfg = json.load(open(os.path.join(CFG, f)))
        spec = calc.normalise(cfg); p = calc.params(spec)
        vis = 0
        if cfg.get('vision_config') and cfg.get('model_type') in VISION:
            vis = VISION[cfg['model_type']](cfg['vision_config'], spec['d'])
        ex = EXTRA.get(key)
        extra = ex[1](cfg, spec) if ex else 0
        a = (api.get(key) or {}).get('total')
        row = {'key': key, 'model_type': spec['model_type'], 'calc_total': p['total'], 'mtp': p['mtp'], 'vision': vis,
               'extra': extra, 'extra_kind': ex[0] if ex else '', 'extra_why': ex[2] if ex else '',
               'active': p['active'], 'active_no_emb': p['active_no_emb'], 'active_no_emb_head': p['active_no_emb_head'],
               'hub_total': a}
        if a is not None:
            row['residual'] = a - (p['total'] + p['mtp'] + vis + extra)
            if row['residual'] != 0: bad += 1
        rows.append(row)
        print('%-22s calc %16s  +mtp %14s  +vision %12s  +%-7s %12s  hub %16s  residual %s' % (
            key, format(p['total'], ','), format(p['mtp'], ','), format(vis, ','), row['extra_kind'] or '-',
            format(extra, ','), format(a, ',') if a else 'n/a', row.get('residual', 'n/a')))
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    json.dump(rows, open(os.path.join(HERE, 'out', 'validation.json'), 'w'), indent=1)
    print('unexplained residuals:', bad)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
