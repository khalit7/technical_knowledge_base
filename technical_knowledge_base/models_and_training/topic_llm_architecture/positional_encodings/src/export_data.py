# Writes parts/22_js_pe_0data.js: everything the page's visuals and data-filled sentences read, from recorded outputs only.
# Runs recompute.py first (inputs/recompute.json). Inputs: inputs/ (configs, T5-base biases), census/out/census.json,
# train/out/runs.json, past/out/past.json, probe/out/probe.json, code/out/code_refs.json, code/out/hf_check.json.
import json, os, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(H, 'inputs')
subprocess.run([sys.executable, os.path.join(H, 'recompute.py')], check=True, stdout=subprocess.DEVNULL)
R = json.load(open(os.path.join(I, 'recompute.json')))
J = lambda *p: json.load(open(os.path.join(H, *p)))
cfg = lambda f: json.load(open(os.path.join(I, f)))
phi = cfg('phi3_mini_128k_config.json')
t5 = cfg('t5_base_relative_bias.json')
dec = t5['decoder.block.0.layer.0.SelfAttention.relative_attention_bias.weight']

P = {}
for k, p in R['presets'].items():
    P[k] = dict(name=p['name'], base=p['base'], dim=p['dim'], L=p['L'], s=p['s'], method=p['method'], maxpos=p['maxpos'])
P['llama31'].update(low=1.0, high=4.0)
P['llama4'].update(low=1.0, high=1.0)
P['oss'].update(truncate=False)
P['kimik2'].update(beta_fast=1.0, beta_slow=1.0)
P['phi3'].update(long=[round(x, 4) for x in phi['rope_scaling']['long_factor']], short=[round(x, 4) for x in phi['rope_scaling']['short_factor']])

census = J('census', 'out', 'census.json')['rows']
cen = [{k: r.get(k) for k in ('repo', 'url', 'model_type', 'scheme', 'theta', 'rot_dims', 'head_dim', 'max_pos', 'scaling', 'partial', 'local_theta',
                              'window', 'nope_layers', 'notes', 'layers', 'longest_wavelength', 'full_turn_pairs_at_orig', 'pairs', 'fetched') if r.get(k) not in (None, [], '')}
       for r in census if 'error' not in r]

runs = J('train', 'out', 'runs.json')['runs']
for r in runs:
    if r.get('train_curve'):
        r['train_curve'] = r['train_curve'][::2]
past = J('past', 'out', 'past.json')
for r in past['runs']:
    for off, v in r.get('shifted', {}).items():
        v.pop('token_loss', None)
probe = J('probe', 'out', 'probe.json')
code = J('code', 'out', 'code_refs.json')
hf = J('code', 'out', 'hf_check.json')
hf_err = max(v['max_rel_err'] for p in hf['presets'].values() for v in p.values() if isinstance(v, dict))
# the long_context sibling's fine-tune logs, if they have landed (read only)
lc = {}
LC = os.path.normpath(os.path.join(H, '../../long_context/src/past/out'))
for n in ('lc_pi_ft', 'lc_plain_ft'):
    f = os.path.join(LC, n + '_log.json')
    if os.path.exists(f):
        lg = json.load(open(f)); lc[n] = {k: lg[k] for k in ('scaling', 'steps', 'batch', 'ctx', 'lr', 'eval', 'seconds') if k in lg}

src = open(os.path.join(H, 'past', 'past_eval.py')).read().split('\n')
a = next(i for i, l in enumerate(src) if l.startswith('def shifted')) - 1
b = next(i for i in range(a + 2, len(src)) if src[i].startswith('    return out'))
past_code = dict(first=a + 1, last=b + 1, text='\n'.join(src[a:b + 1]))
data = dict(past_code=past_code, presets=P, t5dec=[[round(x, 3) for x in row] for row in dec],
            R={k: R[k] for k in ('yarn_bands', 'llama31_bands', 'deepseek_temp', 'yarn_temp_table', 'layers', 'partial', 'llama4_temp',
                                 't5_last_bucket_starts', 'partial_two_ways', 'plain_unseen')},
            census=cen, runs=runs, past=past, probe=probe, lc=lc,
            code={'ver': code['transformers'], 'refs': code['refs'], 'rope_calls': code['rope_calls']}, hf_err=hf_err)
js = ('// ---- Data: written by src/export_data.py from recorded outputs (configs, runs, evaluations, code excerpts). Do not edit. ----\n'
      'window.PE_DATA=' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
open(os.path.join(H, 'parts', '22_js_pe_0data.js'), 'w').write(js)
print('22_js_pe_0data.js', len(js.encode()), 'bytes; census', len(cen), 'runs', sum(1 for r in runs if not r.get('pending')), 'past', len(past['runs']), 'lc', list(lc))
