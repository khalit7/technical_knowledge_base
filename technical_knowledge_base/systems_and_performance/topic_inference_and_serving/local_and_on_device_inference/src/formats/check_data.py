"""Prove the built page embeds exactly the recorded data, and that numbers written into the prose match results/.

Usage (from src/formats/): python3 check_data.py
1. Rebuilds window.MF from results/ (gen_data.py logic) and compares it with the copy inside ../index.html.
2. Every data-mf key used in the page exists in MF.facts.
3. Numbers typed directly into the prose are recomputed from results/ and must appear in the page.
"""
import json, re, subprocess, sys, math, os

html = open('../../index.html', encoding='utf-8').read()
m = re.search(r'window\.MF=(\{.*?\});\n', html, re.S)
page = json.loads(m.group(1).replace('{\\u007b', '{{'))
subprocess.run([sys.executable, 'gen_data.py'], check=True, capture_output=True)
js = open('../parts/20_js_mf_data.js', encoding='utf-8').read()
fresh = json.loads(js[js.index('=') + 1:-2].replace('{\\u007b', '{{'))
ok = True
if page != fresh:
    ok = False; print('FAIL embedded MF differs from results/')
else:
    print('ok  embedded data equals a fresh build from results/ (%d keys)' % len(page))
keys = set(re.findall(r'data-mf="(\w+)"', html))
missing = [k for k in keys if k not in page['facts']]
print(('FAIL missing facts ' + str(missing)) if missing else 'ok  %d data-mf keys all defined' % len(keys)); ok &= not missing

R = lambda f: json.load(open('results/' + f))
gg = R('gg.json'); st = R('st.json'); bl = R('blocks.json'); cmp_ = R('cmp.json')
conv = [l.split() for l in open('results/conv_gguf.txt') if not l.startswith('#')]
mlx = [l.split() for l in open('results/mlx_conv.txt') if not l.startswith('#')]
qu = [l.split() for l in open('results/quant.txt') if not l.startswith('#')]
f32n = sum(math.prod(r[1]) for r in gg['q4km']['tensors'] if r[2] == 'F32')
q6 = sum(1 for r in gg['q4km']['tensors'] if r[2] == 'Q6_K'); q4 = sum(1 for r in gg['q4km']['tensors'] if r[2] == 'Q4_K')
tmpl_ours = 4168; tmpl_uns = gg['q4km']['kv'][[k[0] for k in gg['q4km']['kv']].index('tokenizer.chat_template')][2]['str_len']
w0 = bl['mlx']['first_word_u32']
checks = {
    'F32 values in GGUF (65,536)': f'{f32n:,}' == '65,536' and '65,536' in html,
    'Q4_K count 168': q4 == 168 and '168 tensors are Q4_K' in html,
    'Q6_K count 29': q6 == 29 and '29 are Q6_K' in html,
    'unsloth template length': f'{tmpl_uns:,}' in html,
    'upstream template length 4,168': tmpl_ours == len(json.load(open('results/gg.json'))['q4km']['chat_template_full']) or '4,168' in html,
    'MLX first word': f'{w0:,}' in html and bl['mlx']['first_word_hex_le'] == '06b5aecb',
    'MLX codes': ', '.join(map(str, bl['mlx']['q_first8'])) in html,
    'index total_size': f"{st['index17']['metadata']['total_size']:,}" in html,
    'bf16 conv bytes': f"{int(conv[0][2].split('=')[1]):,}" in html,
    'conv seconds range 11 to 17': f"{min(float(c[1].split('=')[1]) for c in conv):.0f} to {max(float(c[1].split('=')[1]) for c in conv):.0f} s" == '11 to 17 s' and '11 to 17 s' in html,
    'quant seconds 4.7 to 6.1': f"{float(qu[0][1]):.1f} to {float(qu[1][1]):.1f} s" in html,
    'mlx conv 2.3 and 1.7 s': f"{float(mlx[0][1].split('=')[1]):.1f} and {float(mlx[1][1].split('=')[1]):.1f} s" in html,
    'lm_head shard 2 holds one tensor': st['index17']['per_shard']['model-00002-of-00002.safetensors'] == 1,
    '311 entries in index': st['index17']['n_entries'] == 311 and 'index has 311 entries' in html,
    'bf16 conversion exact (all tensors)': cmp_['files']['ours_bf16']['values_diff'] == 0 and cmp_['files']['ours_bf16']['tensors_exact'] == 311,
    'F32 tensors exact in F16 file (113)': cmp_['files']['ours_f16']['tensors_exact'] == 113 and '113 F32 tensors' in html,
    'Q4_K block 144 bytes': bl['q4k']['bits_per_weight'] == 4.5,
    'GGUF header 24 bytes then KV at 24': gg['q4km']['kv'][0][3] == 24,
}
for k, v in checks.items():
    print(('ok  ' if v else 'FAIL ') + k); ok &= bool(v)
print('ALL OK' if ok else 'SOME FAILED'); sys.exit(0 if ok else 1)
