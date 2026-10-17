# Recompute every number the calculator and the Reading tab show for the presets (the page's JS must agree: check_data.py compares).
# usage: python3 -I recompute.py   -> out/recompute.json
import json, os
H = os.path.dirname(os.path.abspath(__file__))
vm = json.load(open(os.path.join(H, '..', 'inputs', 'video_models.json'))); cnt = json.load(open(os.path.join(H, 'out', 'meta.json')))
def lat_frames(m, F): return F // m['ct'] if m.get('frames_rule') else (F - 1) // m['ct'] + 1
out = {}
for m in vm['models']:
    P = cnt['params'][m['cfg']] if m['cfg'] else m['params']
    lf = lat_frames(m, m['F']); lh, lw = m['H'] // m['cs'], m['W'] // m['cs']
    N = lf * (lh // m['ph']) * (lw // m['ph'])
    sec = m['F'] / m['fps']
    lin = 2 * P * N; att = 4 * m['L'] * N * N * m['D']; per = lin + att
    spatial = lh // m['ph'] * (lw // m['ph'])
    fact_pairs = lf * spatial ** 2 + spatial * lf ** 2
    out[m['id']] = dict(params=P, latent=[m['ch'], lf, lh, lw], tokens=N, seconds=round(sec, 3), tok_per_s=round(N / sec),
        vae_ratio=round(3 * m['cs'] ** 2 * m['ct'] / m['ch'], 2), px_per_token=m['cs'] ** 2 * m['ph'] ** 2 * m['ct'],
        tflop_pass=round(per / 1e12, 1), attn_share=round(att / per, 3), tflop_video=round(per * m['steps'] * m['passes'] / 1e12),
        full_pairs=N * N, fact_pairs=fact_pairs, fact_ratio=round(N * N / fact_pairs, 1))
json.dump(out, open(os.path.join(H, 'out', 'recompute.json'), 'w'), indent=1)
for k, v in out.items(): print(k, v)
