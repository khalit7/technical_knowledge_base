"""Pack inputs/*.json into parts/20_js_data.js (window.CSD), small enough for the page.

- rb: the 48-pair STS-B batch, cosines x1000 for BERT (first-last avg) and unsup-SimCSE ([CLS]), plus the
  statistics table for every pooling.
- ts: the 2-D toy (sphere mode): every snapshot's 200 angles as base64 bytes, and the metrics.
- tc: the collapse toy: metrics per snapshot and the 10 x 10 class-mean cosine matrices.
- mae: the MAE images and masks; ij: I-JEPA-style masks on the same 14 x 14 grid, drawn with the paper's
  sampling rules (4 targets, scale 0.15-0.2, aspect 0.75-1.5; context scale 0.85-1.0, unit aspect,
  targets removed), seeded.
Run: python3 mk_data.py
"""
import base64, json, math, random

rb = json.load(open('inputs/real_batch.json'))
ts = json.load(open('inputs/toy_sphere.json'))
tc = json.load(open('inputs/toy_collapse.json'))
mae = json.load(open('inputs/mae.json'))

flat = lambda M: [int(round(v * 1000)) for row in M for v in row]
mods = rb['models']
order = [('BERT-base, masked-LM only', 'bert:first_last_avg', 'first-last avg'), ('BERT-base, masked-LM only', 'bert:emb_last_avg', 'embedding + last avg'),
         ('BERT-base, masked-LM only', 'bert:cls', '[CLS], last layer'), ('Same BERT after unsupervised SimCSE', 'simcse:cls', '[CLS], no MLP'),
         ('Same BERT after unsupervised SimCSE', 'simcse:first_last_avg', 'first-last avg'), ('Same BERT after unsupervised SimCSE', 'simcse:mean_last', 'mean, last layer')]
tbl = [dict(name=n, pool=p, sp=mods[k]['spearman_x100'], al=mods[k]['align'], un=mods[k]['unif'], mc=mods[k]['mean_cos_random']) for n, k, p in order if k in mods]
RB = dict(s1=rb['batch_s1'], s2=rb['batch_s2'], gold=rb['batch_gold'],
          M=dict(bert=flat(mods['bert:first_last_avg']['batch_cos']), simcse=flat(mods['simcse:cls']['batch_cos'])),
          tbl=tbl, paper=dict(bert=59.04, bert_t5=53.87, simcse=76.85))

TS = dict(steps=ts['steps'], snap_steps=ts['snap_steps'], labels=ts['test_labels'], runs={})
for k, r in ts['runs'].items():
    TS['runs'][k] = dict(cfg=r['cfg'], snaps=[{kk: s[kk] for kk in ('step', 'std', 'align', 'unif', 'knn', 'loss')} for s in r['snaps']],
                         ang=[base64.b64encode(bytes(a)).decode() for a in r['kept']],
                         fin=[{kk: s[kk] for kk in ('std', 'align', 'unif', 'knn')} for s in r['final_seeds']])

TC = dict(steps=tc['steps'], snap_steps=tc['snap_steps'], raw_knn=None, runs={})
for k, r in tc['runs'].items():
    for sn in r['snaps']:
        sn['pds'] = [round(v, 2) for v in sn['pds']]
        for kk in ('align', 'unif', 'loss', 'std', 't_entropy', 'kl_mean_unif'):
            if sn.get(kk) is not None: sn[kk] = round(sn[kk], 3)
    TC['runs'][k] = dict(cfg=r['cfg'], snaps=r['snaps'], kept=r['kept'],
                         final_seeds=[{kk: s[kk] for kk in ('std', 'erank', 'knn', 'align', 'unif') + (('t_entropy', 'kl_mean_unif') if 't_entropy' in s else ())} for s in r['final_seeds']])

# raw-pixel 5-NN on the same 200 test digits (cosine), for the table
try:
    from sklearn.datasets import load_digits  # optional; recompute.py checks the stored value
except Exception:
    load_digits = None
TC['raw_knn'] = json.load(open('inputs/raw_knn.json'))['raw_pixels_knn']
TC['about'] = open('inputs/collapse_about.html').read().strip()

# I-JEPA-style masks on the 14 x 14 grid
rng = random.Random(11)
G = 14
def block(scale, ar):
    area = scale * G * G
    h = max(1, min(G, round(math.sqrt(area * ar)))); w = max(1, min(G, round(math.sqrt(area / ar))))
    r0 = rng.randint(0, G - h); c0 = rng.randint(0, G - w)
    return {(r, c) for r in range(r0, r0 + h) for c in range(c0, c0 + w)}
targets = [block(rng.uniform(0.15, 0.2), rng.uniform(0.75, 1.5)) for _ in range(4)]
ctx = block(rng.uniform(0.85, 1.0), 1.0)
alltg = set().union(*targets)
ctx -= alltg
IJ = dict(targets=[sorted(r * G + c for r, c in t) for t in targets], context=sorted(r * G + c for r, c in ctx))

MAE = dict(cfg=mae['config'], original=mae['original'], ratios={k: dict(mask=v['mask'], loss=v['loss_masked'], nvis=v['n_visible'], visible=v['visible'], recon=v['recon'])
                                                              for k, v in mae['ratios'].items()})
out = 'window.CSD=' + json.dumps(dict(rb=RB, ts=TS, tc=TC, mae=MAE, ij=IJ), separators=(',', ':')) + ';\n'
open('parts/20_js_data.js', 'w').write(out)
print('20_js_data.js', len(out), 'bytes; I-JEPA context', len(IJ['context']), 'targets', [len(t) for t in IJ['targets']], 'union', len(alltg))
