"""Check that the built page embeds exactly read_data.json, and that every lab number quoted in it matches the recorded smoke results."""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, '..', '..', 'index.html'), encoding='utf-8').read()
emb = json.loads(re.search(r'window\.RDG=(\{.*?\});\n', page).group(1))
d = json.load(open(os.path.join(H, 'read_data.json')))
# Since 2026-10-24 the page embeds only the pullover and the seconds per pass; the recorded sentences in
# read_data.json are static HTML on the root or on the child that owns them (ledger.json), and are still checked below.
assert {k: v for k, v in emb.items() if k != 'lab'} == {k: v for k, v in d.items() if k != 'lab'}, 'embedded image differs from read_data.json'
assert emb['lab'] == {'sd_sec_per_pass': d['lab']['sd_sec_per_pass']}, 'embedded seconds per pass differ'
S = os.path.join(H, '..', 'data', 'smoke')
sd, sl, clip, vlm, ff = (json.load(open(os.path.join(S, f))) for f in ['sd.json', 'sd_slicing.json', 'clip.json', 'vlm.json', 'fid_floor.json'])
sig = json.load(open(os.path.join(S, 'siglip.json')))
L = d['lab']; n = 0
def has(key, s):
    global n
    assert s in L[key], (key, s); n += 1
f = lambda x: f'{x:,}'
has('sd_params', f(sd['unet_params'])); has('sd_params', f(sd['vae_params'])); has('sd_params', f(sd['text_encoder_params']))
R = os.path.join(H, '..')
J = lambda *p: json.load(open(os.path.join(R, *p)))
tiny = J('latent', 'out', 'tiny.json')['runs']; vae = J('latent', 'out', 'sd_vae.json'); sc = J('latent', 'out', 'sd_scale.json')
has('ae_prior', f(round(tiny['ae16']['prior_std_normal']['fd']))); has('ae_prior', f"{round(100*tiny['ae16']['prior_std_normal']['class_share'][8])}%")
has('ae_prior', str(round(tiny['vae16_b1p0']['prior']['fd']))); has('ae_prior', str(round(tiny['ae16']['prior_fitted_gaussian']['fd']))); has('ae_prior', str(J('latent', 'out', 'tiny.json')['floor_real_val_1000']['fd']))
has('beta', f"{tiny['vae16_b0p1']['test_kl_nats']:.1f} to {tiny['vae16_b10p0']['test_kl_nats']:.1f}"); has('beta', f"{tiny['vae16_b0p1']['active_units']} to {tiny['vae16_b10p0']['active_units']}")
has('beta', f"{tiny['vae16_b0p1']['test_psnr_db']:.1f} to {tiny['vae16_b10p0']['test_psnr_db']:.1f}")
for k in ['vae16_b0p3', 'vae16_b1p0', 'vae16_b0p1']: has('beta', str(round(tiny[k]['prior']['fd'])))
has('beta', f(round(tiny['vae16_b10p0']['prior']['fd'])))
im = vae['images']; ph = [im[k]['fp32']['psnr'] for k in ['p01_cat', 'p02_coffee', 'p03_rocket', 'p04_hubble']]
gr = [im[k]['fp32']['psnr'] for k in ['s01_shapes', 's02_left_right', 's03_text', 's05_chart', 's06_clock']]
has('sdvae', f"{min(ph):.1f} to {max(ph):.1f} dB"); has('sdvae', f"{min(gr):.1f} to {max(gr):.1f} dB"); has('sdvae', f"{im['g04_puppy']['fp32']['psnr']:.1f} dB")
assert max(abs(im[k]['fp32']['psnr'] - im[k]['fp16']['psnr']) for k in im) <= 0.1 + 1e-9
has('sdvae', f"{vae['all16']['latent_std']:.2f}"); has('sdvae', f"{vae['all16']['implied_factor_1_over_std']:.4f}")
assert round(100 * (1 - vae['all16']['implied_factor_1_over_std'] / 0.18215), 1) == 0.3
nz = vae['noising']['0']; has('mis_scale', f(round(nz['snr_raw']))); has('mis_scale', str(round(nz['snr_scaled']))); assert round(nz['snr_raw'] / nz['snr_scaled']) == 30
has('mis_scale', f"spread {round(sc['runs']['i2i_1.0']['std_rgb'][0])} against {round(sc['runs']['i2i_0.18215']['std_rgb'][0])}")
has('mis_scale', f"spread {round(sc['runs']['t2i_div_1.0']['std_rgb'][0])} against {round(sc['runs']['t2i_div_0.18215']['std_rgb'][0])}")
has('mis_scale', f"{vae['decode_mistakes']['right']['psnr']:.1f} to {vae['decode_mistakes']['forgot_divide']['psnr']:.1f} dB")
D = J('diff', 'out', 'read_numbers.json'); Fl = J('flow', 'out', 'read_numbers.json')
import re as _re
nums = lambda s: set(_re.findall(r'\d[\d,]*\.?\d*', _re.sub('<[^>]+>', '', s)))
# condensed lab strings: every number must come from the lab's own string, or be a step count / scale setting,
# or one checked against the flow samples below (48.9, 23.8) or the diffusion string (34.9, 62.3 appear there)
OK_SETTINGS = {'1', '2', '4', '5', '10', '15', '20', '25', '50', '1,000', '4,000', '16', '7.5', '48.9', '23.8'}
for k, src in [('steps', D['steps']), ('cfg', D['cfg']), ('flow_vs_diff', Fl['flow_vs_diff'] + D['steps'])]:
    for x in nums(L[k]):
        assert x in nums(src) or x in OK_SETTINGS, (k, x)
        n += 1
assert L['sd_sec_per_pass'] == D['sd_sec_per_pass'] and L['t_diff'] == D['t_diff'] and L['t_flow'] == Fl['t_flow']
for s in ['15.75 s', '0.610 s', '0.319 s', '0.488 s', '0.025 s']: assert s in D['sd_time_more'], s; has('sd_time', s)
has('sd_time', f"{round(sl['slicing']['peak_mps_mb']):,} MiB")
fm = J('flow', 'out', 'samples_fm_4000.json'); eu = {s['steps']: s['fd'] for s in fm['samplers'] if s['solver'] == 'euler'}
has('flow_vs_diff', f"{eu[50]:.1f}"); has('flow_vs_diff', f"{min(c['fd'] for c in fm['cfg']):.1f}")
ddpm = {1: 1493.9, 4: 300.3, 10: 130.5, 50: 62.3}; ddim = {1: 1493.9, 4: 478.9, 10: 181.3, 50: 112.7}
for k in ddpm: assert str(ddpm[k]).replace('1493.9', '1,493.9') in D['steps'] and eu[k] < min(ddpm[k], ddim[k]), k
unguided = [s['fd'] for s in fm['samplers']] + [s['fd'] for s in J('flow', 'out', 'samples_extra.json')['heun_last_euler']]
assert min(unguided) > 34.9 and '34.9' in D['steps']
z = J('vision', 'out', 'zeroshot.json')
has('clip', f"{100*max(z['clip']['acc'].values()):.1f}%"); has('clip', f"{100*max(z['siglip']['acc'].values()):.1f}%")
has('clip', f"{100*z['clip']['linear_probe']['16']['mean']:.1f}%"); has('clip', f"{100*z['siglip']['linear_probe']['16']['mean']:.1f}%")
caps = [v for k, v in z['siglip']['acc'].items() if k.startswith('official|')]; assert 0.2 <= min(caps) and max(caps) <= 0.23
ac, asg = J('vision', 'out', 'analyse_clip.json')['probes']['typo'], J('vision', 'out', 'analyse_siglip.json')['probes']['typo']
for x in [ac[0][0], ac[0][1], ac[2][0], ac[2][1], asg[2][0], asg[2][1]]: has('clip', f"{x:.4f}")
tk = J('vlm', 'out', 'tokens.json'); assert {r['image_tokens'] for r in tk['square_default']} == {1088}
has('vlm_tokens', f(tk['square_default'][0]['total_tokens'])); has('vlm_tokens', str(tk['aspect_default'][0]['image_tokens']))
has('vlm_tokens', f(tk['knob'][5]['image_tokens'])); assert tk['knob'][0]['image_tokens'] == 64
scq = J('vlm', 'out', 'scores.json'); dq = scq['qa']['4x4+1 (1088, default)']
has('vlm_halluc', f"{dq['right']} of {dq['n']}"); has('vlm_halluc', f"{scq['qa']['1 tile (64)']['right']} of 30")
po = scq['pope']['4x4+1 (1088, default)']['yes']
has('vlm_halluc', f"{po['absent_random'][0]} of {po['absent_random'][1]}"); has('vlm_halluc', f"{po['absent_adversarial'][0]} of {po['absent_adversarial'][1]}"); has('vlm_halluc', f"{po['present'][0]} of {po['present'][1]}")
tm = J('vlm', 'out', 'timing.json')['runs'][2]; has('vlm_halluc', f"{tm['vision_seconds']:.1f} s"); has('vlm_halluc', f"{round(tm['peak_mps_mb']):,} MiB")
# the FID-bias demo output pasted on the page is the recorded run
out = open(os.path.join(H, 'fid_bias.out')).read().strip().split('\n')
for line in out:
    assert line.replace('&', '&amp;') in page, line
print('OK: embedded data identical;', n, "lab numbers match the labs' recorded outputs; fid_bias output pasted verbatim")
