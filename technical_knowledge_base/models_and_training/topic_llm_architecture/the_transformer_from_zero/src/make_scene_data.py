"""Write parts/26_js_tz_scene.js (window.TZS): the numbers the 3D stages draw (2026-11-10).

Source: the root's trace of the trained tiny GPT (ref_baseline_s1500, the checkpoint this page's gpt_zero.py loads with
identical logits, steps.py), recorded by the root's src/block/trace.py on CPU: one token of the running sequence, "o" at
position 157 ("Why are you sad, Ro|xy"), through every block, with every intermediate vector, the scaled attention scores
and weights of all 8 heads in every layer, the final norm and the top 10 next-token probabilities, plus the stream norms of
all 256 tokens after every sub-layer. Nothing is recomputed except norms, sums and rounding; check_data.py regenerates this
file and compares.
usage: python3 src/make_scene_data.py   (from anywhere; reads ../../src/block/out/, writes parts/26_js_tz_scene.js)
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
TRACE = os.path.join(HERE, '..', '..', 'src', 'block', 'out', 'trace_ref_baseline_s1500.json')
OUT = os.path.join(HERE, 'parts', '26_js_tz_scene.js')


def r(v, d=4):
    return [round(x, d) for x in v]


def norm(v):
    return round(math.sqrt(sum(x * x for x in v)), 3)


def build():
    t = json.load(open(TRACE))
    L = t['layers']
    l1 = L[0]
    S = {
        'src': 'root src/block/out/trace_ref_baseline_s1500.json (trace.py, CPU)',
        'pos': t['pos'], 'token': t['token'], 'token_id': t['token_id'], 'next': t['next_token'],
        'cfg': t['config'],
        'emb': {k: r(t['embed'][k]) for k in ('tok', 'pos', 'x')},
        'emb_norm': {k: norm(t['embed'][k]) for k in ('tok', 'pos', 'x')},
        # layer 1 in full (the block, the head and the heads scenes)
        'l1': {k: r(l1[k]) for k in ('norm1', 'q', 'k', 'v', 'head_out', 'attn_out', 'x_mid', 'norm2', 'ffn_up', 'ffn_act', 'ffn_out', 'x_out')},
        'l1_scores': [r(s, 3) for s in l1['scores']],
        'l1_attn': [r(a, 4) for a in l1['attn']],
        'l1_entropy': l1['stats']['attn_entropy_bits'],
        'l1_gelu_neg': l1['stats']['gelu_neg_frac'],
        'l1_norm': {k: norm(l1[k]) for k in ('x_in', 'norm1', 'attn_out', 'x_mid', 'norm2', 'ffn_out', 'x_out')},
        # the last block's output and the head of the model
        'l6_out': r(L[-1]['x_out']), 'l6_out_norm': norm(L[-1]['x_out']),
        'norm_f': r(t['final']['norm_f']), 'norm_f_norm': norm(t['final']['norm_f']),
        'top': t['final']['top'], 'p_next': t['final']['p_next'],
        'logit_max': t['final']['logit_max'], 'logit_min': t['final']['logit_min'],
        'norms': {k: t['norms'][k] for k in ('labels', 'stream_token', 'stream_median')},
    }
    S['loss_here'] = round(-math.log(S['p_next']), 3)
    S['top10_sum'] = round(sum(p for _, p, _ in S['top']), 4)
    return S


def text():
    return ('// Written by src/make_scene_data.py from the root\'s trace of the trained tiny GPT (do not edit by hand)\n'
            'window.TZS=' + json.dumps(build(), separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    s = text()
    open(OUT, 'w').write(s)
    print(OUT.split('/src/')[-1], len(s), 'bytes')
