"""Check that the built page embeds exactly read_data.json, and that every lab number quoted in it matches the recorded smoke results."""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, '..', '..', 'index.html'), encoding='utf-8').read()
emb = json.loads(re.search(r'window\.RDG=(\{.*?\});\n', page).group(1))
d = json.load(open(os.path.join(H, 'read_data.json')))
assert emb == d, 'embedded data differs from read_data.json'
S = os.path.join(H, '..', 'data', 'smoke')
sd, sl, clip, vlm, ff = (json.load(open(os.path.join(S, f))) for f in ['sd.json', 'sd_slicing.json', 'clip.json', 'vlm.json', 'fid_floor.json'])
sig = json.load(open(os.path.join(S, 'siglip.json')))
L = d['lab']; n = 0
def has(key, s):
    global n
    assert s in L[key], (key, s); n += 1
f = lambda x: f'{x:,}'
has('sd_params', f(sd['unet_params'])); has('sd_params', f(sd['vae_params'])); has('sd_params', f(sd['text_encoder_params']))
v = sd['vae_roundtrip_p01']
has('sdvae', f"{v['psnr_db']:.1f} dB"); has('sdvae', f"{v['latent_std_raw']:.2f}"); has('sdvae', f"{v['latent_std_scaled']:.3f}")
has('sd_time', f"{sd['median_seconds_per_image']:.1f} s"); has('sd_time', f"{sd['median_seconds_per_step_incl_cfg']:.2f} s")
has('sd_time', f"{sl['slicing']['seconds']:.1f} s"); has('sd_time', f"{sl['slicing']['peak_mps_mb']/1000:.2f} GB"); has('sd_time', f"{sd['peak_mps_mb']/1000:.1f} GB")
for k, i in [('p01_cat', 0), ('p01_cat', 1), ('s04_typographic', 0), ('s04_typographic', 1)]:
    has('clip', f"{clip['cat_vs_dog_cos'][k][i]:.4f}")
for i in (0, 1):
    has('clip', f"{sig['cat_vs_dog_cos']['s04_typographic'][i]:.4f}")
q = vlm['qa'][0]
has('vlm_tokens', f(q['image_tokens'])); has('vlm_tokens', f(q['prompt_tokens'])); assert q['pixel_values_shape'][1] == 17
fl = ff['floor_by_N']
has('fid_n', f"{fl['10000'][0]:.2f}"); has('fid_n', f"{fl['5000'][0]:.2f}")
for N in ['1000', '500', '250']:
    has('fid_n', f"{min(fl[N]):.1f} to {max(fl[N]):.1f}")
# the FID-bias demo output pasted on the page is the recorded run
out = open(os.path.join(H, 'fid_bias.out')).read().strip().split('\n')
for line in out:
    assert line.replace('&', '&amp;') in page, line
print('OK: embedded data identical;', n, 'lab numbers match the smoke results; fid_bias output pasted verbatim')
