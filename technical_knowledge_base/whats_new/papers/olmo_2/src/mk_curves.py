"""Turn the curves read by extract_figs.py into the page's data, and compute the paper's spike score on them.
usage: uv run --with numpy python mk_curves.py   (after extract_figs.py, which leaves olmo2_figs_full.json in the temp folder)

Writes
  parts/_gen_curves.js   window.CURVES: per figure, per run, an envelope (min and max of the drawn vertices in each of
                         NB equal-width step bins, 12-bit quantised, two base64 characters per number), the rolling
                         mean and standard deviation of the spike score's window per bin, and every vertex whose
                         distance from the rolling mean is at least 4 standard deviations (step, z), so the page can
                         recount spikes exactly at any threshold from 4 to 12.
  inputs/spike_scores.json  the spike score of every run under the paper's definition and under the variants tested,
                         for recompute.py and the page.

Spike score (paper, section 3.2): "the percentage of values in a time series that are at least seven standard
deviations away from a rolling average of the last 1,000 values". Read here as: for each value with 1,000 values
before it, the mean and population standard deviation of those 1,000; a spike when |value - mean| >= 7 sd. The
values are the drawn vertices of the figure's path (matplotlib drops vertices within about 1/9 pixel of a straight
line when it writes a PDF), so variants on a per-step resampling are reported too.
"""
import json, os, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
O = json.load(open(os.path.join(tempfile.gettempdir(), 'olmo2_figs_full.json')))
NB = 240
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'


def enc(vals, lo, hi, log):
    out = []
    for v in vals:
        if v is None or not np.isfinite(v): q = 4095
        else:
            t = (np.log10(v) - np.log10(lo)) / (np.log10(hi) - np.log10(lo)) if log else (v - lo) / (hi - lo)
            q = int(round(min(1, max(0, t)) * 4094))
        out.append(B64[q >> 6] + B64[q & 63])
    return ''.join(out)


def rolling(y, W):
    c = np.concatenate([[0], np.cumsum(y)]); c2 = np.concatenate([[0], np.cumsum(y * y)])
    i = np.arange(W, len(y))
    mu = (c[i] - c[i - W]) / W; var = (c2[i] - c2[i - W]) / W - mu * mu
    return i, mu, np.sqrt(np.maximum(var, 0))


def score(y, W=1000, k=7):
    y = np.asarray(y, float)
    if len(y) <= W: return None
    i, mu, sd = rolling(y, W)
    z = np.abs(y[i] - mu) / np.where(sd > 0, sd, np.inf)
    n = int((z >= k).sum())
    return {'pct': round(100 * n / len(i), 4), 'spikes': n, 'evaluated': int(len(i))}


def resample(x, y, step):
    o = np.argsort(x, kind='stable'); x, y = x[o], y[o]
    g = np.arange(np.ceil(x[0]), np.floor(x[-1]) + 1, step)
    return np.interp(g, x, y)


FIGS = {  # figure key -> how the page draws it
    'fig3': {'title': 'Repeated n-gram filter', 'paper': 'Figure 3', 'anchor': 'S3.F3', 'panels': [('gnorm', 'L2 norm of the gradient', True, 0.1, 12)],
             'runs': [('fig3_without_filter', 'without filter', 'without the filter', 0), ('fig3_with_filter', 'with filter', 'with the filter', 1)], 'step': 1},
    'fig4': {'title': 'Initialisation', 'paper': 'Figure 4', 'anchor': 'S3.F4', 'panels': [('loss', 'loss', False, 2, 10), ('gnorm', 'L2 norm of the gradient', False, 0, 10)],
             'runs': [('fig4_%s', 'old init', 'OLMo-0424 scaled init', 0), ('fig4_%s', 'new init', 'OLMo 2 init (normal, 0.02)', 1)], 'step': 1},
    'fig7': {'title': 'Reordered norm + QK-norm', 'paper': 'Figure 7', 'anchor': 'S3.F7', 'panels': [('gnorm', 'L2 norm of the gradient', True, 0.05, 7)],
             'runs': [('fig7_%s', 'pre-attention norm', 'pre-attention norm (OLMo-0424)', 0), ('fig7_%s', 'reordered norm + QK-norm', 'reordered norm + QK-norm (OLMo 2)', 1)], 'step': 10},
    'fig9': {'title': 'AdamW epsilon', 'paper': 'Figure 9', 'anchor': 'S3.F9', 'panels': [('loss', 'loss', True, 2.2, 12), ('gnorm', 'L2 norm of the gradient', True, 0.06, 10)],
             'runs': [('fig9_%s', 'eps 1e-5', 'ε = 10⁻⁵ (OLMo-0424)', 0), ('fig9_%s', 'eps 1e-8', 'ε = 10⁻⁸ (OLMo 2)', 1)], 'step': 1},
    'fig10': {'title': 'Weight decay on embeddings', 'paper': 'Figure 10', 'anchor': 'S3.F10', 'panels': [('gnorm', 'L2 norm of the gradient', True, 0.06, 4)],
              'runs': [('fig10_%s', 'weight decay on embeddings', 'decay on embeddings (OLMo-0424)', 0), ('fig10_%s', 'no weight decay on embeddings', 'no decay on embeddings (OLMo 2)', 1)], 'step': 10},
    'fig2': {'title': 'Everything together: OLMo-0424 7B against OLMo 2 7B', 'paper': 'Figure 2', 'anchor': 'S3.F2', 'panels': [('loss', 'loss', False, 2, 3), ('gnorm', 'L2 norm of the gradient', False, 0, 3)],
             'runs': [('fig2_%s', 'OLMo-0424 7B', 'OLMo-0424 7B', 0), ('fig2_%s', 'OLMo 2 7B', 'OLMo 2 7B', 1)], 'step': 1},
}
PAPER = {('fig4', 'gnorm'): [0.40, 0.03], ('fig7', 'gnorm'): [0.108, 0.069], ('fig10', 'gnorm'): [0.16, 0.092]}

page, scores = {}, {}
for fk, f in FIGS.items():
    g = {k: f[k] for k in ('title', 'paper', 'anchor')}; g['panels'] = []
    for pk, plab, plog, lo, hi in f['panels']:
        P = {'key': pk, 'label': plab, 'log': plog, 'lo': lo, 'hi': hi, 'runs': []}
        xs_all = []
        for src, name, lab, col in f['runs']:
            d = O[src % pk if '%s' in src else src][name]; xs_all += [min(d['x']), max(d['x'])]
        x0, x1 = 0.0, max(xs_all)
        for src, name, lab, col in f['runs']:
            d = O[src % pk if '%s' in src else src][name]
            x = np.asarray(d['x']); y = np.asarray(d['y'])
            b = np.clip(((x - x0) / (x1 - x0) * NB).astype(int), 0, NB - 1)
            mn = [float(y[b == i].min()) if (b == i).any() else None for i in range(NB)]
            mx = [float(y[b == i].max()) if (b == i).any() else None for i in range(NB)]
            R = {'name': lab, 'c': col, 'n': int(len(y)), 'clipped': d['clipped_vertices'], 'mn': enc(mn, lo, hi, plog), 'mx': enc(mx, lo, hi, plog)}
            key = fk + '/' + pk + '/' + name
            if pk == 'gnorm' or fk == 'fig2':
                W = 1000
                i, mu, sd = rolling(y, W)
                z = np.abs(y[i] - mu) / np.where(sd > 0, sd, np.inf)
                bi = b[i]
                R['mu'] = enc([float(mu[bi == j].mean()) if (bi == j).any() else None for j in range(NB)], lo, hi, plog)
                R['up'] = enc([float((mu + 7 * sd)[bi == j].mean()) if (bi == j).any() else None for j in range(NB)], lo, hi, plog)
                sel = z >= 4
                R['ev'] = int(len(i))
                R['z'] = [[int(round(float(x[j]))), round(float(zz), 2)] for j, zz in zip(i[sel], z[sel])]
                R['first_eval_step'] = int(round(float(x[W])))
                s = {'vertices_W1000_k7': score(y), 'paper': PAPER.get((fk, pk), [None, None])[col]}
                for WW in (250, 500, 2000):
                    s['vertices_W%d_k7' % WW] = score(y, WW)
                for kk in (5, 6, 8, 10):
                    s['vertices_W1000_k%d' % kk] = score(y, 1000, kk)
                s['resampled_every_%d_steps_W1000_k7' % f['step']] = score(resample(x, y, f['step']))
                s['log_values_W1000_k7'] = score(np.log(y))
                s['vertices'] = int(len(y)); s['clipped_vertices'] = d['clipped_vertices']
                scores[key] = s
                R['score'] = s['vertices_W1000_k7']
            P['runs'].append(R)
        P['x0'], P['x1'], P['nb'] = x0, x1, NB
        if (fk, pk) in PAPER: P['paper'] = PAPER[(fk, pk)]
        g['panels'].append(P)
    page[fk] = g

# Figure 11: the learning-rate runs and the anneals, in billions of tokens, averaged in 1B-token bins (runs) and
# 0.5B-token bins (anneals); every drawn vertex goes into a bin, so the bins are the curves with the noise averaged out.
def bins(d, w):
    x = np.asarray(d['x']); y = np.asarray(d['y']); k = np.floor(x / w).astype(int); out = []
    for j in np.unique(k):
        out.append([round(float((j + .5) * w), 2), round(float(y[k == j].mean()), 4)])
    return out
lr = {k: bins(d, 1.0) for k, d in O['fig11_lr'].items()}
an = {k: bins(d, 0.5) for k, d in O['fig11_anneal'].items()}
# end-of-anneal losses: mean of the last 2B tokens of each anneal, to compare with Table 8's ordering
ends = {}
for k, d in O['fig11_anneal'].items():
    if 'before' in k: continue
    x = np.asarray(d['x']); y = np.asarray(d['y']); ends[k] = round(float(y[x >= x.max() - 2].mean()), 4)
# where the 3e-4 run overtakes the 6e-4 run (first token count after which 3e-4 stays lower, smoothed over 5B tokens)
def smooth_at(d, grid, w=5):
    x = np.asarray(d['x']); y = np.asarray(d['y'])
    return np.array([y[(x >= g - w / 2) & (x < g + w / 2)].mean() if ((x >= g - w / 2) & (x < g + w / 2)).any() else np.nan for g in grid])
grid = np.arange(40, 301, 1.0)
cross = {}
for a, b in (('3e-4', '6e-4'), ('3e-4', '9e-4'), ('3e-4', '12e-4'), ('6e-4', '9e-4'), ('6e-4', '12e-4'), ('9e-4', '12e-4')):
    ya, yb = smooth_at(O['fig11_lr'][a], grid), smooth_at(O['fig11_lr'][b], grid)
    lower = ya < yb
    last_bad = max([g for g, l in zip(grid, lower) if not l] or [grid[0]])
    cross[a + ' below ' + b] = float(last_bad)
# Figure 8 (z-loss): envelopes over steps 440k to 520k; Figure 10 right (embedding norm): every drawn point
z8 = {'x0': 440000.0, 'x1': 520000.0, 'nb': 240, 'lo': 1e-4, 'hi': 1e-2, 'log': True, 'runs': []}
for name, col in (('with fused z-loss', 1), ('without fused z-loss', 0)):
    d = O['fig8_zloss'][name]; x = np.asarray(d['x']); y = np.asarray(d['y'])
    b = np.clip(((x - z8['x0']) / (z8['x1'] - z8['x0']) * 240).astype(int), 0, 239)
    z8['runs'].append({'name': name, 'c': col, 'mn': enc([float(y[b == i].min()) if (b == i).any() else None for i in range(240)], 1e-4, 1e-2, True),
                       'mx': enc([float(y[b == i].max()) if (b == i).any() else None for i in range(240)], 1e-4, 1e-2, True)})
dz = O['fig8_zloss']['without fused z-loss']; xz = np.asarray(dz['x']); yz = np.asarray(dz['y']); base = float(np.median(O['fig8_zloss']['with fused z-loss']['y']))
z8['fork_start'] = round(float(xz.min())); z8['jump_step'] = round(float(xz[np.argmax(yz > 10 * base)])); z8['base'] = base; z8['after'] = float(np.median(yz[xz > xz.min() + 5000]))
page['fig8'] = z8
page['embnorm'] = {k: [[round(a), round(b, 1)] for a, b in zip(d['x'], d['y'])] for k, d in O['fig10_embnorm'].items()}
fig5 = O['fig5']
page['lr'] = {'runs': lr, 'anneal': an, 'ends': ends, 'cross': cross}
page['fig5'] = [p for p in fig5 if p['color'] != [0.8, 0.8, 0.8]]

# Figure 7: median gradient norm per 20k steps (does the combined change also stop the slow growth?)
med7 = {k: [round(float(np.median(np.asarray(d['y'])[(np.asarray(d['x']) >= a) & (np.asarray(d['x']) < a + 20000)])), 4) for a in range(0, 160000, 20000)] for k, d in O['fig7_gnorm'].items()}
page['fig7_medians'] = med7
open(os.path.join(HERE, 'parts', '_gen_curves.js'), 'w').write('// Generated by mk_curves.py from the vector figures of arXiv 2501.00656v3 (see extract_figs.py).\nwindow.CURVES=' + json.dumps(page, separators=(',', ':'), ensure_ascii=False) + ';\n')
json.dump({'_doc': __doc__.split('Spike score')[1].strip(), 'scores': scores, 'lr_ends_last2B': ends, 'lr_crossover_Btokens': cross, 'fig7_median_per_20k_steps': med7},
          open(os.path.join(HERE, 'inputs', 'spike_scores.json'), 'w'), indent=1, ensure_ascii=False)
print('curves js bytes', os.path.getsize(os.path.join(HERE, 'parts', '_gen_curves.js')))
for k, s in scores.items():
    print('%-48s paper %-6s ours %.3f%% (%d/%d) | resampled %s | W250 %.3f W500 %.3f W2000 %.3f' % (k, s['paper'], s['vertices_W1000_k7']['pct'], s['vertices_W1000_k7']['spikes'], s['vertices_W1000_k7']['evaluated'],
          [v['pct'] for kk, v in s.items() if kk.startswith('resampled')][0], s['vertices_W250_k7']['pct'], s['vertices_W500_k7']['pct'], s['vertices_W2000_k7']['pct']))
print('anneal ends', ends); print('crossovers', cross)
